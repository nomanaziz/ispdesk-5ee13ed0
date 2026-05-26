// ISPDesk Polling Agent
// Polls assigned OLTs via SNMP (UDP 161) and pushes data to Supabase.
// Requirements: Node.js 18+, `npm install net-snmp node-fetch@2`
//
// Usage:
//   1. Copy config.example.json → config.json, fill in supabase_url + api_key
//   2. node polling-agent.js
//
// Run as a service: use PM2 (`pm2 start polling-agent.js --name ispdesk-agent`)
// or NSSM on Windows.

const snmp = require('net-snmp');
const fs = require('fs');
const path = require('path');

// When packaged with pkg, __dirname points inside the snapshot. Use exe dir instead.
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
const INGEST_URL = `${cfg.supabase_url}/functions/v1/ingest-snmp-data`;
const VERSION = '1.0.0';

const fetchFn = global.fetch || require('node-fetch');

// Vendor-specific OIDs
const OIDS = {
  sysName:   '1.3.6.1.2.1.1.5.0',
  sysDescr:  '1.3.6.1.2.1.1.1.0',
  sysUpTime: '1.3.6.1.2.1.1.3.0',
};

// BDCOM EPON OIDs (1.3.6.1.4.1.3320.101.10.*)
const BDCOM_EPON = {
  onuStatus:   '1.3.6.1.4.1.3320.101.10.1.1.26',
  onuMac:      '1.3.6.1.4.1.3320.101.10.1.1.3',
  onuRxPower:  '1.3.6.1.4.1.3320.101.108.1.1.4',
  onuDistance: '1.3.6.1.4.1.3320.101.10.1.1.27',
};
// BDCOM GPON OIDs
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
  if (v.includes('bdcom') && p === 'gpon') return BDCOM_GPON;
  // TODO: Vsol, DBC, Huawei, ZTE
  return BDCOM_GPON;
}

function snmpGet(session, oids) {
  return new Promise((resolve) => {
    session.get(oids, (err, varbinds) => {
      if (err) return resolve(null);
      const out = {};
      varbinds.forEach((vb, i) => {
        if (!snmp.isVarbindError(vb)) {
          out[oids[i]] = vb.value && Buffer.isBuffer(vb.value) ? vb.value.toString() : vb.value;
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
        results.push({ oid: vb.oid, value: vb.value && Buffer.isBuffer(vb.value) ? vb.value.toString('hex') : vb.value });
      }
    }, (err) => resolve(err ? [] : results));
  });
}

async function pollOlt(olt) {
  const ip = olt.snmp_ip || olt.ip_address;
  if (!ip) return { olt_id: olt.id, reachable: false, olt_meta: { error: 'no IP configured' }, onus: [] };

  const community = olt.snmp_community || 'public';
  const port = olt.snmp_port || 161;
  const version = olt.snmp_version === 'v1' ? snmp.Version1 : snmp.Version2c;

  const session = snmp.createSession(ip, community, { port, version, timeout: 4000, retries: 1 });

  try {
    const scalar = await snmpGet(session, [OIDS.sysName, OIDS.sysDescr, OIDS.sysUpTime]);
    if (!scalar) {
      return { olt_id: olt.id, reachable: false, olt_meta: { error: 'SNMP timeout' }, onus: [] };
    }
    const oids = getVendorOids(olt.vendor, olt.pon_type);
    const statusVbs = await snmpWalk(session, oids.onuStatus);
    const rxVbs     = await snmpWalk(session, oids.onuRxPower);

    // Build ONU map keyed by index (last OID part)
    const onuMap = new Map();
    statusVbs.forEach((v) => {
      const idx = v.oid.split('.').pop();
      const cur = onuMap.get(idx) || { mac: `idx-${idx}` };
      cur.status = (v.value === 1 || v.value === '1' || String(v.value).toLowerCase().includes('up')) ? 'online' : 'offline';
      cur.interface = `pon-${idx}`;
      onuMap.set(idx, cur);
    });
    rxVbs.forEach((v) => {
      const idx = v.oid.split('.').pop();
      const cur = onuMap.get(idx) || { mac: `idx-${idx}` };
      // RX power often in 0.1 dBm units
      const raw = Number(v.value);
      if (!isNaN(raw)) cur.rx_power = raw / 10;
      onuMap.set(idx, cur);
    });

    const onus = Array.from(onuMap.values());
    const online = onus.filter((o) => o.status === 'online').length;

    return {
      olt_id: olt.id,
      reachable: true,
      olt_meta: {
        name: scalar[OIDS.sysName],
        brand_model: scalar[OIDS.sysDescr]?.toString().slice(0, 100),
        uptime: scalar[OIDS.sysUpTime],
        total_onus: onus.length,
        online_onus: online,
      },
      onus,
    };
  } finally {
    try { session.close(); } catch {}
  }
}

async function tick() {
  let hb;
  try {
    const r = await fetchFn(HEARTBEAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-agent-key': cfg.api_key },
      body: JSON.stringify({ version: VERSION }),
    });
    hb = await r.json();
    if (!hb.ok) {
      console.error('[heartbeat] failed:', hb);
      return;
    }
  } catch (e) {
    console.error('[heartbeat] error:', e.message);
    return;
  }

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
      console.log(`  → ${olt.name} (${olt.vendor}/${olt.pon_type}): reachable=${result.reachable} onus=${result.onus.length} ingest=${JSON.stringify(j)}`);
    } catch (e) {
      console.error(`  → ${olt.name} error:`, e.message);
    }
  }
}

const interval = (cfg.poll_interval_seconds || 30) * 1000;
console.log(`ISPDesk Agent v${VERSION} starting — polling every ${interval / 1000}s`);
console.log(`Supabase: ${cfg.supabase_url}`);
tick();
setInterval(tick, interval);
