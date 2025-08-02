"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import {
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  ChevronDownIcon,
  CpuChipIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon,
  UserGroupIcon,
  UserIcon,
  ArrowLeftStartOnRectangleIcon,
  DocumentChartBarIcon,
} from "@heroicons/react/24/outline";
import {
  AccountInfo,
  DerivService,
  TokenData,
} from "@/app/services/DerivService";
import { getUser } from "@/app/services/userService";
import { updateUserProfile } from "@/app/services/profileService";

import ProfileModal from "@/app/(withSidebar)/profile/ProfileModal";
import { toast } from "react-toastify";

const Sidebar = ({
  children,
  auth,
  setAuth,
}: {
  children: React.ReactNode;
  auth: any;
  setAuth: React.Dispatch<React.SetStateAction<any>>;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [accountInfo, setAccountInfo] = useState<TokenData | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // const derivService = DerivService.getInstance();

  // useEffect(() => {
  //   const fethUser = async () => {
  //     const user = await getUser();
  //     if (!user) return;
  //     setAuth(user);
  //   };
  //   fethUser();

  //   const listenerId = derivService.observerInstance.on(
  //     "account.update",
  //     (data: AccountInfo) => {
  //       const accountActive = data.tokens.find(
  //         (tokens) => tokens.token === data?.activeToken
  //       );
  //       if (accountActive) {
  //         setAccountInfo({ ...accountActive });
  //       }
  //     }
  //   );
  //   return () => derivService.observerInstance.removeById(listenerId);
  // }, []);

  const handleProfileUpdate = async (data) => {
    try {
      const response = await updateUserProfile(
        data.name,
        data.currentPassword,
        data.newPassword
      );

      if (response.ok) {
        toast.success("Perfil atualizado com sucesso!");
        const updatedUser = await getUser();
        // @ts-ignore
        if (window.updateUserData) {
          // @ts-ignore
          window.updateUserData();
        }

        setAuth(updatedUser);
        setIsProfileModalOpen(false);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Erro ao atualizar perfil");
      }
    } catch (error) {
      toast.error("Erro ao conectar com o servidor");
      console.error(error);
    }
  };

  const navigation = [
    {
      name: "Dashboard",
      icon: HomeIcon,
      href: "/home",
      role: ["admin", "user"],
    },
    {
      name: "Minha Conta",
      icon: UserIcon,
      href: "/profile",
      role: ["user"],
    },
    {
      name: "Usuários",
      icon: UserGroupIcon,
      href: "/users",
      role: ["admin"],
    },
    {
      name: "Meu Histórico",
      icon: DocumentChartBarIcon,
      href: "/history",
      role: ["user", "admin"],
    },
    {
      name: "Markup Detalhes",
      icon: UserGroupIcon,
      href: "/reports/markup-details",
      role: ["admin"],
    },
    {
      name: "Markup Estatísticas",
      icon: UserGroupIcon,
      href: "/reports/markup-statistics",
      role: ["admin"],
    },
    {
      name: "Operações",
      icon: UserGroupIcon,
      href: "/operations",
      role: ["admin"],
    },
    {
      name: "BotTrader",
      icon: CpuChipIcon,
      href: "/bottrader",
      role: ["admin", "user"],
    },
    {
      name: "BotTrader Demo",
      icon: CpuChipIcon,
      href: "/bottraderdemo",
      role: ["admin", "user"],
    },
    {
      name: "Sair",
      icon: ArrowLeftStartOnRectangleIcon,
      href: "/login",
      role: ["admin", "user"],
    },
  ];

  return (
    <div className="min-h-screen bg-[#0d0a18] w-full">
      {/* Mobile Menu Button deploy1*/}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-5 left-4 p-2 z-30 text-white rounded-lg shadow-sm"
      >
        <Bars3Icon className="w-6 h-6" />
      </button>

      {/* Botão Fechar estilo Tailwind UI */}
      {isOpen && (
        <button
          onClick={() => setIsOpen(false)}
          className="fixed z-50 left-[calc(16rem+1rem)] top-4
              p-2  text-white rounded-lg shadow-sm hover:bg-gray-700
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
          {navigation.map(
            (item) =>
              item?.role.includes(auth?.role) && (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={(e) => {
                    if (item.name === "Minha Conta") {
                      e.preventDefault();
                      setIsProfileModalOpen(true);
                      setIsProfileOpen(false);
                    } else if (item.name === "Sair") {
                      localStorage.removeItem("access_token");
                    }
                  }}
                  className="flex items-center space-x-3 px-3 py-2 rounded-md
                hover:bg-gray-800 hover:text-white group transition-colors"
                >
                  <item.icon className="w-5 h-5 text-gray-400 group-hover:text-white" />
                  <span>{item.name}</span>
                </a>
              )
          )}
        </nav>
      </aside>
      {/* Main Content */}
      <main className="flex-1">
        {/* Header */}
        <header className="bg-principal shadow-sm">
          <div className="flex items-center justify-end px-6 py-4">
            {/* User Profile */}
            <div className="ml-4 relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2  p-2 rounded-lg"
              >
                <UserCircleIcon className="w-8 h-8 text-gray-400" />
                <span className="text-gray-400 text-sm md:text-base">
                  {auth?.name}{" "}
                  {accountInfo && (
                    <span className="text-[#4bb4b3]">
                      {accountInfo?.is_virtual
                        ? "VRTC " +
                          new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(accountInfo?.balance ?? 0)
                        : "CR " +
                          new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(accountInfo?.balance ?? 0)}
                    </span>
                  )}
                </span>
                <ChevronDownIcon className="w-4 h-4 text-gray-400" />
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg
                  border border-gray-200 py-1 z-10"
                >
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsProfileModalOpen(true);
                      setIsProfileOpen(false);
                    }}
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    Minha Conta
                  </a>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="p-2">{children}</div>
      </main>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSubmit={handleProfileUpdate}
        userData={auth}
      />
    </div>
  );
};

export default Sidebar;
