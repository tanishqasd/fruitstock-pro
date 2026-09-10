import React from "react";
import { Truck, Phone, Award, ShieldCheck } from "lucide-react";

export default function Dealers() {
  const suppliers = [
    { name: "Ratnagiri Mango Growers Co-op", contact: "+91 98230 11223", region: "Ratnagiri, MH", items: "Alphonso Mango", rating: "4.9 / 5.0" },
    { name: "Kashmir Valley Orchards", contact: "+91 94190 44556", region: "Shopian, J&K", items: "Red Delicious Apples", rating: "4.8 / 5.0" },
    { name: "Nashik Grape Producers Ltd", contact: "+91 97650 77889", region: "Dindori, Nashik", items: "Thompson & Sonaka Grapes", rating: "4.7 / 5.0" },
    { name: "Vidarbha Orange Farmers Network", contact: "+91 98811 55667", region: "Nagpur, MH", items: "Nagpur Mandarins", rating: "4.8 / 5.0" }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dealers & Farmer Suppliers</h1>
        <p className="text-sm text-slate-500">Direct mandi source procurement and farmer batch tracking</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {suppliers.map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex justify-between items-center">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Truck size={18} className="text-emerald-600" />
                <h3 className="font-bold text-slate-900">{s.name}</h3>
              </div>
              <p className="text-xs text-slate-500 font-medium">Supply: {s.items}</p>
              <p className="text-xs text-slate-400">{s.region} • {s.contact}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                ? {s.rating}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

