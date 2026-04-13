import { Button } from "@/components/ui/button";
import { Server } from "lucide-react";
import { Link } from "react-router-dom";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export function LandingNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/landing" className="flex items-center gap-2 text-xl font-bold">
          <Server className="h-6 w-6 text-primary" />
          <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">ISP Desk</span>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#olt" className="text-sm text-muted-foreground hover:text-foreground transition-colors">OLT Monitoring</a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
          <a href="#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <a href="#contact">
            <Button size="sm" className="hidden sm:inline-flex">Demo Request</Button>
          </a>
          <Link to="/login">
            <Button variant="outline" size="sm">Login</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
