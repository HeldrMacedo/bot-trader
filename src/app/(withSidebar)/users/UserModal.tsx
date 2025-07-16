"use client";
import { useState, useEffect } from "react";
import { User } from "@prisma/client";

interface Module {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

interface UserWithModules extends User {
  userModules?: {
    id: number;
    moduleId: number;
    isActive: boolean;
    module: Module;
  }[];
}

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    data: Omit<User, "id" | "createdAt" | "updatedAt" | "deletedAt">,
    modules: number[]
  ) => void;
  initialData?: UserWithModules | null;
  availableModules: Module[];
}

export default function UserModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  availableModules,
}: UserModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "user" as "user" | "admin",
    hiddenInfo: false,
    passwordToken: "",
    tokenSentAt: null,
  });

  const [selectedModules, setSelectedModules] = useState<number[]>([]);

  useEffect(() => {
    if (initialData) {
      console.log("initialData", initialData);
      setFormData({
        name: initialData.name,
        email: initialData.email,
        phone: initialData.phone,
        password: "",
        role: initialData.role as "user" | "admin",
        hiddenInfo: false,
        passwordToken: "",
        tokenSentAt: null,
      });

      const userModuleIds = initialData.userModules
        ?.filter(um => um.isActive)
        ?.map(um => um.moduleId) || [];
      setSelectedModules(userModuleIds);
    } else {
      setSelectedModules([]);
    }
  }, [initialData]);

  const handleRoleChange = (role: "user" | "admin") => {
    setFormData((prev) => ({
      ...prev,
      role,
    }));
  };

  const handleModuleChange = (moduleId: number, checked: boolean) => {
    setSelectedModules(prev => {
      if (checked) {
        return [...prev, moduleId];
      } else {
        return prev.filter(id => id !== moduleId);
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData, selectedModules);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {initialData ? "Editar Usuário" : "Novo Usuário"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <input
              type="text"
              required
              className="w-full p-2 border rounded-md bg-gray-800 border-gray-300 text-gray-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm/6"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full p-2 border rounded-md bg-gray-800 border-gray-300 text-gray-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm/6"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Telefone</label>
            <input
              type="tel"
              required
              className="w-full p-2 border rounded-md bg-gray-800 border-gray-300 text-gray-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm/6"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              pattern="\(?\d{2}\)?[\s-]?9?\d{4}-?\d{4}"
              placeholder="(99) 99999-9999"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Senha</label>
            <input
              type="password"
              required={!initialData}
              className="w-full p-2 border rounded-md bg-gray-800 border-gray-300 text-gray-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm/6"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              minLength={6}
            />
          </div>

          <div>
            <span className="block text-sm font-medium mb-1">
              Tipo de usuário
            </span>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="relative flex items-center">
                  <input
                    type="radio"
                    name="role"
                    checked={formData.role === "user"}
                    onChange={() => handleRoleChange("user")}
                    className="sr-only"
                  />
                  <div className="w-5 h-5 border-2 border-gray-400 rounded-full flex items-center justify-center">
                    {formData.role === "user" && (
                      <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    )}
                  </div>
                </div>
                <span className="text-gray-300">Usuário</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <div className="relative flex items-center">
                  <input
                    type="radio"
                    name="role"
                    checked={formData.role === "admin"}
                    onChange={() => handleRoleChange("admin")}
                    className="sr-only"
                  />
                  <div className="w-5 h-5 border-2 border-gray-400 rounded-full flex items-center justify-center">
                    {formData.role === "admin" && (
                      <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    )}
                  </div>
                </div>
                <span className="text-gray-300">Administrador</span>
                <div className="flex items-center ml-2">
                  <input
                    type="checkbox"
                    name="info"
                    checked={formData.hiddenInfo}
                    onChange={(e) =>
                      setFormData({ ...formData, hiddenInfo: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-300 text-sm">
                    Ocultar informações
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium mb-3">
              Módulos
            </span>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {availableModules.map((module) => (
                <label key={module.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedModules.includes(module.id)}
                    onChange={(e) => handleModuleChange(module.id, e.target.checked)}
                    className="w-4 h-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-300 text-sm">
                    {module.name}
                  </span>
                  {module.description && (
                    <span className="text-gray-500 text-xs">
                      ({module.description})
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="login-button flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              {initialData ? "Salvar Alterações" : "Cadastrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
