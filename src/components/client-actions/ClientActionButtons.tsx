import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Trash2, CalendarClock, Package, MessageSquare, Edit, Eye, MoreVertical, LogIn, CreditCard, FilePlus, FileText } from "lucide-react";
import { toast } from "sonner";
import StatusSchedulerDialog from "./StatusSchedulerDialog";
import PackageSchedulerDialog from "./PackageSchedulerDialog";
import { useAuth } from "@/contexts/AuthContext";
import { loginAsUser } from "@/lib/impersonate";
import { usePopScope } from "@/hooks/usePopScope";
import BillReceiveDialog from "@/components/billing/BillReceiveDialog";
import { exportInvoicesPdf } from "@/lib/exportClients";
import { callPortal } from "@/lib/portalApi";
import { useModulePermissions } from "@/hooks/useModulePermissions";

interface Props {
  client: any;
  mode: "client" | "billing";
  invalidateKey?: string;
}

const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function ClientActionButtons({ client, mode, invalidateKey = "clients-list" }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const { isPopMode } = usePopScope();
  const perms = useModulePermissions();
  const canEdit = perms.isSuperAdmin
    || perms.canWriteItem("CLIENTS", "Client List")
    || perms.canWriteItem("CLIENTS", client?.client_type === "Corporate" ? "Corporate Clients" : "Home Clients")
    || perms.canWriteItem("BILLING", "Billing List");
  const canBill = perms.isSuperAdmin
    || perms.canWriteItem("BILLING", "Billing List")
    || perms.canWriteItem("CLIENTS", "Billing List")
    || perms.canWriteItem("CLIENTS", "Daily Collection");
  const canDelete = perms.isSuperAdmin || perms.canDeleteItem("CLIENTS", "Client List") || perms.canDeleteItem("CLIENTS", client?.client_type === "Corporate" ? "Corporate Clients" : "Home Clients");
  const [statusOpen, setStatusOpen] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);

  const currentBill = useMemo(() => {
    if (client?.currentBill) return client.currentBill;
    const monthKey = currentMonthKey();
    return (client?.billing || []).find((bill: any) => String(bill?.month || "").slice(0, 7) === monthKey) || null;
  }, [client]);

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
    navigate(isPopMode ? "/pop-admin/clients/add" : "/dashboard/clients/add", { state: { prefill: client, editMode: true } });
  };

  const handleView = () => {
    navigate(isPopMode ? `/pop-admin/billing/client/${client.id}` : `/dashboard/billing/client/${client.id}`);
  };

  const generateBillMutation = useMutation({
    mutationFn: async () => {
      const monthKey = currentMonthKey();
      if (Number(client.monthly_bill || 0) <= 0) throw new Error("এই ক্লায়েন্টের মাসিক বিল সেট করা নেই");

      if (isPopMode) {
        return callPortal<{ created?: boolean }>("ensure_pop_client_bill", { client_id: client.id, month: monthKey });
      }

      const existingBill = client?.currentBill || (client?.billing || []).find((bill: any) => String(bill?.month || "").slice(0, 7) === monthKey);
      if (existingBill) return { created: false };

      const { error } = await supabase.from("billing").insert({
        bill_id: `BILL-${client.client_id}-${monthKey}`,
        client_id: client.id,
        month: `${monthKey}-01`,
        amount: Number(client.monthly_bill || 0),
        due: Number(client.monthly_bill || 0),
        paid: 0,
        status: "unpaid",
        generated: true,
      });
      if (error) throw error;
      return { created: true };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: [invalidateKey] });
      queryClient.invalidateQueries({ queryKey: ["clients-list"] });
      queryClient.invalidateQueries({ queryKey: ["billing-list"] });
      toast.success(res?.created ? "এই মাসের বিল তৈরি হয়েছে" : "এই মাসের বিল আগেই তৈরি আছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleInvoiceDownload = async () => {
    const bill = currentBill;
    if (!bill) {
      toast.error("ইনভয়েস ডাউনলোডের আগে বিল তৈরি করুন");
      return;
    }
    await exportInvoicesPdf([{ ...client, currentBill: bill }], `invoice-${client.client_id || client.id}`);
    toast.success("ইনভয়েস ডাউনলোড হয়েছে");
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
            <DropdownMenuContent align="end" className="w-56 z-50 bg-popover">
              <DropdownMenuItem onSelect={handleView}>
                <Eye className="mr-2 h-4 w-4" /> ভিউ প্রোফাইল
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem onSelect={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" /> এডিট
                </DropdownMenuItem>
              )}
              {canBill && (
                <DropdownMenuItem onSelect={() => setReceiveOpen(true)}>
                  <CreditCard className="mr-2 h-4 w-4" /> বিল রিসিভ
                </DropdownMenuItem>
              )}
              {canBill && (
                <DropdownMenuItem onSelect={() => generateBillMutation.mutate()}>
                  <FilePlus className="mr-2 h-4 w-4" /> বিল তৈরি
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={handleInvoiceDownload}>
                <FileText className="mr-2 h-4 w-4" /> ইনভয়েস
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleSMS}>
                <MessageSquare className="mr-2 h-4 w-4" /> SMS পাঠান
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem onSelect={() => setPackageOpen(true)}>
                  <Package className="mr-2 h-4 w-4" /> প্যাকেজ শিডিউলার
                </DropdownMenuItem>
              )}
              {canEdit && (
                <DropdownMenuItem onSelect={() => setStatusOpen(true)}>
                  <CalendarClock className="mr-2 h-4 w-4" /> স্ট্যাটাস শিডিউলার
                </DropdownMenuItem>
              )}
              {isAdmin && (
                <DropdownMenuItem
                  onSelect={() =>
                    loginAsUser("client", client.id)
                      .then(() => toast.success("নতুন ট্যাবে ক্লায়েন্ট পোর্টালে লগইন হচ্ছে"))
                      .catch((e) => toast.error(e.message))
                  }
                >
                  <LogIn className="mr-2 h-4 w-4" /> Admin: Login as Client
                </DropdownMenuItem>
              )}
              {canDelete && <DropdownMenuSeparator />}
              {canDelete && (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setTimeout(() => setDeleteOpen(true), 0);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> ডিলিট
                </DropdownMenuItem>
              )}
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
      <BillReceiveDialog open={receiveOpen} onOpenChange={setReceiveOpen} client={client} billing={currentBill} invalidateKey={invalidateKey} />
    </>
  );
}
