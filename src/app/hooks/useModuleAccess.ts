import { useEffect, useState } from "react";
import { getUser } from "@/app/services/userService";

export function useModuleAccess(moduleName: string) {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await getUser();
      setUser(userData);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user?.id) {
        setHasAccess(false);
        return;
      }

      try {
        const token = localStorage.getItem("access_token") || "";
        const response = await fetch(`/api/user-modules?userId=${user.id}&token=${token}`);
        const data = await response.json();
        
        if (data.userModules) {
          const hasModule = data.userModules.some(
            (um: any) => um.module.name === moduleName && um.isActive
          );
          setHasAccess(hasModule);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error checking module access:", error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [user?.id, moduleName]);

  return { hasAccess, loading };
}