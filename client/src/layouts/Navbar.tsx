import {
  Search,
  Bell,
  Settings2
} from "lucide-react";

const Navbar = () => {

  const menu = [
    "Dashboard",
    "Customers",
    "Dealers",
    "Inventory",
    "Sales",
    "Reports"
  ];

  return (

    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0D0D0D]/80 border-b border-[#202020]">

      <div className="max-w-[1550px] mx-auto h-24 flex items-center justify-between px-10">

        {/* Logo */}

        <div className="flex items-center gap-4">

          <div className="w-14 h-14 rounded-2xl bg-lime-300 flex items-center justify-center text-3xl">

            🍎

          </div>

          <div>

            <h1 className="font-black text-3xl">

              FruitERP

            </h1>

            <p className="text-gray-500 text-sm">

              Wholesaler Management

            </p>

          </div>

        </div>

        {/* Navigation */}

        <div className="hidden xl:flex items-center gap-2">

          {menu.map(item=>(

            <button
              key={item}
              className="px-5 py-3 rounded-full bg-[#181818] hover:bg-[#262626] transition"
            >

              {item}

            </button>

          ))}

        </div>

        {/* Right */}

        <div className="flex items-center gap-4">

          <button className="w-12 h-12 rounded-full bg-[#181818] flex items-center justify-center">

            <Search size={20}/>

          </button>

          <button className="relative w-12 h-12 rounded-full bg-[#181818] flex items-center justify-center">

            <Bell size={20}/>

            <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-red-500"></span>

          </button>

          <button className="w-12 h-12 rounded-full bg-[#181818] flex items-center justify-center">

            <Settings2 size={20}/>

          </button>

          <div className="flex items-center gap-3 ml-3">

            <div className="w-12 h-12 rounded-full bg-lime-300 text-black font-bold flex items-center justify-center">

              A

            </div>

            <div>

              <h3 className="font-semibold">

                Admin

              </h3>

              <p className="text-gray-500 text-sm">

                Administrator

              </p>

            </div>

          </div>

        </div>

      </div>

    </header>

  );

};

export default Navbar;