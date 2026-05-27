import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PayslipPrintView from "@/components/hr/PayslipPrintView";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";

export default function PayslipPrint() {
  const [params] = useSearchParams();
  const ids = (params.get("ids") || "").split(",").filter(Boolean);
  const auto = params.get("auto") !== "0";

  const [data, setData] = useState<Array<{ payroll: any; employee: any }>>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      if (ids.length === 0) { setLoaded(true); return; }
      const { data: payrolls } = await supabase.from("payroll").select("*").in("id", ids);
      const empIds = (payrolls || []).map((p: any) => p.employee_id);
      const { data: emps } = await supabase
        .from("employees")
        .select("*, departments(name), positions(name)")
        .in("id", empIds);
      const empMap = new Map((emps || []).map((e: any) => [e.id, e]));
      const list = (payrolls || []).map((p: any) => ({ payroll: p, employee: empMap.get(p.employee_id) }));
      setData(list);
      setLoaded(true);
    })();
  }, [params]);

  useEffect(() => {
    if (loaded && auto && data.length > 0) {
      const t = setTimeout(() => window.print(), 800);
      return () => clearTimeout(t);
    }
  }, [loaded, auto, data.length]);

  return (
    <div className="payslip-print-root">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .payslip-page { page-break-after: always; }
          .payslip-page:last-child { page-break-after: auto; }
          body { background: #fff !important; }
        }
        @page { size: A4; margin: 12mm; }
        .payslip-print-root { background: #f5f5f5; min-height: 100vh; }
        .payslip-page { background: #fff; margin: 16px auto; max-width: 900px; box-shadow: 0 1px 6px rgba(0,0,0,0.1); }
      `}</style>

      <div className="no-print" style={{ position: "sticky", top: 0, background: "#fff", padding: "12px 24px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
        <div><strong>{data.length}</strong> Payslip{data.length !== 1 ? "s" : ""} preview</div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" /> Print / Save as PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-2">
            <Download className="h-4 w-4" /> Download
          </Button>
        </div>
      </div>

      {!loaded && <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>}
      {loaded && data.length === 0 && <div style={{ padding: 40, textAlign: "center" }}>কোন পে-স্লিপ পাওয়া যায়নি</div>}

      {data.map(({ payroll, employee }) => (
        employee && (
          <div key={payroll.id} className="payslip-page">
            <PayslipPrintView payroll={payroll} employee={employee} />
          </div>
        )
      ))}
    </div>
  );
}
