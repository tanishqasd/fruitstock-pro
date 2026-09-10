import { Printer, X, ShieldCheck } from "lucide-react";

interface InvoiceItem {
  productName?: string;
  product?: { name: string };
  quantityKg: number;
  ratePerKg: number;
  totalPrice: number;
  unit?: string;
}

interface InvoiceModalProps {
  invoice: {
    invoiceNo: string;
    createdAt: string;
    totalAmount: number;
    receivedAmount: number;
    pendingAmount: number;
    customer?: {
      name: string;
      phone: string;
      address?: string;
      gstNumber?: string;
    };
    items?: InvoiceItem[];
  } | null;
  onClose: () => void;
}

export default function InvoiceModal({ invoice, onClose }: InvoiceModalProps) {
  if (!invoice) return null;

  const items = invoice.items || [];
  const grossTotal = Number(invoice.totalAmount) || 0;
  const received = Number(invoice.receivedAmount) || 0;
  const pendingDue = Number(invoice.pendingAmount) || Math.max(0, grossTotal - received);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-[#161b22] border border-gray-800 rounded-3xl p-6 sm:p-8 w-full max-w-2xl max-h-[95vh] overflow-y-auto shadow-2xl text-gray-200 printable-area">
        
        {/* Top Control Bar (Hidden on Print) */}
        <div className="flex justify-between items-center pb-4 border-b border-gray-800 mb-6 no-print">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800 uppercase tracking-wider">
              APMC Tax Invoice Memo
            </span>
            <span className="text-xs font-mono font-bold text-gray-400">
              #{invoice.invoiceNo}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
            >
              <Printer size={14} /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Invoice Printable Document */}
        <div className="bg-white text-gray-900 rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200 font-sans print:p-0 print:border-none">
          
          {/* Header & APMC Wholesaler Credentials */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-gray-300">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-gray-950">
                  FruitERP Wholesalers
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Wholesale Commission Agents & Cold-Storage Logistics
              </p>
              <p className="text-[11px] text-gray-500">
                Gala No. 48, APMC Fruit Market Yard, Main Gate
              </p>
              <p className="text-[11px] text-gray-500 font-mono">
                GSTIN: <span className="font-bold text-gray-700">27ABCDE1234F1Z5</span> • Mandi Lic: <span className="font-bold text-gray-700">APMC/MH/2026/884</span>
              </p>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-sm font-mono font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg inline-block border border-emerald-200">
                {invoice.invoiceNo}
              </div>
              <div className="text-xs text-gray-600 mt-2">
                <strong>Date:</strong> {new Date(invoice.createdAt || Date.now()).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </div>
              <div className="text-[11px] text-gray-500">
                <strong>Time:</strong> {new Date(invoice.createdAt || Date.now()).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>

          {/* Billed To / Buyer Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-b border-gray-200 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                Billed To (Retailer / Merchant)
              </span>
              <div className="text-sm font-bold text-gray-950">
                {invoice.customer?.name || "Fresh Fruit Hub"}
              </div>
              <div className="text-gray-600 font-mono mt-0.5">
                {invoice.customer?.phone || "+91 98220 12345"}
              </div>
              <div className="text-gray-500 mt-0.5">
                {invoice.customer?.address || "Local Mandi Distribution Stall"}
              </div>
            </div>

            <div className="sm:text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                Dispatch Particulars
              </span>
              <div className="text-gray-700">
                <strong>Payment Mode:</strong> Cash / Instant Counter Settlement
              </div>
              <div className="text-gray-700">
                <strong>HSN Category:</strong> 0808 (Fresh Produce & Fruits)
              </div>
              <div className="text-gray-500 text-[11px]">
                <strong>Dispatch Status:</strong> <span className="text-emerald-700 font-bold">Dispatched</span>
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="py-5">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-gray-700 uppercase text-[10px] border-y border-gray-300">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Produce Lot / Item Description</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                  <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-800">
                {items.length === 0 ? (
                  <tr>
                    <td className="py-3 px-3 text-gray-400">1</td>
                    <td className="py-3 px-3 font-semibold text-gray-950">
                      Standard Mandi Dispatched Produce
                    </td>
                    <td className="py-3 px-3 font-mono text-right">1 Lot</td>
                    <td className="py-3 px-3 font-mono text-right">₹{grossTotal.toFixed(2)}</td>
                    <td className="py-3 px-3 font-mono font-bold text-right text-gray-950">
                      ₹{grossTotal.toFixed(2)}
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-3 px-3 text-gray-400">{idx + 1}</td>
                      <td className="py-3 px-3 font-semibold text-gray-950">
                        {item.product?.name || item.productName || "Fruit Lot"}
                      </td>
                      <td className="py-3 px-3 font-mono text-right">
                        {item.quantityKg} {item.unit || "kg"}
                      </td>
                      <td className="py-3 px-3 font-mono text-right">
                        ₹{Number(item.ratePerKg).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-right text-gray-950">
                        ₹{Number(item.totalPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Totals & Balance Split */}
          <div className="pt-4 border-t border-gray-300 flex flex-col sm:flex-row justify-between items-start gap-6 text-xs">
            <div className="max-w-xs space-y-1.5 text-gray-500 text-[11px]">
              <div className="flex items-center gap-1 text-emerald-700 font-bold">
                <ShieldCheck size={14} /> APMC Certified Mandi Memo
              </div>
              <p>
                1. Perishable goods once checked and dispatched from cold storage are non-returnable.
              </p>
              <p>
                2. Credit balances must be reconciled within 7 trading days.
              </p>
            </div>

            <div className="w-full sm:w-64 space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-mono font-bold text-gray-900">
                  ₹{grossTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Counter Paid:</span>
                <span className="font-mono font-bold">
                  (-) ₹{received.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-rose-700 font-black text-sm pt-2 border-t border-gray-300">
                <span>Balance Due:</span>
                <span className="font-mono">
                  ₹{pendingDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="flex justify-between items-end pt-12 text-[11px] text-gray-500">
            <div>
              <div className="border-t border-gray-400 w-36 pt-1 text-center">
                Receiver's Signature
              </div>
            </div>
            <div>
              <div className="border-t border-gray-400 w-44 pt-1 text-center font-bold text-gray-900">
                For FruitERP Wholesalers
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}