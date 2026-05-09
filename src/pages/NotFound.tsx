import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, LayoutDashboard, ArrowLeft, LogIn, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import ispDeskLogo from "@/assets/isp-desk-logo.png";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: company } = useCompanyInfo();
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setIsAuthed(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) setIsAuthed(!!session);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const logoSrc = company?.logo_url || ispDeskLogo;
  const brandName = company?.name || "ISP Desk";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* Decorative background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-2xl"
      >
        <div className="rounded-2xl border border-border bg-card/80 p-8 shadow-2xl backdrop-blur-xl sm:p-12">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <img
                src={logoSrc}
                alt={`${brandName} logo`}
                className="h-10 w-auto max-w-[180px] object-contain"
              />
            </Link>
          </div>

          {/* Animated 404 */}
          <motion.h1
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.6, type: "spring" }}
            className="bg-gradient-to-br from-primary via-primary to-accent bg-clip-text text-center text-7xl font-extrabold tracking-tight text-transparent sm:text-9xl"
          >
            404
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="mt-4 text-center"
          >
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              দুঃখিত, পেজটি খুঁজে পাওয়া যায়নি
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Sorry, the page you are looking for has been moved, renamed, or never existed.
            </p>
          </motion.div>

          {/* Path badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.4 }}
            className="mt-6 flex justify-center"
          >
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-muted/60 px-4 py-1.5 text-xs text-muted-foreground">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <code className="truncate font-mono">{location.pathname}</code>
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.4 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap"
          >
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                হোম পেজে যান
              </Link>
            </Button>

            {isAuthed ? (
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link to="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  ড্যাশবোর্ডে যান
                </Link>
              </Button>
            ) : isAuthed === false ? (
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link to="/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  লগইন করুন
                </Link>
              </Button>
            ) : null}

            <Button
              size="lg"
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              পিছনে যান
            </Button>
          </motion.div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {brandName}
        </p>
      </motion.div>
    </div>
  );
};

export default NotFound;
