import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { usePopScope } from "@/hooks/usePopScope";
import PopDebitHistory from "@/components/branches/PopDebitHistory";
import FundRechargeDialog from "@/components/branches/FundRechargeDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function PopFundDebitHistory() {
  const { branchId, popName, popId } = usePopScope();
  const [open, setOpen] = useState(false);
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    const r = params.get("recharge");
    if (!r) return;
    if (r === "success") toast({ title: "ফান্ড সফলভাবে যোগ হয়েছে" });
    else if (r === "cancelled") toast({ title: "ফান্ড রিচার্জ বাতিল করা হয়েছে", variant: "destructive" });
    else toast({ title: "রিচার্জ ব্যর্থ হয়েছে", description: "অনুগ্রহ করে আবার চেষ্টা করুন", variant: "destructive" });
    params.delete("recharge");
    setParams(params, { replace: true });
  }, [params, setParams]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Debited Transactions</h1>
          <p className="text-sm text-muted-foreground">All Debited Transactions</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-1">
          <Plus className="h-4 w-4" /> Fund Recharge
        </Button>
      </div>
      <PopDebitHistory branchId={branchId} popName={popName} />
      <FundRechargeDialog open={open} onOpenChange={setOpen} popId={popId} popName={popName} />
    </div>
  );
}
