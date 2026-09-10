import React, { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import api from "../../api/axios";

interface Product {
  id: string;
  name: string;
  variety?: string;
  unit: string;
  currentStock: number;
  avgCostRate: number;
}

interface Dealer {
  id: string;
  name: string;
  phone?: string;
  pendingBalance: number;
}

interface PurchaseLineItem {
  productId: string;
  quantityKg: number;
  ratePerKg: number;
  totalPrice: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewPurchaseModal({ isOpen, onClose, onSuccess }: Props) {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState("");
  const [items, setItems] = useState<PurchaseLineItem[]>([]);
  const [paidAmount, setPaidAmount] = useState<number | string>("");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "BANK_TRANSFER">("CASH");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const loadPrerequisites = async () => {
      try {
        const [dRes, pRes] = await Promise.all([
          api.get("/dealers"),
          api.get("/inventory"),
        ]);
        const dealerList = dRes.data.data || dRes.data;
        const productList = pRes.data.data || pRes.data;
        setDealers(Array.isArray(dealerList) ? dealerList : []);
        setProducts(Array.isArray(productList) ? productList : []);

        if (Array.isArray(dealerList) && dealerList.length > 0) {
          setSelectedDealerId(dealerList[0].id || dealerList[0]._id);
        }
        if (Array.isArray(productList) && productList.length > 0) {
          setItems([
            {
              productId: productList[0].id,
              quantityKg: 100,
              ratePerKg: Number(productList[0].avgCostRate) || 80,
              totalPrice: 100 * (Number(productList[0].avgCostRate) || 80),
            },
          ]);
        }
      } catch (err) {
        console.error("Failed to load purchase prerequisites:", err);
      }
    };
    loadPrerequisites();
  }, [isOpen]);

  if (!isOpen) return null;

  const addItemRow = () => {
    if (products.length === 0) return;
    setItems([
      ...items,
      {
        productId: products[0].id,
        quantityKg: 50,
        ratePerKg: Number(products[0].avgCostRate) || 80,
        totalPrice: 50 * (Number(products[0].avgCostRate) || 80),
      },
    ]);
  };

  const removeItemRow = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: keyof PurchaseLineItem, val: any) => {
    const updated = [...items];
    const item = { ...updated[idx], [field]: val };

    if (field === "productId") {
      const prod = products.find((p) => p.id === val);
      if (prod) {
        item.ratePerKg = Number(prod.avgCostRate) || 80;
      }
    }

    item.totalPrice = Number(item.quantityKg || 0) * Number(item.ratePerKg || 0);
    updated[idx] = item;
    setItems(updated);
  };

  const totalPurchaseBill = items.reduce((s, i) => s + i.totalPrice, 0);
  const numPaid = Number(paidAmount) || 0;
  const pendingAmount = Math.max(0, totalPurchaseBill - numPaid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setError("Please include at least one fruit lot in this consignment.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await api.post("/purchases", {
        dealerId: selectedDealerId,
        items,
        paidAmount: numPaid,
        paymentMode,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to record inward purchase.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-black text-gray-900">Record Inward Stock Procurement</h2>
            <p className="text-xs text-gray-500">Atomic stock increment and weighted-average rate calculation</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-black cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-3 my-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">
              Select Mandi Supplier / Grower *
            </label>
            <select
              value={selectedDealerId}
              onChange={(e) => setSelectedDealerId(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-black outline-none"
            >
              {dealers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.phone || "No Phone"}) — Current Payable: ₹{Number(d.pendingBalance || 0).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
                Inward Fruit Consignments
              </span>
              <button
                type="button"
                onClick={addItemRow}
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus size={13} /> Add Another Lot
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                  <div className="col-span-5">
                    <select
                      value={item.productId}
                      onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-gray-900"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Current: {Number(p.currentStock)} {p.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantityKg}
                      onChange={(e) => handleItemChange(idx, "quantityKg", Number(e.target.value))}
                      className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-semibold"
                    />
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      min="0"
                      placeholder="Cost"
                      value={item.ratePerKg}
                      onChange={(e) => handleItemChange(idx, "ratePerKg", Number(e.target.value))}
                      className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-semibold"
                    />
                  </div>

                  <div className="col-span-2 text-right font-bold text-gray-900">
                    ₹{item.totalPrice.toLocaleString()}
                  </div>

                  <div className="col-span-1 text-center">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="text-gray-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-gray-900">
              <span>Total Procurement Outlay:</span>
              <span className="text-base font-black">₹{totalPurchaseBill.toLocaleString()}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-600 mb-1">
                  Cash Paid to Supplier Today (₹)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-bold text-rose-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-600 mb-1">
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                >
                  <option value="CASH">Cash Counter</option>
                  <option value="UPI">UPI / Bank Transfer</option>
                  <option value="BANK_TRANSFER">Direct RTGS / NEFT</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs font-semibold text-indigo-800 pt-1">
              <span>Pending Payable to Supplier:</span>
              <span className="font-bold font-mono">₹{pendingAmount.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-black hover:bg-gray-800 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {loading ? "Receiving..." : "Confirm & Inward Stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}