import { Pencil, Trash2 } from "lucide-react";

interface Props {
  customer: {
    name: string;
    phone: string;
    city: string;
    balance: number;
  };
}

export default function CustomerRow({ customer }: Props) {
  return (
    <tr className="border-b border-[#262626] hover:bg-[#1b1b1b] transition">

      <td className="py-5 font-semibold">
        {customer.name}
      </td>

      <td>{customer.phone}</td>

      <td>{customer.city}</td>

      <td className="text-lime-400 font-semibold">
        ₹{customer.balance.toLocaleString()}
      </td>

      <td>

        <div className="flex gap-4">

          <button>
            <Pencil
              size={18}
              className="text-blue-400"
            />
          </button>

          <button>
            <Trash2
              size={18}
              className="text-red-400"
            />
          </button>

        </div>

      </td>

    </tr>
  );
}