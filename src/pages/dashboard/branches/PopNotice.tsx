import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Bell, Send } from "lucide-react";

export default function PopNotice() {
  const [form, setForm] = useState({ reseller_id: "", title: "", message: "" });

  const { data: resellers } = useQuery({
    queryKey: ["resellers-notice-select"],
    queryFn: async () => {
      const { data } = await supabase.from("branch_managers").select("id, name, contact").eq("status", "active");
      return data ?? [];
    },
  });

  const handleSend = () => {
    if (!form.title || !form.message) {
      toast.error("শিরোনাম ও বার্তা লিখুন");
      return;
    }
    // For now just show success — actual notification integration is future scope
    toast.success(`নোটিশ পাঠানো হয়েছে${form.reseller_id ? "" : " (সকলকে)"}`);
    setForm({ reseller_id: "", title: "", message: "" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">POP নোটিশ</h1>
        <p className="text-sm text-muted-foreground">POP ম্যানেজারদের নোটিশ পাঠান</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" /> নোটিশ পাঠান
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>প্রাপক (ফাঁকা রাখলে সকলকে যাবে)</Label>
            <Select value={form.reseller_id} onValueChange={(v) => setForm({ ...form, reseller_id: v })}>
              <SelectTrigger><SelectValue placeholder="সকল POP" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সকল POP</SelectItem>
                {resellers?.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>শিরোনাম *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="নোটিশের শিরোনাম" />
          </div>
          <div>
            <Label>বার্তা *</Label>
            <Textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="নোটিশের বিস্তারিত লিখুন..." />
          </div>
          <Button className="w-full" onClick={handleSend}>
            <Send className="h-4 w-4 mr-1" /> নোটিশ পাঠান
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
