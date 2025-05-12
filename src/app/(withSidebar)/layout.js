"use client";

import { useState, useEffect } from "react";
import Sidebar from "./components/SideBar";
import { getUser } from "@/app/services/userService";

export default function HomeLayout({ children }) {
  const [auth, setAuth] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getUser();
      if (user) setAuth(user);
    };
    fetchUser();
  }, []);

  return (
    <div className="flex min-h-screen bg-[#0d0a18]">
      <Sidebar auth={auth} setAuth={setAuth}>
        {children}
      </Sidebar>
    </div>
  );
}
