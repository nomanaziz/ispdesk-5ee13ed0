import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PortalAuthProvider, usePortalAuth } from "@/contexts/PortalAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Activity, User, Lock, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const LoginInner = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const { login: portalLogin } = usePortalAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const id = identifier.trim();
    try {
      // Email → Admin/Staff via Supabase auth
      if (id.includes("@")) {
        await signIn(id, password);
        navigate("/dashboard");
        return;
      }
      // Otherwise → Portal auth (client / reseller / bw_customer)
      const result = await portalLogin(id, password);
      if (result.error) {
        toast({ title: "লগইন ব্যর্থ", description: result.error, variant: "destructive" });
        return;
      }
      switch (result.type) {
        case "reseller":
          navigate("/reseller/dashboard", { replace: true });
          break;
        case "client":
        case "bw_customer":
        default:
          navigate("/portal/dashboard", { replace: true });
      }
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message || "লগইন ব্যর্থ", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30 relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-primary/8 blur-3xl" />

      <div className="w-full max-w-[420px] relative z-10">
        <Card className="shadow-xl border-border/50">
          <CardHeader className="text-center pb-2 pt-8">
            <div className="flex items-center justify-center gap-2.5 mb-5">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Activity className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">ISP Desk</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground">স্বাগতম! 👋</h2>
            <p className="text-sm text-muted-foreground mt-1">
              আপনার একাউন্টে সাইন ইন করুন
            </p>
          </CardHeader>

          <CardContent className="pt-4 pb-8 px-6 sm:px-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="identifier" className="text-sm">ইমেইল / ইউজারনেম / PPP ID</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="admin@yourisp.com বা PPP ID"
                    className="pl-10 h-11"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm">পাসওয়ার্ড</Label>
                  <Link to="/reset-password" className="text-xs text-primary hover:underline">
                    পাসওয়ার্ড ভুলেছেন?
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
                  মনে রাখুন
                </label>
              </div>

              <Button type="submit" className="w-full h-11 font-medium" disabled={isLoading}>
                {isLoading ? "লোড হচ্ছে..." : "সাইন ইন"}
              </Button>

              <p className="text-xs text-center text-muted-foreground pt-2">
                Admin (ইমেইল), ক্লায়েন্ট (PPP ID), এবং রিসেলার সবাই এখানে লগইন করতে পারবেন
              </p>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2026 ISP Desk. সর্বস্বত্ব সংরক্ষিত।
        </p>
      </div>
    </div>
  );
};

const Login = () => (
  <PortalAuthProvider>
    <LoginInner />
  </PortalAuthProvider>
);

export default Login;
