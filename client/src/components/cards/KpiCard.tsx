import Card from "../ui/Card";
import { ArrowUpRight } from "lucide-react";

interface Props {
  title: string;
  value: string;
  change: string;
}

const KpiCard = ({ title, value, change }: Props) => {
  const bars = [22, 30, 18, 40, 26, 48, 35, 55];

  return (
    <Card className="h-[220px] flex flex-col justify-between">

      <div className="flex items-start justify-between">

        <div>

          <p className="uppercase tracking-[4px] text-xs text-gray-500">
            {title}
          </p>

          <h2 className="text-5xl font-black mt-4">
            {value}
          </h2>

        </div>

        <div className="w-12 h-12 rounded-2xl bg-lime-400 flex items-center justify-center">

          <ArrowUpRight
            size={22}
            className="text-black"
          />

        </div>

      </div>

      <div>

        <div className="flex items-center justify-between mb-5">

          <span className="text-lime-400 font-bold">
            {change}
          </span>

          <span className="text-gray-500 text-sm">
            vs last month
          </span>

        </div>

        <div className="flex items-end gap-2 h-16">

          {bars.map((bar, index) => (
            <div
              key={index}
              style={{
                height: `${bar}px`,
              }}
              className="flex-1 rounded-full bg-gradient-to-t from-lime-500 to-lime-300"
            />
          ))}

        </div>

      </div>

    </Card>
  );
};

export default KpiCard;