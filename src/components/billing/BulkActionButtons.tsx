import { Button } from "@/components/ui/button";
import {
  FileSpreadsheet, FileText, RefreshCw, Download, Ban, CheckCircle,
  MapPin, Building, ArrowRightLeft, Star, StarOff, Settings,
  MessageSquare, Mail, CalendarPlus, Zap, FilePlus, Repeat, RepeatIcon, DollarSign
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  selectedCount: number;
  onGenerateExcel: () => void;
  onGeneratePdf: () => void;
  onSyncClients: () => void;
  onDisableSelected: () => void;
  onEnableSelected: () => void;
  onBulkStatusChange: () => void;
  onBulkZoneChange: () => void;
  onBulkDistrictChange: () => void;
  onBulkThanaChange: () => void;
  onDownloadInvoice: () => void;
  onSmsSelected: () => void;
  onEmailSelected: () => void;
  onBulkDateExtend: () => void;
  onMigrateServer: () => void;
  onBulkVip: () => void;
  onBulkRemoveVip: () => void;
  onBulkProfileChange: () => void;
  onRegenerateInvoice?: () => void;
  onBulkAutoRechargeOn?: () => void;
  onBulkAutoRechargeOff?: () => void;
  onBulkClientRecharge?: () => void;
  showMigrate?: boolean;
  showAutoRecharge?: boolean;
  showBulkRecharge?: boolean;
}

export default function BulkActionButtons({
  selectedCount,
  onGenerateExcel,
  onGeneratePdf,
  onSyncClients,
  onDisableSelected,
  onEnableSelected,
  onBulkStatusChange,
  onBulkZoneChange,
  onBulkDistrictChange,
  onBulkThanaChange,
  onDownloadInvoice,
  onSmsSelected,
  onEmailSelected,
  onBulkDateExtend,
  onMigrateServer,
  onBulkVip,
  onBulkRemoveVip,
  onBulkProfileChange,
  onRegenerateInvoice,
  onBulkAutoRechargeOn,
  onBulkAutoRechargeOff,
  showMigrate = true,
  showAutoRecharge = false,
}: Props) {
  const requireSelection = (fn: () => void) => {
    if (selectedCount === 0) {
      toast({ title: "কোনো ক্লায়েন্ট সিলেক্ট করা হয়নি", variant: "destructive" });
      return;
    }
    fn();
  };

  return (
    <div className="space-y-2">
      {/* Row 1 */}
      <div className="flex flex-wrap gap-1.5">
        <ActionBtn icon={FileSpreadsheet} label="এক্সেল" onClick={onGenerateExcel} color="bg-emerald-600 hover:bg-emerald-700 text-white" />
        <ActionBtn icon={FileText} label="পিডিএফ" onClick={onGeneratePdf} color="bg-red-600 hover:bg-red-700 text-white" />
        <ActionBtn icon={RefreshCw} label="ক্লায়েন্ট সিঙ্ক" onClick={onSyncClients} />
        <ActionBtn icon={Ban} label="বন্ধ করুন" onClick={() => requireSelection(onDisableSelected)} />
        <ActionBtn icon={Zap} label="স্ট্যাটাস পরিবর্তন" onClick={() => requireSelection(onBulkStatusChange)} />
        <ActionBtn icon={MapPin} label="জোন পরিবর্তন" onClick={() => requireSelection(onBulkZoneChange)} />
        <ActionBtn icon={Building} label="জেলা পরিবর্তন" onClick={() => requireSelection(onBulkDistrictChange)} />
        <ActionBtn icon={Building} label="থানা পরিবর্তন" onClick={() => requireSelection(onBulkThanaChange)} />
        <ActionBtn icon={CheckCircle} label="চালু করুন" onClick={() => requireSelection(onEnableSelected)} />
        <ActionBtn icon={Download} label="ইনভয়েস" onClick={() => requireSelection(onDownloadInvoice)} />
      </div>
      {/* Row 2 */}
      <div className="flex flex-wrap gap-1.5">
        <ActionBtn icon={MessageSquare} label="SMS পাঠান" onClick={() => requireSelection(onSmsSelected)} />
        <ActionBtn icon={Mail} label="ইমেইল পাঠান" onClick={() => requireSelection(onEmailSelected)} />
        <ActionBtn icon={CalendarPlus} label="তারিখ বাড়ান" onClick={() => requireSelection(onBulkDateExtend)} />
        {showMigrate && (
          <ActionBtn icon={ArrowRightLeft} label="সার্ভার মাইগ্রেট" onClick={() => requireSelection(onMigrateServer)} color="bg-blue-600 hover:bg-blue-700 text-white" />
        )}
        <ActionBtn icon={Star} label="VIP করুন" onClick={() => requireSelection(onBulkVip)} />
        <ActionBtn icon={StarOff} label="VIP বাতিল" onClick={() => requireSelection(onBulkRemoveVip)} />
        <ActionBtn icon={Settings} label="প্রোফাইল পরিবর্তন" onClick={() => requireSelection(onBulkProfileChange)} />
        {onRegenerateInvoice && (
          <ActionBtn icon={FilePlus} label="ইনভয়েস পুনরায় তৈরি" onClick={() => requireSelection(onRegenerateInvoice)} color="bg-violet-600 hover:bg-violet-700 text-white" />
        )}
        {showAutoRecharge && onBulkAutoRechargeOn && (
          <ActionBtn icon={Repeat} label="Auto Recharge ON" onClick={() => requireSelection(onBulkAutoRechargeOn)} color="bg-emerald-600 hover:bg-emerald-700 text-white" />
        )}
        {showAutoRecharge && onBulkAutoRechargeOff && (
          <ActionBtn icon={RepeatIcon} label="Auto Recharge OFF" onClick={() => requireSelection(onBulkAutoRechargeOff)} color="bg-slate-600 hover:bg-slate-700 text-white" />
        )}
      </div>
      {selectedCount > 0 && (
        <p className="text-xs text-muted-foreground">{selectedCount} জন ক্লায়েন্ট সিলেক্ট করা হয়েছে</p>
      )}
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, color }: {
  icon: any; label: string; onClick: () => void; color?: string;
}) {
  return (
    <Button
      size="sm"
      variant={color ? "default" : "outline"}
      className={`h-7 text-xs px-2 ${color || ""}`}
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5 mr-1" />
      {label}
    </Button>
  );
}
