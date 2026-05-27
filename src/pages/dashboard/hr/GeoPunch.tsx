import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

// Haversine distance in meters
function distanceM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export default function GeoPunch() {
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  const { data: settings } = useQuery({
    queryKey: ["hr-geo-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("hr_settings").select("setting_value").eq("setting_key", "geo_attendance").maybeSingle();
      return (data?.setting_value as any) || { enabled: false, lat: null, lng: null, radius_m: 100, max_accuracy_m: 50 };
    },
  });

  const { data: employee } = useQuery({
    queryKey: ["geo-punch-self"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return null;
      const { data } = await supabase.from("employees").select("id, name, employee_id").eq("email", user.email).maybeSingle();
      return data;
    },
  });

  const { data: today } = useQuery({
    queryKey: ["geo-punch-today", employee?.id],
    enabled: !!employee?.id,
    queryFn: async () => {
      const date = new Date().toISOString().slice(0, 10);
      const { data } = await supabase.from("attendance").select("*").eq("employee_id", employee!.id).eq("date", date).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (pos && settings?.lat && settings?.lng) {
      setDistance(distanceM(pos.lat, pos.lng, settings.lat, settings.lng));
    }
  }, [pos, settings]);

  const getLocation = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy });
        setLoading(false);
      },
      (err) => {
        toast.error("Location পাওয়া যায়নি: " + err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const punch = async (kind: "in" | "out") => {
    if (!employee) return toast.error("আপনার employee record নেই");
    if (!pos) return toast.error("আগে location নিন");
    if (!settings?.enabled) return toast.error("Geo attendance enabled নয়");
    if (settings.max_accuracy_m && pos.acc > settings.max_accuracy_m) {
      return toast.error(`GPS accuracy দুর্বল (${Math.round(pos.acc)}m) — খোলা জায়গায় চেষ্টা করুন`);
    }
    if (distance && distance > (settings.radius_m || 100)) {
      return toast.error(`আপনি office থেকে ${Math.round(distance)}m দূরে — punch হবে না`);
    }
    const date = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();
    const time = new Date().toTimeString().slice(0, 8);
    const payload: any = {
      employee_id: employee.id,
      date,
      source: "mobile_geo",
      punch_lat: pos.lat,
      punch_lng: pos.lng,
      punch_accuracy_m: pos.acc,
    };
    if (kind === "in") {
      payload.check_in = time;
      payload.punch_in_at = nowIso;
    } else {
      payload.check_out = time;
      payload.punch_out_at = nowIso;
    }
    if (today) {
      const { error } = await supabase.from("attendance").update(payload).eq("id", today.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("attendance").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success(`${kind === "in" ? "Check IN" : "Check OUT"} সফল`);
  };

  const insideRadius = distance !== null && distance <= (settings?.radius_m || 100);

  return (
    <div className="max-w-md mx-auto space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Geo Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!settings?.enabled && (
            <p className="text-sm bg-amber-50 border border-amber-300 rounded p-2">Geo attendance এখনো enable করা হয়নি (HR Settings থেকে enable করুন)।</p>
          )}
          {employee ? (
            <div className="text-sm">
              <p><b>{employee.name}</b> <span className="text-muted-foreground">({employee.employee_id})</span></p>
            </div>
          ) : (
            <p className="text-sm text-amber-700">আপনার login-এর সাথে কোনো employee যুক্ত নয় (email match নাই)।</p>
          )}

          <Button onClick={getLocation} disabled={loading} variant="outline" className="w-full gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />} আমার Location নিন
          </Button>

          {pos && (
            <div className="text-xs space-y-1 bg-muted p-3 rounded">
              <p>Lat: {pos.lat.toFixed(6)} | Lng: {pos.lng.toFixed(6)}</p>
              <p>Accuracy: ±{Math.round(pos.acc)}m</p>
              {distance !== null && (
                <p className={insideRadius ? "text-green-700 font-semibold" : "text-destructive font-semibold"}>
                  {insideRadius ? <CheckCircle2 className="h-3 w-3 inline" /> : <AlertTriangle className="h-3 w-3 inline" />}
                  {" "}Office থেকে দূরত্ব: {Math.round(distance)}m (allowed {settings?.radius_m || 100}m)
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => punch("in")} disabled={!insideRadius || !employee} className="bg-green-600 hover:bg-green-700">Check IN</Button>
            <Button onClick={() => punch("out")} disabled={!insideRadius || !employee} variant="destructive">Check OUT</Button>
          </div>

          {today && (
            <div className="text-sm border rounded p-2 space-y-1">
              <p>আজকের attendance:</p>
              <p>IN: <Badge variant="outline">{today.check_in || "—"}</Badge> &nbsp; OUT: <Badge variant="outline">{today.check_out || "—"}</Badge></p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
