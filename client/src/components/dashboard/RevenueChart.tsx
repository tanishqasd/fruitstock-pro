import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
} from "recharts";

const data = [
  { month: "Jan", revenue: 120 },
  { month: "Feb", revenue: 180 },
  { month: "Mar", revenue: 150 },
  { month: "Apr", revenue: 240 },
  { month: "May", revenue: 320 },
  { month: "Jun", revenue: 410 },
  { month: "Jul", revenue: 520 },
];

export default function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#B4E23C" stopOpacity={0.7}/>
            <stop offset="95%" stopColor="#B4E23C" stopOpacity={0}/>
          </linearGradient>
        </defs>

        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#777" }}
        />

        <Tooltip />

        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#B4E23C"
          strokeWidth={3}
          fill="url(#fill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}