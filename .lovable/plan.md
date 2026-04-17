

## Live Traffic Monitoring — Real-time Graph Fix

### বর্তমান অবস্থা
- `PortalLiveUsage.tsx` শুধু `total_upload`/`total_download` cumulative দেখায়, কোনো real-time graph নেই
- "Real-time graph coming soon" placeholder বসানো আছে
- `clients` table এ `total_upload`/`total_download` cumulative bytes আছে, কিন্তু **per-second speed** track হচ্ছে না
- `collect-client-traffic` edge function exist করে কিন্তু সম্ভবত শুধু cumulative update করে

### লক্ষ্য (image-অনুসরণে)
1. **Connectivity Info card**: Client Name, Client Code, Username, Mobile, Uptime, Downloaded Data, Uploaded Data
2. **Live Traffic Real-Time Graph**: Download Speed (Kbps) ও Upload Speed (Kbps), প্রতি 2-3 second update, last ~60 points scrolling
3. একই page admin-side এও থাকবে (Online Client Monitoring → individual client view)

### Approach

**Speed calculation strategy**: MikroTik থেকে real-time speed pull করা সবচেয়ে সঠিক, কিন্তু সেটা delay করে। আপাতত **client-side delta calculation** ব্যবহার করব:
- প্রতি 3 second এ DB থেকে cumulative `total_upload`/`total_download` fetch
- পূর্বের sample-এর সাথে diff করে → bytes/sec → Kbps
- Recharts দিয়ে scrolling line graph, last 20 points

পরে Phase 2-এ proper `client_traffic_samples` table + edge function polling MikroTik queue stats।

### Files

| File | Action |
|------|--------|
| `src/pages/portal/PortalLiveUsage.tsx` | Full rebuild — Connectivity Info card + Recharts real-time graph + 3s polling |
| `src/pages/dashboard/monitoring/OnlineClientMonitoring.tsx` | Check & add "View Live" action linking to detail page (if missing) |
| `src/pages/dashboard/monitoring/ClientTrafficView.tsx` | নতুন — admin-side same component, accepts `:clientId` param |
| `src/App.tsx` | Add route `/dashboard/monitoring/client-traffic/:id` |

### Component design

```text
[← Back to List]

┌─ Connectivity Information ──────────────────────────┐
│ Client Name | Client Code | Username | Mobile      │
│ Uptime      | Downloaded  | Uploaded                │
└─────────────────────────────────────────────────────┘

┌─ Live Traffic Monitoring (RealTime Graph) ──────────┐
│  ▬ Download Speed (Kbps)   ▬ Upload Speed (Kbps)   │
│                                                     │
│  [Recharts LineChart, animated, 20 rolling points] │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Technical detail

```typescript
// Inside component
const [samples, setSamples] = useState<{time:string; down:number; up:number}[]>([]);
const lastRef = useRef<{up:number; down:number; t:number} | null>(null);

useEffect(() => {
  const tick = async () => {
    const { data } = await supabase.from('clients')
      .select('total_upload,total_download').eq('id', id).maybeSingle();
    if (!data) return;
    const now = Date.now();
    const up = Number(data.total_upload || 0);
    const down = Number(data.total_download || 0);
    if (lastRef.current) {
      const dt = (now - lastRef.current.t) / 1000;
      const upKbps = Math.max(0, ((up - lastRef.current.up) * 8) / 1000 / dt);
      const downKbps = Math.max(0, ((down - lastRef.current.down) * 8) / 1000 / dt);
      setSamples(s => [...s.slice(-19), {
        time: new Date().toLocaleTimeString(),
        down: Math.round(downKbps),
        up: Math.round(upKbps)
      }]);
    }
    lastRef.current = { up, down, t: now };
  };
  tick();
  const id = setInterval(tick, 3000);
  return () => clearInterval(id);
}, [clientId]);
```

### Note about data freshness

Graph তখনই up/down দেখাবে যখন `clients.total_upload/total_download` value DB-তে পরিবর্তন হয় (MikroTik sync edge function থেকে)। যদি sync function না চলে, line flat থাকবে।

**Phase 2 (পরে):** Supabase realtime subscription on `clients` row (instead of polling) + dedicated `client_traffic_samples` time-series table + cron-driven MikroTik polling।

