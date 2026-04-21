import { usePopScope } from "@/hooks/usePopScope";
import PopDebitHistory from "@/components/branches/PopDebitHistory";

export default function PopFundDebitHistory() {
  const { branchId, popName } = usePopScope();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Debit History (Fund Received)</h1>
        <p className="text-sm text-muted-foreground">Admin → POP fund history</p>
      </div>
      <PopDebitHistory branchId={branchId} popName={popName} />
    </div>
  );
}
