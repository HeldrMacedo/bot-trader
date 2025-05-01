"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import {
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon,
  UserGroupIcon,
  UserIcon,
  ArrowLeftStartOnRectangleIcon,
  DocumentChartBarIcon,
} from "@heroicons/react/24/outline";
import { AccountInfo, DerivService, TokenData } from "@/app/services/DerivService";
import { getUser } from "@/app/services/userService";

const Sidebar = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [accountInfo, setAccountInfo] = useState<TokenData | null>(null);
  const [auth, setAuth] = useState(null);
 
  const derivService = DerivService.getInstance();

  useEffect(() => {
    const fethUser = async () => {
      const user = await getUser();
      if (!user) return;
      setAuth(user);
    };
    fethUser();

    const listenerId = derivService.observerInstance.on("account.update", (data: AccountInfo) => {
      const accountActive = data.tokens.find((tokens) => tokens.token === data?.activeToken);
      setAccountInfo(accountActive);
    });
    return () => derivService.observerInstance.removeById(listenerId);
  }, []);

  const navigation = [
    { name: "Dashboard", icon: HomeIcon, href: "/home" },
    { name: "Minha Conta", icon: UserIcon, href: "/profile" },
    { name: "Meu Histórico", icon: DocumentChartBarIcon, href: "/history" },
    { name: "Usuários", icon: UserGroupIcon, href: "/users" },
    { name: "Sair", icon: ArrowLeftStartOnRectangleIcon, href: "/login" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 w-full">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-5 left-4 p-2 z-30 text-[oklch(0.373_0.034_259.733)] rounded-lg shadow-sm"
      >
        <Bars3Icon className="w-6 h-6" />
      </button>

      {/* Botão Fechar estilo Tailwind UI */}
      {isOpen && (
        <button
          onClick={() => setIsOpen(false)}
          className="fixed z-50 left-[calc(16rem+1rem)] top-4
              p-2  text-[oklch(0.373_0.034_259.733)] rounded-lg shadow-sm hover:bg-gray-700
              transition-colors duration-200"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
      )}

      {/* Sidebar */}

      <aside
        className={`${isOpen ? "translate-x-0" : "-translate-x-full"} 
         fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 text-gray-300
        transition-transform duration-300 ease-in-out overflow-y-auto`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <span className="text-xl font-semibold text-white">
            Trade Platform
          </span>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-4 space-y-1">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              onClick={() =>
                item.name === "Sair" && localStorage.removeItem("access_token")
              }
              className="flex items-center space-x-3 px-3 py-2 rounded-md
                hover:bg-gray-800 hover:text-white group transition-colors"
            >
              <item.icon className="w-5 h-5 text-gray-400 group-hover:text-white" />
              <span>{item.name}</span>
            </a>
          ))}
        </nav>
      </aside>
      {/* Main Content */}
      <main className="flex-1">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-end px-6 py-4">
            {/* Search Bar */}
            {/* <div className="flex-1 max-w-2xl">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg
                    focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div> */}

            {/* User Profile */}
            <div className="ml-4 relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2 hover:bg-gray-50 p-2 rounded-lg"
              >
                <UserCircleIcon className="w-8 h-8 text-gray-400" />
                <span className="text-gray-700 text-sm md:text-base">
                  {auth?.name}{" "}
                  <span className="text-[#4bb4b3]">
                    {accountInfo?.is_virtual
                      ? "VRTC " +
                        new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(accountInfo?.balance)
                      : "CR " +
                        new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(accountInfo?.balance)}
                  </span>
                </span>
                <ChevronDownIcon className="w-4 h-4 text-gray-400" />
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg
                  border border-gray-200 py-1"
                >
                  <a
                    href="#"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    Your Profile
                  </a>
                  <a
                    href="#"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    Settings
                  </a>
                  <a
                    href="#"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    Sign out
                  </a>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="p-2">{children}</div>
      </main>
    </div>
  );
};

export default Sidebar;
