// admin/guard.js
document.addEventListener("DOMContentLoaded", async () => {
  // Evita bucle infinit si ja estàs al login
  if (window.location.pathname.endsWith("/admin/login.html")) return;

  try {
    const res = await fetch("https://elnanofarinetes-server.onrender.com/api/auth/me", {
      credentials: "include"
    });

    if (!res.ok) {
      // ❌ No autenticat → enviar al login amb ?next
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/admin/login.html?next=${next}`;
      return;
    }

    const user = await res.json();

    if (user.role !== "admin") {
      alert("No tens permisos per accedir a aquesta pàgina");
      window.location.href = "/";
      return;
    }

    console.log("✅ Sessió vàlida:", user);
  } catch (err) {
    console.error("❌ Error comprovant sessió:", err);
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/admin/login.html?next=${next}`;
  }
});


