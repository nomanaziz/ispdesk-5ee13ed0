import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PortalAuthProvider, usePortalAuth } from "@/contexts/PortalAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Activity, User, Lock, Eye, EyeOff, MapPin, Phone, Mail, Users, Wifi, ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { PublicLayout } from "@/components/PublicLayout";
import { useLanguage } from "@/contexts/LanguageContext";

const LoginInner = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const { signIn } = useAuth();
  const { login: portalLogin } = usePortalAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("system_settings").select("setting_value").eq("setting_key", "company_info").maybeSingle()
      .then(({ data }) => setCompany(data?.setting_value as any || null));
  }, []);

  const showCompany = company?.show_on_login;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const id = identifier.trim();
    try {
      if (id.includes("@")) {
        await signIn(id, password);
        navigate("/dashboard");
        return;
      }
      const result = await portalLogin(id, password);
      if (result.error) {
        toast({ title: t("লগইন ব্যর্থ", "Login failed"), description: result.error, variant: "destructive" });
        return;
      }
      switch (result.type) {
        case "bw_customer":
          navigate("/bw/dashboard", { replace: true });
          break;
        case "reseller":
        case "reseller_sub":
          navigate("/pop-admin/dashboard", { replace: true });
          break;
        case "client":
        default:
          navigate("/portal/dashboard", { replace: true });
      }
    } catch (err: any) {
      toast({ title: t("ত্রুটি", "Error"), description: err.message || t("লগইন ব্যর্থ", "Login failed"), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const stats = [
    { icon: Users, value: "5K+", label: t("গ্রাহক", "Customers") },
    { icon: Wifi, value: "15+", label: t("এলাকা", "Areas") },
    { icon: ShieldCheck, value: "99%", label: t("আপটাইম", "Uptime") },
  ];

  return (
    <div className="grid md:grid-cols-2 min-h-[calc(100vh-200px)] bg-background">
      {/* ── Left Panel — Brand ── */}
      <div className="hidden md:flex relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/85 text-primary-foreground">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-primary-foreground/5 blur-3xl" />
        <div className="absolute top-1/3 right-10 w-40 h-40 rounded-full border border-primary-foreground/15" />
        <div className="absolute top-1/2 right-24 w-24 h-24 rounded-full border border-primary-foreground/10" />

        <div className="relative z-10 flex flex-col justify-between p-10 lg:p-14 w-full">
          {/* Logo + name */}
          <div className="flex items-center gap-3">
            {company?.logo_url ? (
              <img src={company.logo_url} alt={company.name || "logo"} className="h-12 w-auto object-contain bg-primary-foreground/10 rounded-lg p-1.5" />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-primary-foreground/15 flex items-center justify-center backdrop-blur-sm">
                <Activity className="h-6 w-6" />
              </div>
            )}
            <span className="text-xl font-bold">{company?.name || "ISP Desk"}</span>
          </div>

          {/* Tagline + stats */}
          <div className="space-y-8 my-10">
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-4">
                {t("দ্রুতগতির ইন্টারনেটে", "Lightning-fast internet")}
                <br />
                <span className="text-primary-foreground/80">{t("আপনাকে স্বাগতম", "for everyone")}</span>
              </h1>
              <p className="text-base lg:text-lg text-primary-foreground/80 max-w-md leading-relaxed">
                {t(
                  "নির্ভরযোগ্য সেবা, ২৪/৭ সাপোর্ট এবং সাশ্রয়ী মূল্যে উচ্চগতির ইন্টারনেট সংযোগ।",
                  "Reliable service, 24/7 support, and affordable high-speed internet."
                )}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-md">
              {stats.map((s) => (
                <div key={s.label} className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-4 border border-primary-foreground/15">
                  <s.icon className="h-5 w-5 mb-2 text-primary-foreground/80" />
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-xs text-primary-foreground/75 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer — contact info */}
          <div className="space-y-3 text-sm text-primary-foreground/85">
            {showCompany && (
              <>
                <div className="h-px bg-primary-foreground/15" />
                {(company?.mobile1 || company?.phone1) && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{[company.mobile1, company.phone1].filter(Boolean).join(" · ")}</span>
                  </div>
                )}
                {company?.email && (
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span>{company.email}</span>
                  </div>
                )}
                {(company?.address1 || company?.address2) && (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{[company.address1, company.address2].filter(Boolean).join(", ")}</span>
                  </div>
                )}
              </>
            )}
            <p className="text-xs text-primary-foreground/60 pt-2">
              © {new Date().getFullYear()} {company?.name || "ISP Desk"}. {t("সর্বস্বত্ব সংরক্ষিত।", "All rights reserved.")}
            </p>
          </div>
        </div>
      </div>

      {/* ── Right Panel — Form ── */}
      <div className="flex items-center justify-center p-6 sm:p-10 bg-background">
        <div className="w-full max-w-md space-y-7">
          <div className="text-center md:text-left space-y-2">
            <p className="text-sm font-medium text-primary uppercase tracking-wider">
              {t("আপনার একাউন্টে", "Sign in to")}
            </p>
            <h2 className="text-3xl font-bold text-foreground">
              {t("লগইন করুন 👋", "your account 👋")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t(
                "Admin (ইমেইল), ক্লায়েন্ট (PPP ID), এবং রিসেলার সবাই এখানে লগইন করতে পারবেন।",
                "Admin (email), Client (PPP ID), and Reseller can all log in here."
              )}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="identifier" className="text-sm">{t("ইমেইল / ইউজারনেম / PPP ID", "Email / Username / PPP ID")}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={t("admin@yourisp.com বা PPP ID", "admin@yourisp.com or PPP ID")}
                  className="pl-10 h-11"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm">{t("পাসওয়ার্ড", "Password")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-11"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex justify-end">
                <Link to="/reset-password" className="text-xs text-primary hover:underline font-medium">
                  {t("পাসওয়ার্ড ভুলেছেন?", "Forgot password?")}
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="remember" />
              <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                {t("আমাকে মনে রাখুন", "Remember me")}
              </label>
            </div>

            <Button type="submit" className="w-full h-11 font-medium text-base" disabled={isLoading}>
              {isLoading ? t("লোড হচ্ছে...", "Loading...") : t("লগইন করুন", "Sign In")}
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-3 text-xs text-muted-foreground uppercase tracking-wider">
                  {t("অথবা", "Or")}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 text-sm">
              <Link to="/coverage" className="text-primary hover:underline font-medium">
                {t("কভারেজ চেক", "Coverage Check")}
              </Link>
              <span className="text-muted-foreground">·</span>
              <Link to="/new-connection" className="text-primary hover:underline font-medium">
                {t("নতুন কানেকশন", "New Connection")}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const Login = () => (
  <PortalAuthProvider>
    <PublicLayout>
      <LoginInner />
    </PublicLayout>
  </PortalAuthProvider>
);

export default Login;
