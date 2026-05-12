import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { getBillingCustomerId } from "@/lib/portalIdentity";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { format } from "date-fns";

const ResellerInvoicePrint = () => {
  const { id = "" } = useParams();
  const { customer } = usePortalAuth();
  const billingId = getBillingCustomerId(customer);

  const { data } = useQuery({
    queryKey: ["reseller-invoice-print", id, billingId, customer?.session_id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_bw_portal_invoice_detail", {
        _invoice_id: id,
        _customer_id: billingId || null,
        _username: customer?.username || null,
        _user_type: customer?.type || null,
        _session_id: customer?.session_id || null,
      });
      if (error) {
        console.error("get_bw_portal_invoice_detail failed:", error);
        return { inv: null, items: [] };
      }
      const payload = (data as any) || {};
      return {
        inv: payload.invoice || null,
        items: (payload.items as any[]) || [],
      };
    },
  });

  useEffect(() => {
    document.title = data?.inv ? `Invoice ${data.inv.invoice_no}` : "Invoice";
  }, [data]);

  const inv = data?.inv;

  const subtotal = (data?.items || []).reduce((s: number, it: any) => s + Number(it.amount || 0), 0);
  const due = Number(inv?.due ?? Math.max(0, Number(inv?.total_amount || inv?.amount || 0) - Number(inv?.paid_amount || 0) - Number(inv?.discount || 0)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/reseller/invoices/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Link>
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-1" /> Download / Print PDF
        </Button>
      </div>

      <div className="bg-white text-black mx-auto max-w-3xl p-8 shadow print:shadow-none border print:border-0">
        <div className="flex items-start justify-between border-b pb-4">
          <div>
            <h2 className="text-2xl font-bold">INVOICE</h2>
            <div className="text-sm text-gray-600">{inv?.invoice_no}</div>
          </div>
          <div className="text-right text-sm">
            <div>Date: {inv ? format(new Date(inv.created_at), "dd MMM yyyy") : "—"}</div>
            <div>Month: {inv?.month || "—"}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div>
            <div className="text-gray-500 text-xs uppercase">Bill To</div>
            <div className="font-semibold">{inv?.customer_name || "—"}</div>
            <div>{inv?.customer_code || ""}</div>
            <div>{inv?.customer_address || ""}</div>
            <div>{inv?.customer_mobile || ""}</div>
          </div>
          <div className="text-right">
            <div className="text-gray-500 text-xs uppercase">Amount Due</div>
            <div className="text-3xl font-bold">৳ {due.toLocaleString()}</div>
          </div>
        </div>

        <table className="w-full mt-6 text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2">Service</th>
              <th className="p-2">Period</th>
              <th className="p-2 text-right">Mbps</th>
              <th className="p-2 text-right">Rate</th>
              <th className="p-2 text-right">Days</th>
              <th className="p-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items || []).map((it: any) => (
              <tr key={it.id} className="border-b">
                <td className="p-2 font-medium">{it.service_name || it.item_name || "—"}</td>
                <td className="p-2 text-xs">
                  {it.period_start ? format(new Date(it.period_start), "dd MMM") : "—"} —{" "}
                  {it.period_end ? format(new Date(it.period_end), "dd MMM yyyy") : "—"}
                </td>
                <td className="p-2 text-right">{Number(it.bandwidth_mbps || 0)}</td>
                <td className="p-2 text-right">৳ {Number(it.rate || 0).toLocaleString()}</td>
                <td className="p-2 text-right">{it.days || 0}/{it.total_days_in_month || 0}</td>
                <td className="p-2 text-right">৳ {Number(it.amount || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="p-2 text-right">Subtotal</td>
              <td className="p-2 text-right">৳ {subtotal.toLocaleString()}</td>
            </tr>
            <tr>
              <td colSpan={5} className="p-2 text-right">Discount</td>
              <td className="p-2 text-right">৳ {Number(inv?.discount || 0).toLocaleString()}</td>
            </tr>
            <tr>
              <td colSpan={5} className="p-2 text-right">Paid</td>
              <td className="p-2 text-right">৳ {Number(inv?.paid_amount || 0).toLocaleString()}</td>
            </tr>
            <tr className="font-bold border-t">
              <td colSpan={5} className="p-2 text-right">Total Due</td>
              <td className="p-2 text-right">৳ {due.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-8 text-xs text-gray-500 text-center">
          Thank you for your business.
        </div>
      </div>
    </div>
  );
};

export default ResellerInvoicePrint;
