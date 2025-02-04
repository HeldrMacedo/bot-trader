"use client";
import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import { checkToken } from "../services/userService";
export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  useEffect(() => {
    const checkAuth = async () => {
      const auth = await checkToken();
      setIsAuthenticated(auth);
      if (!auth) {
        redirect("/login");
      }
    };

    checkAuth();
  }, []);
  return isAuthenticated;
};
