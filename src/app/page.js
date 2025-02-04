"use client";

import { redirect } from "next/navigation";
import { useEffect } from "react";
import { checkToken } from "./services/userService";

export default function Home() {
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      const isAuthenticated = checkToken(token);
      console.log("isAuthenticated", isAuthenticated);
      if (isAuthenticated) {
        redirect("/home");
      }
    } else {
      redirect("/login");
    }
  }, []);

  return <div></div>;
}

