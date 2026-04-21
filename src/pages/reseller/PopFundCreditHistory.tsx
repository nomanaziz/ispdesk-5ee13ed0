import { usePopScope } from "@/hooks/usePopScope";
import PopCreditHistory from "@/components/branches/PopCreditHistory";

export default function PopFundCreditHistory() {
  const { popId, popName } = usePopScope();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Credit History (Daily Charges)</h1>
        <p className="text-sm text-muted-foreground">প্রতিদিন কোন user-এর জন্য কত টাকা কেটেছে</p>
      </div>
      <PopCreditHistory popId={popId} popName={popName} mode="pop" />
    </div>
  );
}
