import CustomerRow from "./CustomerRow";
import Card from "../ui/Card";

const customers = [
  {
    name: "Rahul Sharma",
    phone: "9876543210",
    city: "Indore",
    balance: 12500,
  },
  {
    name: "Aman Verma",
    phone: "9988776655",
    city: "Bhopal",
    balance: 8900,
  },
  {
    name: "Neha Patel",
    phone: "9123456789",
    city: "Surat",
    balance: 15200,
  },
];

export default function CustomerTable() {
  return (
    <Card>

      <table className="w-full">

        <thead>

          <tr className="text-left text-gray-500 border-b border-[#262626]">

            <th className="pb-4">Name</th>

            <th>Phone</th>

            <th>City</th>

            <th>Balance</th>

            <th>Actions</th>

          </tr>

        </thead>

        <tbody>

          {customers.map((customer) => (
            <CustomerRow
              key={customer.phone}
              customer={customer}
            />
          ))}

        </tbody>

      </table>

    </Card>
  );
}