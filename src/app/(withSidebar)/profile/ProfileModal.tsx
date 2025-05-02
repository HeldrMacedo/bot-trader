"use client";
import { useState, useEffect } from "react";
import { User } from "@prisma/client";
import { toast } from "react-toastify";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    currentPassword: string;
    newPassword: string;
  }) => void;
  userData: User | null;
}

export default function ProfileModal({
  isOpen,
  onClose,
  onSubmit,
  userData,
}: ProfileModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
  });

  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name,
        email: userData.email,
        currentPassword: "",
        newPassword: "",
      });
    }
  }, [userData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== "" && formData.newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    onSubmit({
      name: formData.name,
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black text-gray-800 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Atualizar Perfil</h2>

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
              disabled
              className="w-full p-2 border rounded-md bg-gray-100"
              value={formData.email}
            />
            <p className="text-xs text-gray-500 mt-1">
              O email não pode ser alterado
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Senha Atual</label>
            <input
              type="password"
              className="w-full p-2 border rounded-md"
              value={formData.currentPassword}
              onChange={(e) =>
                setFormData({ ...formData, currentPassword: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Nova Senha</label>
            <input
              type="password"
              className="w-full p-2 border rounded-md"
              value={formData.newPassword}
              onChange={(e) =>
                setFormData({ ...formData, newPassword: e.target.value })
              }
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">
              Deixe em branco para manter a senha atual
            </p>
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
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}