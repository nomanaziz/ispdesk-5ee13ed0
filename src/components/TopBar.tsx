import { Bell, LogOut, User, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

export function TopBar() {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  return (
    <header className="h-14 border-b border-border/50 bg-card/80 backdrop-blur-md flex items-center justify-between px-3 sm:px-5 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground shrink-0" />
        <div className="hidden md:block min-w-0">
          <p className="text-sm font-medium truncate">
            Welcome, <span className="text-primary">{displayName}</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <ThemeSwitcher />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 h-9 px-2">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left min-w-0">
                <p className="text-xs font-medium truncate max-w-[120px]">{displayName}</p>
                {roles.length > 0 && (
                  <p className="text-[10px] text-muted-foreground capitalize">{roles[0]?.replace("_", " ")}</p>
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate("/admin")}>
              <User className="mr-2 h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { signOut(); navigate("/login"); }} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
