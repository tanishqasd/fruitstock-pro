import React, { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import api from "../../api/axios";

interface Product {
  id: string;
  name: string;
  variety?: string;
  unit: string;
  currentStock: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: Product | null;
}

export default function WastageModal({ isOpen, onClose, onSuccess, product }: Props) {
  const [quantityKg, setQuantityKg] = useState<number | string>("");
  const [reason, setReason] = useState("SPOILED");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantityKg);

    if (isNaN(qty) || qty <= 0) {
      setError("Please enter a valid quantity greater than zero.");
      return;
    }

    if (qty > Number(product.currentStock)) {
      setError(`Cannot deduct more than current stock (${product.currentStock} ${product.unit}).`);
      return;
    }

    try {
      setLoading(true);
      setError("");
      await api.post("/inventory/adjust", {
        productId: product.id,
        quantityKg: qty,
        reason,
        notes: notes.trim() || `Wastage adjustment: ${reason}`,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to record wastage adjustment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900">Record Fruit Spoilage / Loss</h2>
              <p className="text-xs text-gray-500">
                {product.name} ({product.variety || "Standard"})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-black">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-3 my-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex justify-between items-center">
            <span className="text-gray-500 font-medium">Available on Hand:</span>
            <span className="font-bold text-gray-900 font-mono">
              {Number(product.currentStock)} {product.unit}
            </span>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">
              Quantity to Deduct ({product.unit}) *
            </label>
            <input
              type="number"
              step="any"
              min="0.1"
              required
              placeholder="e.g. 15"
              value={quantityKg}
              onChange={(e) => setQuantityKg(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-black outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">
              Reason for Adjustment *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-black outline-none"
            >
              <option value="SPOILED">Spoiled / Rotten Crates</option>
              <option value="DAMAGED">Damaged in Transit / Handling</option>
              <option value="WEIGHT_LOSS">Natural Weight Loss / Dehydration</option>
              <option value="SAMPLING">Customer Sampling</option>
              <option value="CORRECTION">Physical Stock Reconciliation</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">
              Audit Notes
            </label>
            <input
              type="text"
              placeholder="e.g. 2 boxes discarded from cold room B"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-black outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50"
            >
              {loading ? "Recording..." : "Deduct & Write Ledger"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}