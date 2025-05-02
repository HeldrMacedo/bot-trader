export const updateUserProfile = async (name, currentPassword, newPassword) => {
    const token = localStorage.getItem("access_token");
    
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ 
        name, 
        currentPassword, 
        newPassword 
      }),
    });
    
    return response;
  };