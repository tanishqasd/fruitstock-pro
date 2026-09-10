import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
} from "recharts";

const data = [
  { fruit: "Apple", stock: 90 },
  { fruit: "Banana", stock: 60 },
  { fruit: "Orange", stock: 75 },
  { fruit: "Mango", stock: 48 },
  { fruit: "Grapes", stock: 70 },
];

export default function InventoryChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <XAxis
          dataKey="fruit"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#777" }}
        />

        <Tooltip />

        <Bar
          dataKey="stock"
          fill="#F5A623"
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}