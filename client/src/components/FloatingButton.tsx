import { Plus } from "lucide-react";

export default function FloatingButton() {
  return (
    <button
      className="
      fixed
      bottom-8
      left-8
      w-16
      h-16
      rounded-full
      bg-lime-400
      text-black
      shadow-2xl
      hover:scale-110
      transition
      "
    >
      <Plus size={28} className="mx-auto" />
    </button>
  );
}