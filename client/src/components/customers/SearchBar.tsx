import { Search } from "lucide-react";

export default function SearchBar() {
  return (
    <div className="relative w-96">

      <Search
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
      />

      <input
        placeholder="Search customers..."
        className="
          w-full
          bg-[#171717]
          border
          border-[#262626]
          rounded-2xl
          py-3
          pl-12
          pr-4
          outline-none
          focus:border-lime-400
          transition
        "
      />

    </div>
  );
}