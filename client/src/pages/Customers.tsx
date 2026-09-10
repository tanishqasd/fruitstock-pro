import React from "react";
import { Users, Phone, MapPin, CreditCard } from "lucide-react";

export default function Customers() {
  const customers = [
    { name: "Rajesh Fruit Stall", owner: "Rajesh Kulkarni", phone: "+91 98221 44556", location: "Chhatrapati Sambhajinagar", balance: 0, status: "Clear" },
    { name: "Metro Fresh Mart", owner: "Amit Sharma", phone: "+91 98902 33112", location: "Pune APMC", balance: 30000, status: "Due" },
    { name: "Siddhi Agro Traders", owner: "Ganesh Patil", phone: "+91 94231 88776", location: "Jalna Mandi", balance: 54000, status: "Overdue" },
    { name: "Jai Hind Supermarket", owner: "Suresh Gupta", phone: "+91 97654 22100", location: "Nashik Market", balance: 0, status: "Clear" }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mandi Customers & Retail Ledger</h1>
        <p className="text-sm text-slate-500">Track outstanding credits, ledger books, and payment settlements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {customers.map((c, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{c.name}</h3>
                <p className="text-xs text-slate-400">{c.owner}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                c.status === "Clear" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                "bg-rose-50 text-rose-700 border border-rose-200"
              }`}>
                {c.status}
              </span>
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> {c.phone}</div>
              <div className="flex items-center gap-2"><MapPin size={14} className="text-slate-400" /> {c.location}</div>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
              <span className="text-xs text-slate-500">Outstanding:</span>
              <span className={`text-sm font-black ${c.balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {c.balance === 0 ? "Settled" : `?${c.balance.toLocaleString()}`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

