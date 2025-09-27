// /admin/guard.js
(async () => {
  // Opció A (recomanada): backend amb cookie HttpOnly + endpoint /api/auth/me
  try {
    const r = await fetch('https://elnanofarinetes-server.onrender.com/api/auth/me', {
      credentials: 'include'
    });
    if (!r.ok) throw 0;
    const me = await r.json();
    if (!me || me.role !== 'admin') throw 0;
  } catch {
    location.href = '/admin/login.html?next=' + encodeURIComponent(location.pathname);
  }
})();
