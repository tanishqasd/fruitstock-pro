import { useState, useEffect, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { Search, Package, Users, Building2, X } from "lucide-react";

interface SearchResults {
  products: Array<{ id: string; name: string; currentStock: number; unit: string }>;
  customers: Array<{ id: string; name: string; phone: string }>;
  dealers: Array<{ id: string; name: string; phone: string }>;
}

export default function GlobalSearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({
    products: [],
    customers: [],
    dealers: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        isOpen ? onClose() : null;
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSearch = async (e: ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setQuery(term);

    if (term.trim().length < 2) {
      setResults({ products: [], customers: [], dealers: [] });
      return;
    }

    try {
      setLoading(true);
      const [prodRes, custRes, dealRes] = await Promise.allSettled([
        api.get("/inventory"),
        api.get("/customers"),
        api.get("/dealers"),
      ]);

      const prods =
        prodRes.status === "fulfilled"
          ? (prodRes.value.data?.data ?? prodRes.value.data) || []
          : [];
      const custs =
        custRes.status === "fulfilled"
          ? (custRes.value.data?.data ?? custRes.value.data) || []
          : [];
      const deals =
        dealRes.status === "fulfilled"
          ? (dealRes.value.data?.data ?? dealRes.value.data) || []
          : [];

      const filterLower = term.toLowerCase();

      setResults({
        products: prods.filter((p: any) =>
          p.name.toLowerCase().includes(filterLower)
        ),
        customers: custs.filter(
          (c: any) =>
            c.name.toLowerCase().includes(filterLower) ||
            (c.phone && c.phone.includes(filterLower))
        ),
        dealers: deals.filter(
          (d: any) =>
            d.name.toLowerCase().includes(filterLower) ||
            (d.phone && d.phone.includes(filterLower))
        ),
      });
    } catch (err) {
      console.error("Global search error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-start justify-center p-4 sm:pt-20">
      <div className="bg-[#161b22] border border-gray-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-gray-800">
          <Search size={18} className="text-gray-400 mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search fruit lot, buyer name, or grower contact..."
            value={query}
            onChange={handleSearch}
            className="w-full bg-transparent text-white text-sm focus:outline-none placeholder-gray-500"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setResults({ products: [], customers: [], dealers: [] });
              }}
              className="text-gray-400 hover:text-white mr-2"
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-0.5 rounded-md bg-gray-800 text-[10px] text-gray-400 hover:text-white"
          >
            ESC
          </button>
        </div>

        {/* Search Results */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4 text-xs">
          {loading && (
            <p className="text-gray-500 text-center py-4">Searching trading ledger...</p>
          )}

          {!loading &&
            query.length >= 2 &&
            results.products.length === 0 &&
            results.customers.length === 0 &&
            results.dealers.length === 0 && (
              <p className="text-gray-500 text-center py-6">
                No matching records found for "{query}".
              </p>
            )}

          {/* Fruit Lots */}
          {results.products.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase text-emerald-400 mb-2 flex items-center gap-1.5">
                <Package size={13} /> Fruit Inventory Lots
              </div>
              <div className="space-y-1">
                {results.products.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onClose();
                      navigate("/inventory");
                    }}
                    className="p-2.5 rounded-xl bg-[#0d1117] hover:bg-gray-800/80 cursor-pointer flex justify-between items-center transition"
                  >
                    <span className="font-bold text-white">{p.name}</span>
                    <span className="text-gray-400 font-mono">
                      Stock: {p.currentStock} {p.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buyers / Customers */}
          {results.customers.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase text-amber-400 mb-2 flex items-center gap-1.5">
                <Users size={13} /> Buyers & Retailers
              </div>
              <div className="space-y-1">
                {results.customers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onClose();
                      navigate("/customers");
                    }}
                    className="p-2.5 rounded-xl bg-[#0d1117] hover:bg-gray-800/80 cursor-pointer flex justify-between items-center transition"
                  >
                    <span className="font-bold text-white">{c.name}</span>
                    <span className="text-gray-400 font-mono">{c.phone}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Growers / Dealers */}
          {results.dealers.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase text-indigo-400 mb-2 flex items-center gap-1.5">
                <Building2 size={13} /> Growers & Mandi Suppliers
              </div>
              <div className="space-y-1">
                {results.dealers.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => {
                      onClose();
                      navigate("/dealers");
                    }}
                    className="p-2.5 rounded-xl bg-[#0d1117] hover:bg-gray-800/80 cursor-pointer flex justify-between items-center transition"
                  >
                    <span className="font-bold text-white">{d.name}</span>
                    <span className="text-gray-400 font-mono">{d.phone}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}