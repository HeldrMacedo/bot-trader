"use client";

import { redirect } from "next/navigation";
import { useEffect } from "react";
import { checkToken } from "./services/userService";

export default function Home() {
  console.log("Home page");
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      const isAuthenticated = checkToken(token);
      if (isAuthenticated) {
        redirect("/home");
      }
    } else {
      redirect("/login");
    }
  }, []);

  return <div></div>;
}

