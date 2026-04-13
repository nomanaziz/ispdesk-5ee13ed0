import { Server } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="border-t border-border/40 py-10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-lg font-bold">
            <Server className="h-5 w-5 text-primary" />
            <span className="text-foreground">ISP Desk</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#olt" className="hover:text-foreground transition-colors">OLT Monitoring</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
            <a href="#contact" className="hover:text-foreground transition-colors">Contact</a>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ISP Desk. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
