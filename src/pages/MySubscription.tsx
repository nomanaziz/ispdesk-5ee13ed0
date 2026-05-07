import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMySubscription } from "@/hooks/useMySubscription";
import { CalendarClock, CreditCard, Users, Wallet, AlertTriangle, CheckCircle2 } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";

export default function MySubscription() {
  const { data, isLoading } = useMySubscription();

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (!data?.customer) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>আমার সাবস্ক্রিপশন</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            আপনার অ্যাকাউন্টের সাথে কোনো সক্রিয় প্যানেল সাবস্ক্রিপশন লিঙ্ক করা নেই। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।
          </CardContent>
        </Card>
      </div>
    );
  }

  const c = data.customer;
  const tier = c.current_tier;
  const limit = c.panel_user_limit ?? 0;
  const used = c.active_client_count ?? 0;
  const usagePct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  const expiresAt = c.panel_subscription_expires_at ? parseISO(c.panel_subscription_expires_at) : null;
  const daysLeft = expiresAt ? differenceInDays(expiresAt, new Date()) : null;
  const expiryStatus =
    daysLeft === null ? "none" : daysLeft < 0 ? "expired" : daysLeft <= 7 ? "soon" : "active";

  const statusBadge = {
    none: <Badge variant="outline">অজানা</Badge>,
    expired: <Badge variant="destructive">মেয়াদ শেষ</Badge>,
    soon: <Badge className="bg-amber-500 text-white hover:bg-amber-600">শীঘ্রই শেষ</Badge>,
    active: <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">সক্রিয়</Badge>,
  }[expiryStatus];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">আমার সাবস্ক্রিপশন</h1>
          <p className="text-sm text-muted-foreground">{c.customer_name}</p>
        </div>
        <Button>
          <CreditCard className="h-4 w-4 mr-2" />
          রিনিউ / আপগ্রেড
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Plan */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">বর্তমান প্ল্যান</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">{tier?.name ?? "—"}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {tier?.billing_mode === "flat" && `ফ্ল্যাট: ৳${tier.flat_price ?? 0}/মাস`}
              {tier?.billing_mode === "per_user" && `প্রতি ইউজার: ৳${tier.per_user_rate ?? 0}`}
              {tier?.billing_mode === "free" && "ফ্রি প্ল্যান"}
            </div>
          </CardContent>
        </Card>

        {/* Usage */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">ইউজার ব্যবহার</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">
              {used} <span className="text-sm text-muted-foreground">/ {limit || "∞"}</span>
            </div>
            <Progress value={usagePct} className="mt-3" />
            {usagePct >= 90 && (
              <div className="text-xs text-destructive mt-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> লিমিট প্রায় শেষ — আপগ্রেড করুন
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiry */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">মেয়াদ</CardTitle>
            <CalendarClock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">
              {expiresAt ? format(expiresAt, "dd MMM yyyy") : "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              {statusBadge}
              {daysLeft !== null && (
                <span>{daysLeft >= 0 ? `${daysLeft} দিন বাকি` : `${Math.abs(daysLeft)} দিন আগে শেষ`}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estimated bill */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">পরের মাসের আনুমানিক বিল</CardTitle>
          <Wallet className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">৳ {Number(c.next_month_estimated_bill ?? 0).toLocaleString("bn-BD")}</div>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>সাবস্ক্রিপশন ইতিহাস</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>পিরিয়ড</TableHead>
                <TableHead>মাসিক চার্জ</TableHead>
                <TableHead>পরিশোধ</TableHead>
                <TableHead>মাধ্যম</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    কোনো রেকর্ড নেই
                  </TableCell>
                </TableRow>
              )}
              {data.history.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell>
                    {format(parseISO(s.period_start), "dd MMM")} – {format(parseISO(s.period_end), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>৳ {Number(s.monthly_price).toLocaleString("bn-BD")}</TableCell>
                  <TableCell>৳ {Number(s.paid_amount).toLocaleString("bn-BD")}</TableCell>
                  <TableCell>{s.payment_method ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={s.status === "paid" ? "default" : "outline"}>{s.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
