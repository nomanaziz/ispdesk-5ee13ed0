import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { BarChart3, TrendingUp, Users, Wallet, AlertCircle, UserMinus } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";

interface MonthRow { month: string; billed: number; collected: number; due: number; }
interface KPI { label: string; value: string; sub?: string; icon: any; color: string; }

const fmt = (n: number) => new Intl.NumberFormat("en-BD").format(Math.round(n));
const monthsBack = (n: number) => {
  const out: string[] = [];
  const d = new Date(); d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d); x.setMonth(d.getMonth() - i);
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-01`);
  }
  return out;
};

const STATUS_COLORS: Record<string, string> = {
  active: "hsl(var(--primary))",
  inactive: "hsl(var(--muted-foreground))",
  expired: "hsl(var(--destructive))",
  suspended: "hsl(var(--destructive))",
  left: "hsl(var(--muted))",
};

export default function ExecutiveAnalytics() {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [monthly, setMonthly] = useState<MonthRow[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [ticketTrend, setTicketTrend] = useState<{ month: string; opened: number; closed: number }[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      setLoading(true);
      const months = monthsBack(6);
      const sixMonthsAgo = months[0];

      // Bills (revenue trend)
      const { data: bills } = await supabase
        .from("billing")
        .select("month, amount, paid, due, status")
        
        .gte("month", sixMonthsAgo);

      const map: Record<string, MonthRow> = {};
      months.forEach(m => { map[m] = { month: m.slice(0, 7), billed: 0, collected: 0, due: 0 }; });
      (bills || []).forEach((b: any) => {
        const k = String(b.month);
        if (map[k]) {
          map[k].billed += Number(b.amount || 0);
          map[k].collected += Number(b.paid || 0);
          map[k].due += Number(b.due || 0);
        }
      });
      const monthlyRows = Object.values(map);
      setMonthly(monthlyRows);

      // Clients status
      const { data: clients } = await supabase
        .from("clients")
        .select("status, monthly_bill")
        ;

      const sBreak: Record<string, number> = {};
      let activeCount = 0, totalMRR = 0, leftCount = 0;
      (clients || []).forEach((c: any) => {
        const s = (c.status || "unknown").toLowerCase();
        sBreak[s] = (sBreak[s] || 0) + 1;
        if (s === "active") { activeCount++; totalMRR += Number(c.monthly_bill || 0); }
        if (s === "left") leftCount++;
      });
      setStatusBreakdown(
        Object.entries(sBreak).map(([name, value]) => ({ name, value }))
      );

      // Support tickets trend
      const { data: tix } = await supabase
        .from("support_tickets")
        .select("created_at, closed_at, status")
        
        .gte("created_at", sixMonthsAgo);

      const tMap: Record<string, { opened: number; closed: number }> = {};
      months.forEach(m => { tMap[m.slice(0, 7)] = { opened: 0, closed: 0 }; });
      let openTickets = 0;
      (tix || []).forEach((t: any) => {
        const k = String(t.created_at).slice(0, 7);
        if (tMap[k]) tMap[k].opened++;
        if (t.closed_at) {
          const k2 = String(t.closed_at).slice(0, 7);
          if (tMap[k2]) tMap[k2].closed++;
        } else openTickets++;
      });
      setTicketTrend(Object.entries(tMap).map(([month, v]) => ({ month, ...v })));

      // KPIs
      const last = monthlyRows[monthlyRows.length - 1] || { billed: 0, collected: 0, due: 0 };
      const prev = monthlyRows[monthlyRows.length - 2] || { billed: 0, collected: 0, due: 0 };
      const collectionRate = last.billed > 0 ? (last.collected / last.billed) * 100 : 0;
      const revGrowth = prev.collected > 0 ? ((last.collected - prev.collected) / prev.collected) * 100 : 0;
      const arpu = activeCount > 0 ? totalMRR / activeCount : 0;
      const churn = activeCount + leftCount > 0 ? (leftCount / (activeCount + leftCount)) * 100 : 0;

      setKpis([
        { label: "এই মাসে আদায়", value: `৳${fmt(last.collected)}`, sub: `গত মাসের চেয়ে ${revGrowth >= 0 ? "+" : ""}${revGrowth.toFixed(1)}%`, icon: Wallet, color: "text-green-500" },
        { label: "আদায়ের হার", value: `${collectionRate.toFixed(1)}%`, sub: `বিল ৳${fmt(last.billed)}`, icon: TrendingUp, color: "text-blue-500" },
        { label: "সক্রিয় ক্লায়েন্ট", value: fmt(activeCount), sub: `MRR ৳${fmt(totalMRR)}`, icon: Users, color: "text-primary" },
        { label: "ARPU", value: `৳${fmt(arpu)}`, sub: "প্রতি ক্লায়েন্ট গড় আয়", icon: BarChart3, color: "text-purple-500" },
        { label: "বকেয়া", value: `৳${fmt(last.due)}`, sub: "চলতি মাস", icon: AlertCircle, color: "text-orange-500" },
        { label: "চার্ন", value: `${churn.toFixed(2)}%`, sub: `${leftCount} জন চলে গেছেন · ${openTickets} ওপেন টিকেট`, icon: UserMinus, color: "text-red-500" },
      ]);

      setLoading(false);
    })();
  }, [tenantId]);

  const pieData = useMemo(() => statusBreakdown.filter(s => s.value > 0), [statusBreakdown]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><BarChart3 className="h-6 w-6 text-primary" /></div>
        <div>
          <h1 className="text-xl font-bold">এক্সিকিউটিভ অ্যানালিটিক্স</h1>
          <p className="text-xs text-muted-foreground">ব্যবসার সব মেট্রিক একনজরে · গত ৬ মাস</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{k.label}</span>
                <k.icon className={`h-4 w-4 ${k.color}`} />
              </div>
              <div className="text-lg font-bold">{loading ? "…" : k.value}</div>
              {k.sub && <div className="text-[10px] text-muted-foreground mt-1">{k.sub}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">মাসিক বিল ও আদায়</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="billed" fill="hsl(var(--muted-foreground))" name="বিল" />
                <Bar dataKey="collected" fill="hsl(var(--primary))" name="আদায়" />
                <Bar dataKey="due" fill="hsl(var(--destructive))" name="বকেয়া" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">ক্লায়েন্ট স্ট্যাটাস</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label={(e: any) => `${e.name}: ${e.value}`}>
                  {pieData.map((s) => (
                    <Cell key={s.name} fill={STATUS_COLORS[s.name] || "hsl(var(--accent))"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">সাপোর্ট টিকেট ট্রেন্ড</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ticketTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="opened" stroke="hsl(var(--destructive))" name="খোলা" strokeWidth={2} />
                <Line type="monotone" dataKey="closed" stroke="hsl(var(--primary))" name="বন্ধ" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
