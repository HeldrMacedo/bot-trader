"use client";

import { useState } from "react";
import { toast } from "react-toastify";

export default function ForgotPasswordModal({ isOpen, onClose }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const response = await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (response.ok) {
      toast.success(data.message);
      onClose();
    } else {
      toast.error(data.message || "Erro ao enviar email.");
    }

    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-md shadow-md w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">
          Esqueci minha senha
        </h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Digite seu email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border p-2 rounded mb-4 text-gray-700"
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded w-full"
            disabled={loading}
          >
            {loading ? "Enviando..." : "Enviar lembrete"}
          </button>
        </form>
        <button
          onClick={onClose}
          className="text-sm text-gray-500 mt-4 block w-full text-center"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
