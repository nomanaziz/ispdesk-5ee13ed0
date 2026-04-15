import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Wifi } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PortalLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = usePortalAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(username, password);
    setLoading(false);
    if (result.error) {
      toast({ title: "Login Failed", description: result.error, variant: "destructive" });
    } else {
      navigate("/portal/dashboard", { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[hsl(222,47%,8%)] flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
        <div className="relative z-10 text-center space-y-6">
          <div className="h-20 w-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
            <Wifi className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-white">Galaxy Net</h1>
          <p className="text-white/50 max-w-sm">
            Bandwidth Customer Portal — Access your billing, invoices, and account information in one place.
          </p>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md border-border">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="lg:hidden h-14 w-14 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Wifi className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Customer Login</h2>
              <p className="text-muted-foreground text-sm mt-1">Sign in to your bandwidth account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username">PPP ID / Client Code</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="PPP ID বা Client Code"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">PPP Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PortalLogin;
