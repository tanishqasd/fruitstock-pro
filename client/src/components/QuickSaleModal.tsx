import { useState, useEffect, type FormEvent } from "react";
import api from "../api/axios";
import { useToast } from "../context/ToastContext";
import {
  Receipt,
  Plus,
  Trash2,
  AlertCircle,
  X,
  ShoppingCart,
} from "lucide-react";

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

interface SaleLotItem {
  productId: string;
  productName: string;
  unit: string;
  quantityKg: number;
  ratePerKg: number;
  totalPrice: number;
}

interface QuickSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleCompleted?: () => void;
}

export default function QuickSaleModal({
  isOpen,
  onClose,
  onSaleCompleted,
}: QuickSaleModalProps) {
  // Global Toast Dispatcher
  const { success, error, warning } = useToast();

  // Data Collections
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingDependencies, setLoadingDependencies] = useState(false);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [cart, setCart] = useState<SaleLotItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [inputQty, setInputQty] = useState("");
  const [inputRate, setInputRate] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Fetch product inventory and registered customers on mount / open
  useEffect(() => {
    if (!isOpen) return;

    const fetchPrerequisites = async () => {
      try {
        setLoadingDependencies(true);
        const [prodRes, custRes] = await Promise.allSettled([
          api.get("/inventory"),
          api.get("/customers"),
        ]);

        if (prodRes.status === "fulfilled") {
          const rawProds = prodRes.value.data?.data ?? prodRes.value.data;
          setProducts(Array.isArray(rawProds) ? rawProds : []);
        }
        if (custRes.status === "fulfilled") {
          const rawCusts = custRes.value.data?.data ?? custRes.value.data;
          setCustomers(Array.isArray(rawCusts) ? rawCusts : []);
        }
      } catch (err) {
        console.error("Failed to load POS dependencies:", err);
        error("Catalog Sync Failed", "Unable to load product list or buyer accounts.");
      } finally {
        setLoadingDependencies(false);
      }
    };

    fetchPrerequisites();
  }, [isOpen, error]);

  // Autofill unit rate when fruit SKU is selected
  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setInputRate(String(prod.sellingRate || ""));
    }
  };

  // Add line item to cart
  const handleAddToCart = () => {
    setFormError("");
    const prod = products.find((p) => p.id === selectedProductId);

    if (!prod) {
      setFormError("Please select a valid fruit SKU from the catalog.");
      warning("SKU Required", "Choose a produce lot before adding to cart.");
      return;
    }

    const qty = Number(inputQty);
    const rate = Number(inputRate);

    if (qty <= 0 || isNaN(qty)) {
      setFormError("Quantity must be a positive number.");
      return;
    }

    if (rate <= 0 || isNaN(rate)) {
      setFormError("Rate per unit must be a positive number.");
      return;
    }

    if (qty > prod.currentStock) {
      const msg = `Insufficient storage. Only ${prod.currentStock} ${prod.unit} available.`;
      setFormError(msg);
      error("Stock Shortage", msg);
      return;
    }

    setCart((prev) => [
      ...prev,
      {
        productId: prod.id,
        productName: prod.name,
        unit: prod.unit,
        quantityKg: qty,
        ratePerKg: rate,
        totalPrice: qty * rate,
      },
    ]);

    // Reset lot input fields
    setSelectedProductId("");
    setInputQty("");
    setInputRate("");
  };

  // Remove line item
  const handleRemoveItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.totalPrice, 0);

  // Submit Sale & Deplete Inventory
  const handleSaveSale = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!selectedCustomerId) {
      setFormError("Please select a buyer account.");
      warning("Buyer Missing", "Select a merchant or retail customer.");
      return;
    }

    if (cart.length === 0) {
      setFormError("Please add at least one stock lot to the invoice.");
      warning("Empty Manifest", "Add at least one fruit SKU to proceed.");
      return;
    }

    const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
    const received = Number(receivedAmount) || 0;

    const payload = {
      invoiceNo,
      customerId: selectedCustomerId,
      items: cart,
      totalAmount: cartTotal,
      receivedAmount: received,
    };

    try {
      setSubmitting(true);
      await api.post("/sales", payload);

      // Trigger Toast notification
      success(
        "Invoice Generated Successfully!",
        `Dispatched under ${invoiceNo} and stock depleted in real time.`
      );

      // Clear Form & Close
      setCart([]);
      setSelectedCustomerId("");
      setReceivedAmount("");
      onSaleCompleted?.();
      onClose();
    } catch (err: any) {
      console.error("Sale dispatch failed:", err);
      const serverMsg =
        err.response?.data?.error || "Failed to process sale invoice.";
      setFormError(serverMsg);
      error("Transaction Failed", serverMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-[#161b22] border border-gray-800 rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition"
        >
          <X size={20} />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-2 mb-1">
          <Receipt className="text-emerald-400" size={22} />
          <h3 className="text-xl font-bold text-white">
            Quick Sales & Mandi Dispatch
          </h3>
        </div>
        <p className="text-xs text-gray-400 mb-6">
          Bill out warehouse stock, validate inventory, and adjust buyer ledger balance.
        </p>

        {/* Inline Form Error */}
        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSaveSale} className="space-y-5 text-xs">
          {/* Buyer Selection */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
              Select Merchant / Retail Buyer
            </label>
            <select
              required
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              disabled={loadingDependencies}
              className="w-full bg-[#0d1117] border border-gray-700 rounded-xl px-3.5 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="">
                {loadingDependencies
                  ? "Loading buyer accounts..."
                  : customers.length === 0
                  ? "No customers found"
                  : "Choose buyer..."}
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#161b22] text-white">
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
          </div>

          {/* Add Line Item Box */}
          <div className="p-4 bg-[#0d1117] rounded-2xl border border-gray-800 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Plus size={14} /> Add Stock SKU to Manifest
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  disabled={loadingDependencies}
                  className="w-full bg-[#161b22] border border-gray-700 rounded-xl px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">
                    {products.length === 0
                      ? "No stock available"
                      : "Select Fruit Lot..."}
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#161b22] text-white">
                      {p.name} (Stock: {p.currentStock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Quantity"
                  value={inputQty}
                  onChange={(e) => setInputQty(e.target.value)}
                  className="w-full bg-[#161b22] border border-gray-700 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Rate / Unit (₹)"
                  value={inputRate}
                  onChange={(e) => setInputRate(e.target.value)}
                  className="w-full bg-[#161b22] border border-gray-700 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              className="w-full bg-gray-800 hover:bg-gray-700 text-emerald-400 font-bold py-2 rounded-xl border border-gray-700 text-xs transition"
            >
              Add Item to Cart
            </button>
          </div>

          {/* Cart Table */}
          {cart.length > 0 && (
            <div className="bg-[#0d1117] border border-gray-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-[#21262d] text-gray-400 text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-3">Qty</th>
                    <th className="py-2.5 px-3">Rate</th>
                    <th className="py-2.5 px-3">Total (₹)</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {cart.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-bold text-white">
                        {item.productName}
                      </td>
                      <td className="py-2 px-3 font-mono">
                        {item.quantityKg} {item.unit}
                      </td>
                      <td className="py-2 px-3 font-mono">₹{item.ratePerKg}</td>
                      <td className="py-2 px-3 font-mono font-bold text-white">
                        ₹{item.totalPrice.toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-rose-400 hover:text-rose-300 font-bold"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-3 bg-[#161b22] border-t border-gray-800 flex justify-between font-bold">
                <span>Total Invoice Valuation:</span>
                <span className="font-mono text-emerald-400 text-sm">
                  ₹{cartTotal.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          )}

          {/* Payment Split */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                Immediate Payment Collected (₹)
              </label>
              <input
                type="number"
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full bg-[#0d1117] border border-gray-700 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                Balance Added to Credit Ledger (₹)
              </label>
              <div className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-3 py-2 text-amber-400 font-mono font-bold">
                ₹{Math.max(0, cartTotal - (Number(receivedAmount) || 0)).toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
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
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition disabled:opacity-50 flex items-center gap-2"
            >
              <ShoppingCart size={15} />
              {submitting ? "Processing Transaction..." : "Complete Sale & Deplete Stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}