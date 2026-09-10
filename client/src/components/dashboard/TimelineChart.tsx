const data = [
  {
    fruit: "Apple",
    progress: 80,
  },
  {
    fruit: "Banana",
    progress: 55,
  },
  {
    fruit: "Orange",
    progress: 92,
  },
  {
    fruit: "Mango",
    progress: 40,
  },
  {
    fruit: "Grapes",
    progress: 72,
  },
];

export default function TimelineChart() {
  return (
    <div className="space-y-6">

      {data.map((item) => (

        <div key={item.fruit}>

          <div className="flex justify-between mb-2">

            <span className="font-medium">
              {item.fruit}
            </span>

            <span className="text-gray-500">
              {item.progress}%
            </span>

          </div>

          <div className="h-4 rounded-full bg-[#252525] overflow-hidden">

            <div
              className="h-full rounded-full bg-gradient-to-r from-lime-400 to-orange-400"
              style={{
                width: `${item.progress}%`,
              }}
            />

          </div>

        </div>

      ))}

    </div>
  );
}