import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Eye,
  Edit,
  LogIn,
  KeyRound,
  Wallet,
  Trash2,
  Mail,
} from "lucide-react";

interface Props {
  onView: () => void;
  onEdit: () => void;
  onLogin: () => void;
  onPasswordRegen: () => void;
  onFund: () => void;
  onSendMessage: () => void;
  onDelete: () => void;
}

export default function PopActionMenu(p: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>POP Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={p.onView}><Eye className="mr-2 h-4 w-4" /> View Profile</DropdownMenuItem>
        <DropdownMenuItem onClick={p.onEdit}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={p.onLogin}><LogIn className="mr-2 h-4 w-4" /> Login as POP</DropdownMenuItem>
        <DropdownMenuItem onClick={p.onPasswordRegen}><KeyRound className="mr-2 h-4 w-4" /> Password Regenerate</DropdownMenuItem>
        <DropdownMenuItem onClick={p.onFund}><Wallet className="mr-2 h-4 w-4" /> Fund Deduction / Add</DropdownMenuItem>
        <DropdownMenuItem onClick={p.onSendMessage}><Mail className="mr-2 h-4 w-4" /> Send Email/SMS</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={p.onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
