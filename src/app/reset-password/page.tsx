"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const tokenFromURL = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenFromURL);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("As senhas não coincidem.");
      toast.error("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();
    if (res.ok) {
      setMessage("Senha redefinida com sucesso!");
      toast.success("Senha redefinida com sucesso!");
      router.push("/home");
    } else {
      setMessage(data.error || "Token inválido ou expirado.");
      toast.error("Token inválido ou expirado.");
      router.push("/home");
    }

    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded shadow">
      <h1 className="text-2xl font-bold mb-4 text-gray-700">Redefinir Senha</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Token
          </label>
          <input
            type="text"
            className="w-full border px-3 py-2 rounded text-gray-700"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Nova Senha
          </label>
          <input
            type="password"
            className="w-full border px-3 py-2 rounded text-gray-700"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Confirmar Nova Senha
          </label>
          <input
            type="password"
            className="w-full border px-3 py-2 rounded text-gray-700"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? "Enviando..." : "Redefinir"}
        </button>
      </form>
      {/* {message && <p className="mt-4 text-center text-green-600">{message}</p>} */}
    </div>
  );
}
