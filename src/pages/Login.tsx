import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PortalAuthProvider, usePortalAuth } from "@/contexts/PortalAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Activity, User, Lock, Eye, EyeOff, MapPin, Phone, Mail, Globe } from "lucide-react";
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
        case "reseller":
        case "reseller_sub":
        case "bw_customer":
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

  return (
    <div className="flex items-center justify-center p-4 py-10 bg-muted/30 relative overflow-hidden min-h-[calc(100vh-200px)]">
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-primary/8 blur-3xl" />

      <div className={`w-full ${showCompany ? "max-w-[860px] grid md:grid-cols-2 gap-6 items-stretch" : "max-w-[420px]"} relative z-10`}>
        {showCompany && (
          <Card className="shadow-xl border-border/50 hidden md:flex flex-col bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-8 flex flex-col h-full">
              {company?.logo_url && (
                <img src={company.logo_url} alt={company.name || "logo"} className="h-20 w-auto object-contain mb-5" />
              )}
              <h3 className="text-2xl font-bold text-foreground mb-2">{company?.name || "Company"}</h3>
              <div className="space-y-2.5 text-sm text-muted-foreground mt-4">
                {(company?.address1 || company?.address2) && (
                  <div className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" /><span>{[company.address1, company.address2].filter(Boolean).join(", ")}</span></div>
                )}
                {(company?.mobile1 || company?.phone1) && (
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary shrink-0" /><span>{[company.mobile1, company.mobile2, company.phone1, company.phone2].filter(Boolean).join(" / ")}</span></div>
                )}
                {company?.email && (
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary shrink-0" /><span>{company.email}</span></div>
                )}
                {company?.website && (
                  <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-primary shrink-0" /><a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary">{company.website}</a></div>
                )}
              </div>
              {(company?.tin || company?.bin) && (
                <div className="mt-auto pt-6 text-xs text-muted-foreground border-t flex flex-wrap gap-x-4 gap-y-1">
                  {company.tin && <span>TIN: {company.tin}</span>}
                  {company.bin && <span>BIN: {company.bin}</span>}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="shadow-xl border-border/50">
          <CardHeader className="text-center pb-2 pt-8">
            <div className="flex items-center justify-center gap-2.5 mb-5">
              {showCompany && company?.logo_url ? (
                <img src={company.logo_url} alt="logo" className="h-10 w-auto object-contain" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                  <Activity className="h-5 w-5 text-primary-foreground" />
                </div>
              )}
              <span className="text-xl font-bold text-foreground">{showCompany && company?.name ? company.name : "ISP Desk"}</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground">{t("স্বাগতম! 👋", "Welcome! 👋")}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t("আপনার একাউন্টে সাইন ইন করুন", "Sign in to your account")}
            </p>
          </CardHeader>

          <CardContent className="pt-4 pb-8 px-6 sm:px-8">
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm">{t("পাসওয়ার্ড", "Password")}</Label>
                  <Link to="/reset-password" className="text-xs text-primary hover:underline">
                    {t("পাসওয়ার্ড ভুলেছেন?", "Forgot password?")}
                  </Link>
                </div>
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
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="remember" />
                <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                  {t("মনে রাখুন", "Remember me")}
                </label>
              </div>

              <Button type="submit" className="w-full h-11 font-medium" disabled={isLoading}>
                {isLoading ? t("লোড হচ্ছে...", "Loading...") : t("সাইন ইন", "Sign In")}
              </Button>

              <p className="text-xs text-center text-muted-foreground pt-2">
                {t(
                  "Admin (ইমেইল), ক্লায়েন্ট (PPP ID), এবং রিসেলার সবাই এখানে লগইন করতে পারবেন",
                  "Admin (email), Client (PPP ID), and Reseller can all log in here"
                )}
              </p>
            </form>
          </CardContent>
        </Card>
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
