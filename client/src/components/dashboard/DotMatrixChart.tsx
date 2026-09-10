const DotMatrixChart = () => {
  return (
    <div className="grid grid-cols-10 gap-3 place-items-center">

      {Array.from({ length: 100 }).map((_, i) => (

        <div
          key={i}
          className={`w-4 h-4 rounded-full transition-all duration-300 ${
            i < 70
              ? "bg-lime-400"
              : i < 90
              ? "bg-orange-400"
              : "bg-[#3b3b3b]"
          }`}
        />

      ))}

    </div>
  );
};

export default DotMatrixChart;