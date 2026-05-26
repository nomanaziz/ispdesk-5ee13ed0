// ISPDesk Polling Agent v1.1
// Walks SNMP locally (UDP 161) for assigned OLTs and POSTs system info,
// ONU list, and interface table to Supabase.
//
// Install (Naeem-PC):
//   cd agent && npm install
//   cp config.example.json config.json   (edit api_key)
//   node polling-agent.js
// Or run as service: pm2 start polling-agent.js --name ispdesk-agent

const snmp = require('net-snmp');
const fs = require('fs');
const path = require('path');

const BASE_DIR = process.pkg ? path.dirname(process.execPath) : __dirname;
const CFG_PATH = process.env.AGENT_CONFIG || path.join(BASE_DIR, 'config.json');
if (!fs.existsSync(CFG_PATH)) {
  console.error(`[FATAL] Config file not found: ${CFG_PATH}`);
  console.error('Copy config.example.json → config.json and fill in your details.');
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(CFG_PATH, 'utf8'));
if (!cfg.supabase_url || !cfg.api_key) {
  console.error('[FATAL] config.json must have supabase_url and api_key');
  process.exit(1);
}

const HEARTBEAT_URL = `${cfg.supabase_url}/functions/v1/agent-heartbeat`;
const INGEST_URL    = `${cfg.supabase_url}/functions/v1/ingest-snmp-data`;
const VERSION = '1.1.0';
const fetchFn = global.fetch || require('node-fetch');

// ---------- Standard OIDs ----------
const OID = {
  sysName:   '1.3.6.1.2.1.1.5.0',
  sysDescr:  '1.3.6.1.2.1.1.1.0',
  sysUpTime: '1.3.6.1.2.1.1.3.0',
  ifDescr:       '1.3.6.1.2.1.2.2.1.2',
  ifType:        '1.3.6.1.2.1.2.2.1.3',
  ifSpeed:       '1.3.6.1.2.1.2.2.1.5',
  ifPhysAddr:    '1.3.6.1.2.1.2.2.1.6',
  ifAdminStatus: '1.3.6.1.2.1.2.2.1.7',
  ifOperStatus:  '1.3.6.1.2.1.2.2.1.8',
  entSerial: '1.3.6.1.2.1.47.1.1.1.1.11',
  entHwRev:  '1.3.6.1.2.1.47.1.1.1.1.8',
  entFwRev:  '1.3.6.1.2.1.47.1.1.1.1.9',
};

// BDCOM vendor OIDs
const BDCOM_EPON = {
  onuStatus:   '1.3.6.1.4.1.3320.101.10.1.1.26',
  onuMac:      '1.3.6.1.4.1.3320.101.10.1.1.3',
  onuRxPower:  '1.3.6.1.4.1.3320.101.108.1.1.4',
  onuDistance: '1.3.6.1.4.1.3320.101.10.1.1.27',
};
const BDCOM_GPON = {
  onuStatus:   '1.3.6.1.4.1.3320.101.11.1.1.6',
  onuSerial:   '1.3.6.1.4.1.3320.101.11.1.1.2',
  onuRxPower:  '1.3.6.1.4.1.3320.101.108.1.1.4',
  onuDistance: '1.3.6.1.4.1.3320.101.11.1.1.18',
};
function getVendorOids(vendor, ponType) {
  const v = (vendor || '').toLowerCase();
  const p = (ponType || '').toLowerCase();
  if (v.includes('bdcom') && p === 'epon') return BDCOM_EPON;
  return BDCOM_GPON;
}

// ---------- SNMP helpers ----------
function snmpGet(session, oids) {
  return new Promise((resolve) => {
    session.get(oids, (err, vbs) => {
      if (err) return resolve({});
      const out = {};
      vbs.forEach((vb, i) => {
        if (!snmp.isVarbindError(vb)) {
          out[oids[i]] = Buffer.isBuffer(vb.value) ? vb.value.toString() : vb.value;
        }
      });
      resolve(out);
    });
  });
}

function snmpWalk(session, oid) {
  return new Promise((resolve) => {
    const results = [];
    session.subtree(oid, 20, (vb) => {
      if (!snmp.isVarbindError(vb)) {
        results.push({
          oid: vb.oid,
          value: Buffer.isBuffer(vb.value) ? vb.value : vb.value,
          buffer: Buffer.isBuffer(vb.value) ? vb.value : null,
        });
      }
    }, (err) => resolve(err ? [] : results));
  });
}

// ---------- Parsers ----------
function parseBrand(desc) {
  if (!desc) return {};
  const fw = (desc.match(/Version\s+([A-Za-z0-9._\-]+)/i) || [])[1];
  const hw = (desc.match(/hardware\s*version[:\s]+([A-Za-z0-9._\-]+)/i) || [])[1];
  const model = desc.replace(/\s*Software,?\s*Version\s+[A-Za-z0-9._\-]+/i, '')
                    .replace(/\s*hardware\s*version[:\s]+[A-Za-z0-9._\-]+/i, '')
                    .replace(/\s+/g, ' ').trim();
  return { brand_model: (model || desc).slice(0, 200), firmware_version: fw || null, hardware_version: hw || null };
}

function bufferToMac(buf) {
  if (!buf || !Buffer.isBuffer(buf) || buf.length !== 6) return null;
  const hex = [...buf].map(b => b.toString(16).padStart(2, '0')).join(':').toUpperCase();
  return hex === '00:00:00:00:00:00' ? null : hex;
}

function lastIndex(oid, base) {
  return oid.startsWith(base + '.') ? oid.slice(base.length + 1) : oid;
}

const IF_STATUS = { 1: 'up', 2: 'down', 3: 'testing', 4: 'unknown', 5: 'dormant', 6: 'not-present', 7: 'lower-layer-down' };

// Classify into: pon | ether-sfp | ether-rj45  (skip everything else)
function classify(name, ifType, speedBps) {
  const n = (name || '').toLowerCase();
  if (/epon|gpon|pon\d|xpon/.test(n)) return 'pon';
  if (/loop|null|mgmt|vlan|tunnel|aggreg/.test(n)) return null;
  const mbps = (speedBps || 0) / 1_000_000;
  if (ifType === 117 || mbps >= 1000) return 'ether-sfp';
  if (ifType === 6) return 'ether-rj45';
  return null;
}

// ---------- Per-OLT poll ----------
async function pollOlt(olt) {
  const ip = olt.snmp_ip || olt.ip_address;
  if (!ip) return { olt_id: olt.id, reachable: false, olt_meta: { error: 'no IP configured' }, onus: [], pon_ports: [] };

  const community = olt.snmp_community || 'public';
  const port = olt.snmp_port || 161;
  const version = olt.snmp_version === 'v1' ? snmp.Version1 : snmp.Version2c;
  const session = snmp.createSession(ip, community, { port, version, timeout: 4000, retries: 1 });

  try {
    // System scalars
    const scalar = await snmpGet(session, [OID.sysName, OID.sysDescr, OID.sysUpTime]);
    if (!scalar || Object.keys(scalar).length === 0) {
      return { olt_id: olt.id, reachable: false, olt_meta: { error: 'SNMP timeout' }, onus: [], pon_ports: [] };
    }
    const brand = parseBrand(scalar[OID.sysDescr]);

    // Walks (system inventory + interfaces)
    const [macVbs, serialVbs, hwVbs, fwVbs, ifDescr, ifType, ifSpeed, ifAdmin, ifOper] = await Promise.all([
      snmpWalk(session, OID.ifPhysAddr),
      snmpWalk(session, OID.entSerial),
      snmpWalk(session, OID.entHwRev),
      snmpWalk(session, OID.entFwRev),
      snmpWalk(session, OID.ifDescr),
      snmpWalk(session, OID.ifType),
      snmpWalk(session, OID.ifSpeed),
      snmpWalk(session, OID.ifAdminStatus),
      snmpWalk(session, OID.ifOperStatus),
    ]);

    // MAC: first non-zero
    let mac = null;
    for (const v of macVbs) {
      const m = bufferToMac(v.buffer);
      if (m) { mac = m; break; }
    }
    // Serial / hw rev / fw rev: first non-empty
    const firstNonEmpty = (arr) => {
      for (const v of arr) {
        const s = (Buffer.isBuffer(v.value) ? v.value.toString() : String(v.value || '')).trim();
        if (s && s !== '0') return s;
      }
      return null;
    };
    const serial = firstNonEmpty(serialVbs);
    const hwFromEnt = firstNonEmpty(hwVbs);
    const fwFromEnt = firstNonEmpty(fwVbs);

    // Build interfaces
    const byIdx = new Map();
    for (const v of ifDescr) byIdx.set(lastIndex(v.oid, OID.ifDescr), { name: Buffer.isBuffer(v.value) ? v.value.toString() : String(v.value) });
    for (const v of ifType)  { const i = lastIndex(v.oid, OID.ifType);  const r = byIdx.get(i) || {}; r.ifType = Number(v.value);  byIdx.set(i, r); }
    for (const v of ifSpeed) { const i = lastIndex(v.oid, OID.ifSpeed); const r = byIdx.get(i) || {}; r.speed  = Number(v.value);   byIdx.set(i, r); }
    for (const v of ifAdmin) { const i = lastIndex(v.oid, OID.ifAdminStatus); const r = byIdx.get(i) || {}; r.admin = IF_STATUS[Number(v.value)] || 'unknown'; byIdx.set(i, r); }
    for (const v of ifOper)  { const i = lastIndex(v.oid, OID.ifOperStatus);  const r = byIdx.get(i) || {}; r.oper  = IF_STATUS[Number(v.value)] || 'unknown'; byIdx.set(i, r); }

    const pon_ports = [];
    for (const r of byIdx.values()) {
      if (!r.name) continue;
      const cat = classify(r.name, r.ifType || 0, r.speed || 0);
      if (!cat) continue;
      pon_ports.push({
        port_name: r.name,
        port_type: cat,
        admin_status: r.admin || null,
        oper_status: r.oper || null,
        speed_mbps: r.speed ? Math.round(r.speed / 1_000_000) : null,
      });
    }

    // ONU walk (vendor-specific, light)
    const oids = getVendorOids(olt.vendor, olt.pon_type);
    const [statusVbs, rxVbs] = await Promise.all([snmpWalk(session, oids.onuStatus), snmpWalk(session, oids.onuRxPower)]);
    const onuMap = new Map();
    statusVbs.forEach((v) => {
      const idx = v.oid.split('.').pop();
      const cur = onuMap.get(idx) || { mac: `idx-${idx}` };
      cur.status = (v.value === 1 || String(v.value).toLowerCase().includes('up')) ? 'online' : 'offline';
      cur.interface = `pon-${idx}`;
      onuMap.set(idx, cur);
    });
    rxVbs.forEach((v) => {
      const idx = v.oid.split('.').pop();
      const cur = onuMap.get(idx) || { mac: `idx-${idx}` };
      const raw = Number(v.value);
      if (!isNaN(raw)) cur.rx_power = raw / 10;
      onuMap.set(idx, cur);
    });
    const onus = Array.from(onuMap.values());

    return {
      olt_id: olt.id,
      reachable: true,
      olt_meta: {
        name: scalar[OID.sysName],
        uptime: scalar[OID.sysUpTime],   // raw TimeTicks — server formats
        brand_model: brand.brand_model,
        firmware_version: fwFromEnt || brand.firmware_version,
        hardware_version: hwFromEnt || brand.hardware_version,
        serial_number: serial,
        mac_address: mac,
        total_onus: onus.length,
        online_onus: onus.filter((o) => o.status === 'online').length,
      },
      onus,
      pon_ports,
    };
  } finally {
    try { session.close(); } catch {}
  }
}

// ---------- Main loop ----------
async function tick() {
  let hb;
  try {
    const r = await fetchFn(HEARTBEAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-agent-key': cfg.api_key },
      body: JSON.stringify({ version: VERSION }),
    });
    hb = await r.json();
    if (!hb.ok) { console.error('[heartbeat] failed:', hb); return; }
  } catch (e) { console.error('[heartbeat] error:', e.message); return; }

  console.log(`[${new Date().toISOString()}] heartbeat ok — ${hb.olts.length} OLT(s) assigned`);

  for (const olt of hb.olts) {
    try {
      const result = await pollOlt(olt);
      const ingest = await fetchFn(INGEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-agent-key': cfg.api_key },
        body: JSON.stringify(result),
      });
      const j = await ingest.json();
      console.log(`  → ${olt.name} (${olt.vendor}/${olt.pon_type}): reach=${result.reachable} ports=${result.pon_ports.length} onus=${result.onus.length} → ${JSON.stringify(j)}`);
    } catch (e) {
      console.error(`  → ${olt.name} error:`, e.message);
    }
  }
}

const interval = (cfg.poll_interval_seconds || 60) * 1000;
console.log(`ISPDesk Agent v${VERSION} starting — polling every ${interval / 1000}s`);
console.log(`Supabase: ${cfg.supabase_url}`);
tick();
setInterval(tick, interval);
