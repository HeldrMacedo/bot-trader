"use client";

import { useEffect, useState } from "react";
import { redirect, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { checkToken, registerUser, userLogin } from "../services/userService";
import Image from "next/image";
import ForgotPasswordModal from "./components/ForgotPasswordModal";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("access_token");
      if (token) {
        const isAuthenticated = await checkToken(token);
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
    <div className="min-h-screen flex">
      <div className="flex w-full md:w-1/3  justify-center p-6">
        <div className="w-full max-w-md">
          <Image
            src="/img/form-login.png"
            alt="Imagem Login"
            width={500}
            height={500}
            className="w-full h-auto max-w-[500px] mx-auto rounded-lg shadow-md"
            sizes="(max-width: 768px) 100vw, 50vw"
          />

          <div className="w-full max-w-md mt-5">
            <h1 className="text-[#36344D] text-3xl font-semibold text-center">
              {isRegistering ? "Cadastro" : "Login"}
            </h1>
            {error && <p className="text-red-500 text-center mb-4">{error}</p>}
            {isRegistering ? (
              <form onSubmit={handleRegister} className="space-y-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm/6 font-medium text-gray-900"
                  >
                    Nome:
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="block w-full rounded-md px-3 border border-gray-300 py-1.5 text-base text-gray-900 outline-none focus:outline-none focus:border-indigo-600 placeholder:text-gray-400 sm:text-sm/6"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm/6 font-medium text-gray-900"
                  >
                    Email:
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-md px-3 border border-gray-300 py-1.5 text-base text-gray-900 outline-none focus:outline-none focus:border-indigo-600 placeholder:text-gray-400 sm:text-sm/6"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="telephone"
                    className="block text-sm/6 font-medium text-gray-900"
                  >
                    Telefone para contato:
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="block w-full rounded-md px-3 border border-gray-300 py-1.5 text-base text-gray-900 outline-none focus:outline-none focus:border-indigo-600 placeholder:text-gray-400 sm:text-sm/6"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm/6 font-medium text-gray-900"
                  >
                    Senha:
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-md px-3 border border-gray-300 py-1.5 text-base text-gray-900 outline-none focus:outline-none focus:border-indigo-600 placeholder:text-gray-400 sm:text-sm/6"
                    required
                  />
                </div>
                <button className="flex w-full justify-center rounded-md bg-green-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600">
                  Cadastrar
                </button>
                <p className="mt-10 text-center text-sm/6 text-gray-500">
                  <a
                    href="javascript:void(0)"
                    onClick={() => setIsRegistering(false)}
                    className="font-semibold text-indigo-600 hover:text-indigo-500 inline-flex items-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5 mr-2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.75 15.75 3 12m0 0 3.75-3.75M3 12h18"
                      />
                    </svg>
                    Voltar para login
                  </a>
                </p>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm/6 font-medium text-gray-900"
                  >
                    Email:
                  </label>
                  <div className="mt-2">
                    <input
                      id="email"
                      value={email}
                      name="email"
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      required
                      autoComplete="email"
                      className="block w-full rounded-md px-3 border border-gray-300 py-1.5 text-base text-gray-900 outline-none focus:outline-none focus:border-indigo-600 placeholder:text-gray-400 sm:text-sm/6"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-sm/6 font-medium text-gray-900"
                    >
                      Senha
                    </label>
                    <div className="text-sm">
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowForgotPassword(true);
                        }}
                        className="font-semibold text-indigo-600 hover:text-indigo-500"
                      >
                        Esqueceu a senha?
                      </a>
                    </div>
                  </div>
                  <div className="mt-2">
                    <input
                      id="password"
                      value={password}
                      name="password"
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                      required
                      autoComplete="current-password"
                      className="block w-full rounded-md px-3 border border-gray-300 py-1.5 text-base text-gray-900 outline-none focus:outline-none focus:border-indigo-600 placeholder:text-gray-400 sm:text-sm/6"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  >
                    Entrar
                  </button>
                </div>
                <p className="mt-10 text-center text-sm/6 text-gray-500">
                  Novo usuário?{" "}
                  <a
                    href="javascript:void(0)"
                    onClick={() => setIsRegistering(true)}
                    className="font-semibold text-indigo-600 hover:text-indigo-500"
                  >
                    Crie sua conta
                  </a>
                </p>
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
      </div>
      <div className="hidden md:flex w-2/3 relative">
        <Image
          src="/img/background-login-2.jpg"
          alt="Imagem lateral"
          layout="fill"
          objectFit="cover"
        />
      </div>
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
}
