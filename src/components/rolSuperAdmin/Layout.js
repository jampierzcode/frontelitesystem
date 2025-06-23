import React, { useState } from "react";
import Sidebar from "./Sidebar";
import TopNavigation from "./TopNavigation";

const Layout = ({ children }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="flex">
      <Sidebar open={open} setOpen={setOpen} />
      <div className="w-full app-container h-[100vh]">
        <TopNavigation open={open} setOpen={setOpen} />
        <div className="px-6 py-12 h-full overflow-auto">{children}</div>
      </div>
    </div>
  );
};

export default Layout;
