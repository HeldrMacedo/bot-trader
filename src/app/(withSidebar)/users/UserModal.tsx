"use client";
import { useState, useEffect } from "react";
import { User } from "@prisma/client";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    data: Omit<User, "id" | "createdAt" | "updatedAt" | "deletedAt">
  ) => void;
  initialData?: User | null;
}

export default function UserModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: UserModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "user" as "user" | "admin",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        email: initialData.email,
        phone: initialData.phone,
        password: "",
        role: initialData.role as "user" | "admin",
      });
    }
  }, [initialData]);

  const handleRoleChange = (role: "user" | "admin") => {
    setFormData((prev) => ({
      ...prev,
      role,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {initialData ? "Editar Usuário" : "Novo Usuário"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <input
              type="text"
              required
              className="w-full p-2 border rounded-md"
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
              className="w-full p-2 border rounded-md"
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
              className="w-full p-2 border rounded-md"
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
              className="w-full p-2 border rounded-md"
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
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="role"
                  checked={formData.role === "user"}
                  onChange={() => handleRoleChange("user")}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Usuário
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="role"
                  checked={formData.role === "admin"}
                  onChange={() => handleRoleChange("admin")}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Administrador
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {initialData ? "Salvar Alterações" : "Cadastrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
