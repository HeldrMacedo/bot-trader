export const registerUser = async (name, email, password, phone) => {
  const response = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, phone }),
  });
  return response;
};

export const userLogin = async (email, password) => {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (response.ok) {
    localStorage.setItem("access_token", data.token);
  }
  return { response, data };
};

export const checkToken = async () => {
  const token = localStorage.getItem("access_token");
  try {
    const response = await fetch("/api/check-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();

    if (response.ok) {
      return data.user;
    } else {
      console.error("Erro:", data.message);
      localStorage.removeItem("token");
      return false;
    }
  } catch (error) {
    console.error("Erro ao verificar o token:", error);
  }
};

export const getUser = async () => {
  const user = await checkToken();
  return user;
}
