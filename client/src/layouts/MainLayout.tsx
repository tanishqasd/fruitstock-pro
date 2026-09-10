import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import FloatingButton from "../components/FloatingButton";

const MainLayout = () => {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">

      <Navbar />

      <main className="max-w-[1550px] mx-auto px-10 py-10">

        <Outlet />

      </main>
      <FloatingButton />
    </div>
  );
};

export default MainLayout;