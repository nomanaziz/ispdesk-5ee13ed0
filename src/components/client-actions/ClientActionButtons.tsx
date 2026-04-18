import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Trash2, CalendarClock, Package, MessageSquare, Edit, Eye, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import StatusSchedulerDialog from "./StatusSchedulerDialog";
import PackageSchedulerDialog from "./PackageSchedulerDialog";

interface Props {
  client: any;
  mode: "client" | "billing";
  invalidateKey?: string;
}

export default function ClientActionButtons({ client, mode, invalidateKey = "clients-list" }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusOpen, setStatusOpen] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clients").delete().eq("id", client.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [invalidateKey] });
      toast.success("ক্লায়েন্ট মুছে ফেলা হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSMS = () => {
    if (mode === "client") {
      const msg = `আপনার PPPoE ID: ${client.username || client.user_id || "-"}, Password: ${client.password || "****"}`;
      toast.info(`SMS: ${msg}`, { description: `To: ${client.contact}` });
    } else {
      const bill = client.currentBill;
      const msg = `Code: ${client.client_id}, Bill: ৳${client.monthly_bill || 0}, Due: ৳${bill?.due || 0}, Last Pay: ${bill?.pay_date || "N/A"}`;
      toast.info(`SMS: ${msg}`, { description: `To: ${client.contact}` });
    }
  };

  const handleEdit = () => {
    navigate("/dashboard/clients/add", { state: { prefill: client, editMode: true } });
  };

  const handleView = () => {
    navigate(`/dashboard/billing/client/${client.id}`);
  };

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <div className="flex items-center gap-0.5">
          {/* View — always visible */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleView}>
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>ভিউ</TooltipContent>
          </Tooltip>

          {/* More — all other actions */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>আরও অপশন</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-44 z-50 bg-popover">
              <DropdownMenuItem onSelect={handleEdit}>
                <Edit className="mr-2 h-4 w-4" /> এডিট
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleSMS}>
                <MessageSquare className="mr-2 h-4 w-4" /> SMS পাঠান
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setPackageOpen(true)}>
                <Package className="mr-2 h-4 w-4" /> প্যাকেজ শিডিউলার
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setStatusOpen(true)}>
                <CalendarClock className="mr-2 h-4 w-4" /> স্ট্যাটাস শিডিউলার
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setTimeout(() => setDeleteOpen(true), 0);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> ডিলিট
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TooltipProvider>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ক্লায়েন্ট মুছে ফেলবেন?</AlertDialogTitle>
            <AlertDialogDescription>{client.name} ({client.client_id}) মুছে ফেলা হবে।</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground">মুছুন</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <StatusSchedulerDialog open={statusOpen} onOpenChange={setStatusOpen} client={client} invalidateKey={invalidateKey} />
      <PackageSchedulerDialog open={packageOpen} onOpenChange={setPackageOpen} client={client} invalidateKey={invalidateKey} />
    </>
  );
}
