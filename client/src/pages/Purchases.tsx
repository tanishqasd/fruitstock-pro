import React from "react";
import { Package, Trash2, Plus } from "lucide-react";

export default function Purchases() {
  const stock = [
    { fruit: "Alphonso Mango (Grade A)", stockKg: "1,250 kg", crates: 62, costPrice: "?140 / kg", mandiRate: "?180 / kg", wastage: "15 kg" },
    { fruit: "Kashmiri Red Apple", stockKg: "2,400 kg", crates: 120, costPrice: "?110 / kg", mandiRate: "?140 / kg", wastage: "20 kg" },
    { fruit: "Nagpur Santra", stockKg: "3,100 kg", crates: 155, costPrice: "?32 / kg", mandiRate: "?45 / kg", wastage: "45 kg" },
    { fruit: "Thompson Seedless Grapes", stockKg: "850 kg", crates: 42, costPrice: "?85 / kg", mandiRate: "?120 / kg", wastage: "10 kg" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory & Crate Wastage</h1>
          <p className="text-sm text-slate-500">Live cold storage stock, batch procurement, and fruit shrinkage logs</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-xs">
            <tr>
              <th className="py-3.5 px-5">Produce Grade</th>
              <th className="py-3.5 px-5">Cold Storage Stock</th>
              <th className="py-3.5 px-5">Crate Units</th>
              <th className="py-3.5 px-5">Procurement Cost</th>
              <th className="py-3.5 px-5">Current Mandi Rate</th>
              <th className="py-3.5 px-5">Shrinkage / Wastage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stock.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50">
                <td className="py-3.5 px-5 font-semibold text-slate-900">{item.fruit}</td>
                <td className="py-3.5 px-5 font-bold text-emerald-700">{item.stockKg}</td>
                <td className="py-3.5 px-5 text-slate-600">{item.crates} crates</td>
                <td className="py-3.5 px-5 text-slate-600">{item.costPrice}</td>
                <td className="py-3.5 px-5 font-semibold text-slate-800">{item.mandiRate}</td>
                <td className="py-3.5 px-5 font-mono text-xs text-rose-600">{item.wastage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

