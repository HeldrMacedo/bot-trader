"use client";

import { useEffect, useState } from "react";
import { redirect, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { checkToken, registerUser, userLogin } from "../services/userService";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("access_token");
      if (token) {
        const isAuthenticated = await checkToken(token);
        console.log("aquifiii", isAuthenticated);
        if (isAuthenticated) {
          redirect("/home");
        }
      }
    };
    checkAuth();
  }, []);

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    const numericValue = value.replace(/\D/g, "");

    let formattedValue = "";
    if (numericValue.length > 0) {
      formattedValue += `(${numericValue.slice(0, 2)}`;
    }
    if (numericValue.length > 2) {
      formattedValue += `)${numericValue.slice(2, 7)}`;
    }
    if (numericValue.length > 7) {
      formattedValue += `-${numericValue.slice(7, 11)}`;
    }

    setPhone(formattedValue);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Por favor, insira um email válido.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    try {
      setIsLoading(true);
      const { response, data } = await userLogin(email, password);

      if (response.ok) {
        toast.success("Login realizado com sucesso!");
        router.push("/home");
      } else {
        setError(data.message || "Erro ao fazer login.");
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Por favor, insira um email válido.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (name.trim() === "") {
      setError("Por favor, insira um nome.");
      return;
    }

    const phoneRegex = /^\(\d{2}\)\d{5}-\d{4}$/;
    if (!phoneRegex.test(phone)) {
      setError("Por favor, insira um telefone no formato (XX)XXXXX-XXXX.");
      return;
    }

    try {
      setIsLoading(true);
      const response = await registerUser(name, email, password, phone);

      const data = await response.json();
      console.log(response);
      if (response.ok) {
        toast.success("Cadastro realizado com sucesso!");
        setIsRegistering(false);
        setEmail("");
        setPassword("");
        setName("");
        setError("");
        setPhone("");
      } else {
        setError(data.message || "Erro ao cadastrar usuário.");
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative">
      {/* <div className="absolute inset-0 z-0">
        <Image
          src="/images/imagemDeFundo.webp"
          alt="imagem de fundo"
          fill
          className="object-cover object-bottom"
        />
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
      </div> */}

      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md z-10">
        <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500 mb-8 z-10 shadow-lg text-center">
          Trade Platform
        </h1>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        {isRegistering ? (
          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nome:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Telefone para contato:
              </label>
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Senha:
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Cadastrar
            </button>
            <button
              type="button"
              onClick={() => setIsRegistering(false)}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Voltar para Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Senha:
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setIsRegistering(true)}
              className="w-full bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
            >
              Novo usuário
            </button>
          </form>
        )}
      </div>

      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-t-transparent border-blue-500 rounded-full animate-spin mb-4"></div>
            <p className="text-white text-lg">Carregando...</p>
          </div>
        </div>
      )}
    </div>
  );
}
