import { useState, useEffect, type FormEvent } from "react";
import api from "../../api/axios";
import { X, Plus, Trash2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  sellingRate: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface CartItem {
  productId: string;
  productName: string;
  unit: string;
  quantityKg: number;
  ratePerKg: number;
  totalPrice: number;
}

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewSaleModal({ isOpen, onClose, onSuccess }: NewSaleModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [inputQty, setInputQty] = useState("");
  const [inputRate, setInputRate] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      Promise.all([api.get("/inventory"), api.get("/customers")])
        .then(([prodRes, custRes]) => {
          setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
          setCustomers(Array.isArray(custRes.data) ? custRes.data : []);
        })
        .catch((err) => console.error("Failed to load invoice dependencies", err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProductSelect = (productId: string) => {
    setSelectedProduct(productId);
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      setInputRate(prod.sellingRate.toString());
    }
  };

  const addItemToCart = () => {
    setError("");
    const prod = products.find((p) => p.id === selectedProduct);
    if (!prod) {
      setError("Please select a valid fruit lot.");
      return;
    }

    const qty = Number(inputQty);
    const rate = Number(inputRate);

    if (qty <= 0 || rate <= 0) {
      setError("Quantity and rate must be greater than zero.");
      return;
    }

    if (qty > Number(prod.currentStock)) {
      setError(`Stock deficit: only ${prod.currentStock} ${prod.unit} available.`);
      return;
    }

    setCart([
      ...cart,
      {
        productId: prod.id,
        productName: prod.name,
        unit: prod.unit,
        quantityKg: qty,
        ratePerKg: rate,
        totalPrice: qty * rate,
      },
    ]);

    setSelectedProduct("");
    setInputQty("");
    setInputRate("");
  };

  const removeCartItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.totalPrice, 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setError("Please add at least one line item to the invoice.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
      await api.post("/sales", {
        invoiceNo,
        customerId: selectedCustomerId || null,
        items: cart,
        totalAmount: cartTotal,
        receivedAmount: Number(receivedAmount) || 0,
      });

      setCart([]);
      setSelectedCustomerId("");
      setReceivedAmount("");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Sale Dispatch Error:", err);
      setError(err.response?.data?.error || "Failed to dispatch sales invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-[#161b22] border border-gray-800 rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl text-white">
        <div className="flex items-center justify-between pb-4 border-b border-gray-800 mb-5">
          <div>
            <h3 className="text-xl font-black text-white">Generate Dispatch Invoice</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Wholesale lot billing and automated stock depletion
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
              Wholesale Buyer / Counter Sale
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-[#0d1117] border border-gray-700 rounded-xl px-3.5 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="">Walk-in Cash Counter</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
          </div>

          <div className="p-4 bg-[#0d1117] rounded-2xl border border-gray-800 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Add Fruit Lot
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <select
                  value={selectedProduct}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full bg-[#161b22] border border-gray-700 rounded-xl px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Select Fruit Lot...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.currentStock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Qty (kg)"
                  value={inputQty}
                  onChange={(e) => setInputQty(e.target.value)}
                  className="w-full bg-[#161b22] border border-gray-700 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Rate (₹)"
                  value={inputRate}
                  onChange={(e) => setInputRate(e.target.value)}
                  className="w-full bg-[#161b22] border border-gray-700 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={addItemToCart}
              className="w-full bg-gray-800 hover:bg-gray-700 text-emerald-400 font-bold py-2 rounded-xl border border-gray-700 text-xs transition flex items-center justify-center gap-1.5"
            >
              <Plus size={14} /> Add Line Item
            </button>
          </div>

          {cart.length > 0 && (
            <div className="bg-[#0d1117] border border-gray-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-[#21262d] text-gray-400 text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-3">Quantity</th>
                    <th className="py-2.5 px-3">Rate</th>
                    <th className="py-2.5 px-3">Subtotal</th>
                    <th className="py-2.5 px-3 text-right">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {cart.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 font-bold text-white">{item.productName}</td>
                      <td className="py-2.5 px-3 font-mono">
                        {item.quantityKg} {item.unit}
                      </td>
                      <td className="py-2.5 px-3 font-mono">₹{item.ratePerKg}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-white">
                        ₹{item.totalPrice.toLocaleString("en-IN")}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeCartItem(idx)}
                          className="text-rose-400 hover:text-rose-300 p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-3 bg-[#161b22] border-t border-gray-800 flex justify-between font-bold">
                <span className="text-gray-400">Total Invoice Valuation:</span>
                <span className="font-mono text-emerald-400 text-sm">
                  ₹{cartTotal.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                Settled Amount Now (₹)
              </label>
              <input
                type="number"
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
                placeholder="Cash / UPI amount"
                className="w-full bg-[#0d1117] border border-gray-700 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                Outstanding Balance Due (₹)
              </label>
              <div className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-3 py-2 text-rose-400 font-mono font-bold">
                ₹{Math.max(0, cartTotal - (Number(receivedAmount) || 0)).toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-gray-400 hover:bg-gray-800 text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || cart.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition disabled:opacity-50"
            >
              {submitting ? "Processing..." : "Confirm & Dispatch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}