// Import Bangladesh government holidays for a given year.
// Tries date.nager.at first, falls back to a bundled seed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Holiday = { date: string; title_bn: string; title_en: string; category: string };

const FALLBACK: Record<number, Holiday[]> = {
  2026: [
    { date: "2026-02-21", title_bn: "শহীদ দিবস ও আন্তর্জাতিক মাতৃভাষা দিবস", title_en: "Language Martyrs' Day", category: "public" },
    { date: "2026-03-17", title_bn: "জাতির পিতার জন্মদিন ও শিশু দিবস", title_en: "Sheikh Mujibur Rahman's Birthday", category: "public" },
    { date: "2026-03-26", title_bn: "স্বাধীনতা দিবস", title_en: "Independence Day", category: "public" },
    { date: "2026-05-01", title_bn: "মে দিবস", title_en: "May Day", category: "public" },
    { date: "2026-08-15", title_bn: "জাতীয় শোক দিবস", title_en: "National Mourning Day", category: "public" },
    { date: "2026-12-16", title_bn: "বিজয় দিবস", title_en: "Victory Day", category: "public" },
    { date: "2026-12-25", title_bn: "বড়দিন", title_en: "Christmas Day", category: "religious" },
  ],
};

async function fetchFromNager(year: number): Promise<Holiday[]> {
  const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/BD`);
  if (!res.ok) throw new Error(`nager ${res.status}`);
  const data = await res.json() as Array<{ date: string; localName: string; name: string; types?: string[] }>;
  return data.map((d) => ({
    date: d.date,
    title_bn: d.localName || d.name,
    title_en: d.name,
    category: (d.types?.[0] || "Public").toLowerCase().includes("optional") ? "optional" : "public",
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { year } = await req.json();
    const yr = Number(year) || new Date().getFullYear();

    let holidays: Holiday[];
    let source = "nager";
    try {
      holidays = await fetchFromNager(yr);
      if (!holidays.length) throw new Error("empty");
    } catch (_e) {
      holidays = FALLBACK[yr] || FALLBACK[2026];
      source = "fallback";
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Upsert into bd_government_holidays
    const bdRows = holidays.map((h) => ({ year: yr, date: h.date, title_bn: h.title_bn, title_en: h.title_en, category: h.category, source }));
    await supabase.from("bd_government_holidays").upsert(bdRows, { onConflict: "year,date,title_en" });

    // Mirror into events_holidays (idempotent via external_id)
    const evRows = holidays.map((h) => ({
      title: h.title_bn,
      description: h.title_en,
      event_date: h.date,
      end_date: null,
      type: "holiday",
      status: "active",
      source: "bd_govt",
      external_id: `${yr}-${h.date}-${h.title_en.replace(/\s+/g, "_")}`,
    }));
    for (const r of evRows) {
      const { data: exists } = await supabase
        .from("events_holidays").select("id").eq("external_id", r.external_id).maybeSingle();
      if (exists) {
        await supabase.from("events_holidays").update(r).eq("id", exists.id);
      } else {
        await supabase.from("events_holidays").insert(r);
      }
    }

    return new Response(JSON.stringify({ ok: true, year: yr, count: holidays.length, source }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error).message) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
