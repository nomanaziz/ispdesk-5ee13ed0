// Cron-driven: forwards unsent system_logs to configured remote endpoints.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SEVERITY_RANK: Record<string, number> = { info: 0, warning: 1, error: 2, critical: 3 };

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: forwarders } = await supabase
    .from("system_log_forwarders")
    .select("*")
    .eq("enabled", true);

  const summary: any[] = [];

  for (const fw of forwarders ?? []) {
    const minRank = SEVERITY_RANK[fw.min_severity ?? "info"] ?? 0;
    const allowedSeverities = Object.entries(SEVERITY_RANK)
      .filter(([_, r]) => r >= minRank).map(([k]) => k);

    let q = supabase.from("system_logs")
      .select("*")
      .eq("forwarded", false)
      .in("severity", allowedSeverities)
      .order("created_at", { ascending: true })
      .limit(500);

    const filter = fw.event_filter ?? {};
    if (Array.isArray(filter.actions) && filter.actions.length > 0) q = q.in("action", filter.actions);
    if (Array.isArray(filter.entity_types) && filter.entity_types.length > 0) q = q.in("entity_type", filter.entity_types);

    const { data: rows, error } = await q;
    if (error || !rows || rows.length === 0) {
      summary.push({ forwarder: fw.name, sent: 0 });
      continue;
    }

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (fw.auth_header) headers["Authorization"] = fw.auth_header;
      const res = await fetch(fw.url, { method: "POST", headers, body: JSON.stringify({ events: rows }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      await supabase.from("system_logs")
        .update({ forwarded: true, forwarded_at: new Date().toISOString() })
        .in("id", rows.map(r => r.id));

      await supabase.from("system_log_forwarders")
        .update({ last_sent_at: new Date().toISOString(), last_error: null, failure_count: 0 })
        .eq("id", fw.id);

      summary.push({ forwarder: fw.name, sent: rows.length });
    } catch (e) {
      await supabase.from("system_log_forwarders")
        .update({ last_error: (e as Error).message, failure_count: (fw.failure_count ?? 0) + 1 })
        .eq("id", fw.id);
      summary.push({ forwarder: fw.name, error: (e as Error).message });
    }
  }

  return new Response(JSON.stringify({ summary }), { headers: { "Content-Type": "application/json" } });
});
