import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { getBranding } from "@/lib/portalBranding";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const PortalLogin = () => {
  const { customer, login } = usePortalAuth();
  const navigate = useNavigate();
  const branding = getBranding();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Apply brand color as primary if present
    if (branding?.brandColor) {
      document.documentElement.style.setProperty("--portal-brand", branding.brandColor);
    }
  }, [branding?.brandColor]);

  if (customer) return <Navigate to="/portal/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { toast.error("Username ও password দিন"); return; }
    setLoading(true);
    try {
      await login(username, password);
      navigate("/portal/dashboard");
    } catch (err: any) {
      toast.error(err?.message || "Login ব্যর্থ");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          {branding?.logoUrl && (
            <img src={branding.logoUrl} alt={branding.name} className="h-16 w-16 mx-auto object-contain" />
          )}
          <CardTitle className="text-2xl">
            {branding?.title || "Customer Portal"}
          </CardTitle>
          {branding?.name && <p className="text-sm text-muted-foreground">{branding.name}</p>}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">Username / Client ID</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalLogin;
