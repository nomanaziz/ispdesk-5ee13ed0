import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  username?: string;
  password?: string;
  name?: string;
}

export default function CredentialDialog({ open, onClose, username, password, name }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (txt: string, key: string) => {
    navigator.clipboard.writeText(txt);
    setCopied(key);
    toast.success("Copied");
    setTimeout(() => setCopied(null), 1500);
  };
  const both = `Username: ${username}\nPassword: ${password}`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Portal Credentials</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {name && <p className="text-sm text-muted-foreground">{name}</p>}
          <div className="flex items-center gap-2 bg-muted rounded-md p-2">
            <div className="flex-1 text-xs">
              <div className="text-muted-foreground">Username</div>
              <div className="font-mono font-medium">{username || "-"}</div>
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(username || "", "u")}>
              {copied === "u" ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <div className="flex items-center gap-2 bg-muted rounded-md p-2">
            <div className="flex-1 text-xs">
              <div className="text-muted-foreground">Password</div>
              <div className="font-mono font-medium">{password || "-"}</div>
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(password || "", "p")}>
              {copied === "p" ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <Button size="sm" variant="outline" className="w-full" onClick={() => copy(both, "b")}>
            <Copy className="h-3.5 w-3.5 mr-1" /> Copy Both
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
