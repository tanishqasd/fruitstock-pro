import React, { useState, useEffect } from "react";
import { X, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import api from "../../api/axios";

interface Party {
  id: string;
  name: string;
  phone?: string;
  pendingBalance: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultType?: "CUSTOMER_RECEIPT" | "DEALER_PAYMENT";
}

export default function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  defaultType = "CUSTOMER_RECEIPT",
}: Props) {
  const [type, setType] = useState<"CUSTOMER_RECEIPT" | "DEALER_PAYMENT">(defaultType);
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [amount, setAmount] = useState<number | string>("");
  const [mode, setMode] = useState<"CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE">("CASH");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setType(defaultType);
  }, [defaultType]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchParties = async () => {
      try {
        setError("");
        const endpoint = type === "CUSTOMER_RECEIPT" ? "/customers" : "/dealers";
        const res = await api.get(endpoint);
        const list = res.data.data || res.data;
        const validList = Array.isArray(list) ? list : [];
        setParties(validList);
        if (validList.length > 0) {
          setSelectedPartyId(validList[0].id || validList[0]._id);
        } else {
          setSelectedPartyId("");
        }
      } catch (err: any) {
        console.error("Failed to load counterparties:", err);
      }
    };

    fetchParties();
  }, [isOpen, type]);

  if (!isOpen) return null;

  const activeParty = parties.find(
    (p) => p.id === selectedPartyId || (p as any)._id === selectedPartyId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payAmount = Number(amount);

    if (isNaN(payAmount) || payAmount <= 0) {
      setError("Please enter a valid payment amount greater than zero.");
      return;
    }

    if (!selectedPartyId) {
      setError("Please select a valid counterparty.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await api.post("/payments", {
        type,
        amount: payAmount,
        mode,
        reference: reference.trim() || undefined,
        customerId: type === "CUSTOMER_RECEIPT" ? selectedPartyId : undefined,
        dealerId: type === "DEALER_PAYMENT" ? selectedPartyId : undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to log transaction ledger entry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-xl ${
                type === "CUSTOMER_RECEIPT"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {type === "CUSTOMER_RECEIPT" ? (
                <ArrowDownLeft size={18} />
              ) : (
                <ArrowUpRight size={18} />
              )}
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900">
                {type === "CUSTOMER_RECEIPT"
                  ? "Receive Customer Payment"
                  : "Make Dealer Payment"}
              </h2>
              <p className="text-xs text-gray-500">
                Direct balance settlement & cash position reconciliation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-black cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 gap-2 my-4 bg-gray-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setType("CUSTOMER_RECEIPT")}
            className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              type === "CUSTOMER_RECEIPT"
                ? "bg-white text-gray-900 shadow-2xs"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Receive From Buyer
          </button>
          <button
            type="button"
            onClick={() => setType("DEALER_PAYMENT")}
            className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              type === "DEALER_PAYMENT"
                ? "bg-white text-gray-900 shadow-2xs"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Pay Mandi Dealer
          </button>
        </div>

        {error && (
          <div className="p-3 my-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">
              Select {type === "CUSTOMER_RECEIPT" ? "Customer / Buyer" : "Dealer / Supplier"} *
            </label>
            <select
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-black outline-none"
            >
              {parties.map((p) => (
                <option key={p.id || (p as any)._id} value={p.id || (p as any)._id}>
                  {p.name} — Current Due: ₹{Number(p.pendingBalance || 0).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {activeParty && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex justify-between items-center text-xs">
              <span className="text-gray-500">Current Outstanding Balance:</span>
              <span className="font-bold font-mono text-gray-900">
                ₹{Number(activeParty.pendingBalance || 0).toLocaleString()}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">
                Settlement Amount (₹) *
              </label>
              <input
                type="number"
                step="any"
                min="1"
                required
                placeholder="e.g. 5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-black outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">
                Payment Channel *
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as any)}
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-black outline-none"
              >
                <option value="CASH">Cash Counter</option>
                <option value="UPI">UPI (GooglePay / PhonePe)</option>
                <option value="BANK_TRANSFER">Bank RTGS / NEFT</option>
                <option value="CHEQUE">Cheque Clearance</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">
              Reference / Note / Cheque #
            </label>
            <input
              type="text"
              placeholder="e.g. UPI Ref #4029192 or Bank Slip"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-black outline-none"
            />
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
              {loading ? "Posting..." : "Confirm & Settle Ledger"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}