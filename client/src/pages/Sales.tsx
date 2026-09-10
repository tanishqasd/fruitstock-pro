import React, { useState } from "react";
import { ShoppingCart, Plus, Printer, CheckCircle } from "lucide-react";

export default function Sales() {
  const [sales, setSales] = useState([
    { id: "INV-2026-001", customer: "Rajesh Fruit Stall", fruit: "Alphonso Mango", crates: 40, weightKg: 800, ratePerKg: 180, total: 144000, paid: 144000, status: "Paid", date: "2026-08-28" },
    { id: "INV-2026-002", customer: "Metro Fresh Mart", fruit: "Kashmiri Apple", crates: 25, weightKg: 500, ratePerKg: 140, total: 70000, paid: 40000, status: "Partial", date: "2026-08-28" },
    { id: "INV-2026-003", customer: "Siddhi Agro Traders", fruit: "Nagpur Orange", crates: 60, weightKg: 1200, ratePerKg: 45, total: 54000, paid: 0, status: "Due", date: "2026-08-27" }
  ]);

  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ customer: "", fruit: "Alphonso Mango", weightKg: "", ratePerKg: "" });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const wt = parseFloat(formData.weightKg) || 0;
    const rate = parseFloat(formData.ratePerKg) || 0;
    const total = wt * rate;
    const newSale = {
      id: `INV-2026-00${sales.length + 1}`,
      customer: formData.customer || "Walk-in Retailer",
      fruit: formData.fruit,
      crates: Math.ceil(wt / 20),
      weightKg: wt,
      ratePerKg: rate,
      total: total,
      paid: total,
      status: "Paid",
      date: "2026-08-28"
    };
    setSales([newSale, ...sales]);
    setModalOpen(false);
    setFormData({ customer: "", fruit: "Alphonso Mango", weightKg: "", ratePerKg: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing & POS Terminal</h1>
          <p className="text-sm text-slate-500">Instant mandi crate billing, tax invoices, and balance collection</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-600/20 transition flex items-center gap-2"
        >
          <Plus size={18} /> Quick Sale / Mandi Bill
        </button>
      </div>

      {/* Sales Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-xs">
              <tr>
                <th className="py-3.5 px-5">Invoice #</th>
                <th className="py-3.5 px-5">Buyer</th>
                <th className="py-3.5 px-5">Produce Grade</th>
                <th className="py-3.5 px-5">Weight (Kg)</th>
                <th className="py-3.5 px-5">Rate / Kg</th>
                <th className="py-3.5 px-5">Total (?)</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-5 font-mono text-xs font-bold text-slate-700">{sale.id}</td>
                  <td className="py-3.5 px-5 font-medium text-slate-900">{sale.customer}</td>
                  <td className="py-3.5 px-5 text-slate-600">{sale.fruit}</td>
                  <td className="py-3.5 px-5 font-semibold text-slate-800">{sale.weightKg} kg</td>
                  <td className="py-3.5 px-5 text-slate-600">?{sale.ratePerKg}</td>
                  <td className="py-3.5 px-5 font-black text-slate-900">?{sale.total.toLocaleString()}</td>
                  <td className="py-3.5 px-5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      sale.status === "Paid" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                      sale.status === "Partial" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                      "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}>
                      {sale.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button onClick={() => window.print()} className="p-1.5 text-slate-400 hover:text-slate-700 transition">
                      <Printer size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Sale Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Create Mandi Bill</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Customer / Trader Name</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Mahadev Fruit Traders" 
                  value={formData.customer}
                  onChange={(e) => setFormData({...formData, customer: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Fruit Produce</label>
                <select 
                  value={formData.fruit}
                  onChange={(e) => setFormData({...formData, fruit: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
                >
                  <option>Alphonso Mango (Grade A)</option>
                  <option>Kashmiri Red Apple</option>
                  <option>Nagpur Santra (Orange)</option>
                  <option>Thompson Seedless Grapes</option>
                  <option>Robusta Banana</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Total Weight (Kg)</label>
                  <input 
                    type="number" 
                    required 
                    placeholder="e.g. 500" 
                    value={formData.weightKg}
                    onChange={(e) => setFormData({...formData, weightKg: e.target.value})}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Rate per Kg (?)</label>
                  <input 
                    type="number" 
                    required 
                    placeholder="e.g. 150" 
                    value={formData.ratePerKg}
                    onChange={(e) => setFormData({...formData, ratePerKg: e.target.value})}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20"
                >
                  Save & Print
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

