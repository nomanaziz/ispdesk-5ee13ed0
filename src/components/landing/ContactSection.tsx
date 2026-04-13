import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Send } from "lucide-react";

const districts = [
  "Dhaka", "Chittagong", "Rajshahi", "Khulna", "Sylhet", "Barisal", "Rangpur", "Mymensingh",
  "Comilla", "Gazipur", "Narayanganj", "Bogra", "Cox's Bazar", "Jessore", "Dinajpur",
  "Brahmanbaria", "Tangail", "Narsingdi", "Savar", "Faridpur", "Other",
];

const services = [
  "New Setup", "Migration from Other Platform", "Demo Request", "Custom Development", "Technical Support", "Other",
];

export function ContactSection() {
  const [form, setForm] = useState({ isp_name: "", contact_name: "", phone: "", district: "", service_needed: "" });
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!form.isp_name || !form.contact_name || !form.phone || !form.district || !form.service_needed) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    if (!agreed) {
      toast({ title: "Please accept the terms", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("service_requests").insert(form);
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Request submitted!", description: "We will contact you soon." });
      setForm({ isp_name: "", contact_name: "", phone: "", district: "", service_needed: "" });
      setAgreed(false);
    }
  };

  return (
    <section id="contact" className="py-20 bg-muted/10">
      <div className="container mx-auto px-4 max-w-xl">
        <Card className="border border-border/60 bg-card/80 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              <Send className="inline h-5 w-5 mr-2 text-primary" />
              Request Service
            </CardTitle>
            <p className="text-sm text-muted-foreground">Fill the form below and we'll get back to you within 24 hours.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>ISP Name</Label>
              <Input placeholder="Your ISP company name" value={form.isp_name} onChange={(e) => setForm({ ...form, isp_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Your Name</Label>
              <Input placeholder="Contact person name" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input placeholder="+880 1XXXXXXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>District</Label>
              <Select value={form.district} onValueChange={(v) => setForm({ ...form, district: v })}>
                <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                <SelectContent>
                  {districts.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Service Needed</Label>
              <Select value={form.service_needed} onValueChange={(v) => setForm({ ...form, service_needed: v })}>
                <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={agreed} onCheckedChange={(c) => setAgreed(c === true)} id="terms" />
              <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
                I agree to the terms of service and privacy policy
              </label>
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={loading}>
              {loading ? "Submitting..." : "Submit Request"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
