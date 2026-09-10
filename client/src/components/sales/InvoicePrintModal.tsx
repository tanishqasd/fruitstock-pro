import { useRef } from "react";
import { X, Printer } from "lucide-react";

interface InvoiceItem {
  id?: string;
  productId?: string;
  product?: { name: string; variety?: string; unit?: string };
  fruitName?: string;
  variety?: string;
  quantityKg: number;
  ratePerKg: number;
  totalPrice: number;
}

interface InvoiceData {
  id: string;
  invoiceNo: string;
  date: string;
  totalAmount: number;
  receivedAmount: number;
  pendingAmount: number;
  customer?: {
    name: string;
    phone?: string;
    address?: string;
    gstNumber?: string;
    pendingBalance?: number;
  };
  customerName?: string;
  items: InvoiceItem[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceData | null;
}

export default function InvoicePrintModal({ isOpen, onClose, invoice }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const customerName = invoice.customer?.name || invoice.customerName || "Counter Cash Buyer";
  const customerPhone = invoice.customer?.phone || "—";
  const customerAddress = invoice.customer?.address || "Local Mandi Distribution Hub";
  const customerGst = invoice.customer?.gstNumber || "Unregistered Buyer";

  const totalKg = invoice.items.reduce((s, i) => s + Number(i.quantityKg || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col my-8 border border-gray-200">
        {/* Top Control Bar (Hidden on Print) */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Tax Invoice Preview
            </span>
            <span className="font-mono text-xs font-bold bg-white px-2.5 py-0.5 rounded-full border border-gray-200 text-gray-900">
              {invoice.invoiceNo}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer size={14} />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-200 text-gray-500 hover:text-black transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Paper Area (Styled for A4 / Standard Paper Output) */}
        <div
          ref={printRef}
          className="p-8 sm:p-12 bg-white text-gray-900 text-xs font-sans print:p-0 print:m-0"
        >
          {/* Company & Document Header */}
          <div className="flex justify-between items-start border-b border-gray-200 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-black text-sm">
                  🍎
                </div>
                <h1 className="text-xl font-black tracking-tight text-gray-900 uppercase">
                  FruitERP Wholesale Mandi
                </h1>
              </div>
              <p className="text-gray-500 text-[11px] leading-tight">
                Cold Storage Unit 1 &bull; APMC Market Yard, Gate #3<br />
                GSTIN: 27AABCU9603R1ZM &bull; Phone: +91 98220 12345
              </p>
            </div>

            <div className="text-right">
              <h2 className="text-base font-black text-gray-900 uppercase tracking-wider">
                TAX INVOICE
              </h2>
              <p className="font-mono text-xs font-bold text-gray-700 mt-1">
                #{invoice.invoiceNo}
              </p>
              <p className="text-gray-500 text-[11px] mt-0.5">
                Date: {new Date(invoice.date).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Bill To / Consignee Section */}
          <div className="grid grid-cols-2 gap-6 my-6 text-[11px]">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="font-bold text-gray-400 uppercase tracking-wider text-[9px] mb-1">
                Billed To (Customer / Buyer)
              </p>
              <h3 className="text-sm font-bold text-gray-900">{customerName}</h3>
              <p className="text-gray-600 mt-0.5">Phone: {customerPhone}</p>
              <p className="text-gray-600">{customerAddress}</p>
              <p className="text-gray-600 font-mono mt-1">GSTIN: {customerGst}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col justify-between">
              <div>
                <p className="font-bold text-gray-400 uppercase tracking-wider text-[9px] mb-1">
                  Dispatch & Terms
                </p>
                <p className="text-gray-600">Dispatched via: Cold Chain Van / APMC Carts</p>
                <p className="text-gray-600">Payment Status: <strong className="text-gray-900 uppercase">{Number(invoice.pendingAmount) === 0 ? "Fully Paid" : "Credit / Partial"}</strong></p>
              </div>
              <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-500">
                <span>Total Net Weight:</span>
                <span className="font-bold text-gray-900">{totalKg.toLocaleString()} Kg</span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-6">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200 text-[10px] font-bold uppercase text-gray-600">
                  <th className="py-2.5 px-4">#</th>
                  <th className="py-2.5 px-4">Fruit Description</th>
                  <th className="py-2.5 px-4">HSN Code</th>
                  <th className="py-2.5 px-4 text-right">Quantity</th>
                  <th className="py-2.5 px-4 text-right">Rate (₹/Kg)</th>
                  <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[11px]">
                {invoice.items.map((item, idx) => {
                  const fruitTitle = item.product?.name || item.fruitName || "Fresh Fruit";
                  const varietyTitle = item.product?.variety || item.variety || "Grade A";

                  return (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-4 text-gray-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-semibold text-gray-900">
                        {fruitTitle} <span className="text-gray-500 font-normal">({varietyTitle})</span>
                      </td>
                      <td className="py-2.5 px-4 text-gray-500 font-mono">08081000</td>
                      <td className="py-2.5 px-4 text-right font-bold font-mono">
                        {Number(item.quantityKg).toLocaleString()} Kg
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-gray-700">
                        ₹{Number(item.ratePerKg).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-gray-900">
                        ₹{Number(item.totalPrice).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation & Ledger Due */}
          <div className="grid grid-cols-2 gap-6 items-start">
            <div className="text-[10px] text-gray-500 space-y-1.5 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <h4 className="font-bold uppercase text-gray-700">Terms & Conditions</h4>
              <p>1. Fresh produce inspected and accepted upon warehouse dispatch.</p>
              <p>2. Payment due within 7 days of invoice date.</p>
              <p>3. All disputes subject to local Mandi jurisdiction.</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal Value:</span>
                <span className="font-mono font-bold text-gray-900">
                  ₹{Number(invoice.totalAmount).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Amount Paid Today:</span>
                <span className="font-mono font-bold">
                  ₹{Number(invoice.receivedAmount).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between text-amber-800 font-bold pt-2 border-t border-gray-200 text-sm">
                <span>Invoice Outstanding:</span>
                <span className="font-mono">
                  ₹{Number(invoice.pendingAmount).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Authorized Signatures */}
          <div className="flex justify-between items-end pt-12 mt-8 border-t border-gray-200 text-[11px] text-gray-500">
            <div>
              <p className="font-medium text-gray-700">Receiver's Signature / Stamp</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-900">For FruitERP Wholesale Syndicate</p>
              <p className="mt-8 text-gray-400">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}