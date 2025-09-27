import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";

const router = express.Router();

// 👉 hauries de tenir `JWT_SECRET` i `BCRYPT_SALT` al teu .env
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// Afegim cookieParser (per assegurar-nos que l'app llegeix cookies)
router.use(cookieParser());

// 🟢 LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Falten camps" });

    // 🔍 Busca usuari a la DB
    const user = await req.db.users.findOne({ email }); // 👈 adapta-ho a la teva DB
    if (!user) return res.status(401).json({ error: "Credencials incorrectes" });

    // 🔐 Comprova password amb bcrypt
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Credencials incorrectes" });

    // 🎟️ Genera JWT
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    // 🍪 Envia cookie HttpOnly + Secure
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,        // ✅ actiu a Render (HTTPS)
      sameSite: "lax",
      maxAge: 2 * 60 * 60 * 1000 // 2h
    });

    res.json({ success: true });
  } catch (e) {
    console.error("Error a /login:", e);
    res.status(500).json({ error: "Error intern" });
  }
});

// 🟡 ME → comprova sessió
router.get("/me", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "No autenticat" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ id: decoded.id, role: decoded.role });
  } catch (e) {
    res.status(401).json({ error: "Token invàlid o expirat" });
  }
});

// 🔴 LOGOUT
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true });
});

export default router;
