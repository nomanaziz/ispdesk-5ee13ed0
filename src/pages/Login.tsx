import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Activity, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30 relative overflow-hidden">
      {/* Decorative shapes */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-primary/8 blur-3xl" />
      <svg className="absolute top-0 left-0 w-48 h-48 text-primary/5" viewBox="0 0 200 200">
        <path d="M 100 0 C 100 55 55 100 0 100 C 55 100 100 145 100 200 C 100 145 145 100 200 100 C 145 100 100 55 100 0" fill="currentColor" />
      </svg>
      <svg className="absolute bottom-0 right-0 w-36 h-36 text-primary/5" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="80" fill="currentColor" />
      </svg>

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
                <Label htmlFor="email" className="text-sm">ইমেইল</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@yourisp.com"
                    className="pl-10 h-11"
                    required
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

              <Button
                type="submit"
                className="w-full h-11 font-medium"
                disabled={isLoading}
              >
                {isLoading ? "লোড হচ্ছে..." : "সাইন ইন"}
              </Button>
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

export default Login;
