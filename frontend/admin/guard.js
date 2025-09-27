// admin/guard.js
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("https://elnanofarinetes-server.onrender.com/api/auth/me", {
      credentials: "include"
    });

    if (!res.ok) {
      // ❌ No autenticat → enviar al login
      const next = encodeURIComponent(location.pathname + location.search);
      location.href = `/admin/login.html?next=${next}`;
      return;
    }

    const user = await res.json();

    if (user.role !== "admin") {
      alert("No tens permisos per accedir a aquesta pàgina");
      location.href = "/";
    }

    console.log("✅ Sessió vàlida:", user);
  } catch (err) {
    console.error("❌ Error comprovant sessió:", err);
    location.href = "/admin/login.html";
  }
});

