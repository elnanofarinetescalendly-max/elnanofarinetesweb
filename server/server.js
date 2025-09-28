import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const __dirname = path.resolve();
const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// 🔓 CORS (posa aquí el domini de Vercel)
app.use(cors({
  origin: ["https://elnanofarinetesweb.vercel.app"],
  credentials: true
}));
app.options("*", cors()); // preflight
app.use(express.json());
app.use(cookieParser());

// -------------------------
// Usuari ADMIN (mock DB)
// -------------------------
const adminUser = {
  id: 1,
  email: "admin@elnanofarinetes.com",
  role: "admin",
  // Hash de "1234" generat amb bcrypt (cost=10)
  passwordHash: "$2b$10$1gGVrxOGD9Kmt8vXZOr/auUePfr6EqPSmbizp1tM4LpTZ6gFTwNRu"
};

// -------------------------
// Helpers tallers (fitxer JSON)
// -------------------------
const TALLERS_PATH = path.join(__dirname, "tallers.json");

function carregarTallers() {
  try {
    const raw = fs.existsSync(TALLERS_PATH) ? fs.readFileSync(TALLERS_PATH, "utf8").trim() : "[]";
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Error carregant tallers:", e);
    return [];
  }
}
function desaTallers(arr) {
  fs.writeFileSync(TALLERS_PATH, JSON.stringify(arr, null, 2));
}
let tallers = carregarTallers();

// -------------------------
// Middleware auth
// -------------------------
function requireAdmin(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "No autenticat" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") return res.status(403).json({ error: "No autoritzat" });
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Sessió invàlida o expirada" });
  }
}

// -------------------------
// Rutes diagnòstic
// -------------------------
app.get("/", (_req, res) => res.send("API en marxa ✅"));
app.get("/healthz", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// -------------------------
// Autenticació JWT
// -------------------------
/* app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Falten camps" });

  // comprovar si email coincideix amb l’admin
  if (email !== adminUser.email) {
    return res.status(401).json({ error: "Credencials incorrectes" });
  }

  // validar contrasenya amb bcrypt
  const ok = await bcrypt.compare(password, adminUser.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Credencials incorrectes" });
  }

  // generar JWT
  const token = jwt.sign({ id: adminUser.id, role: adminUser.role }, JWT_SECRET, { expiresIn: "2h" });
  
  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 2 * 60 * 60 * 1000
  });
  return res.json({ success: true });
});*/
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Falten camps" });

  // Validació directa (sense bcrypt)
  if (email !== "admin@elnanofarinetes.com" || password !== "1234") {
    return res.status(401).json({ error: "Credencials incorrectes" });
  }

  const token = jwt.sign({ id: 1, role: "admin" }, JWT_SECRET, { expiresIn: "2h" });
  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 2 * 60 * 60 * 1000
  });
  return res.json({ success: true });
});


app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/"
  });
  res.json({ success: true, token });
});

app.get("/api/auth/me", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "No autenticat" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json(decoded);
  } catch {
    res.status(401).json({ error: "Sessió invàlida" });
  }
});

// -------------------------
// API Tallers
// -------------------------
app.get("/api/tallers", (_req, res) => res.json(tallers));

app.post("/api/tallers", requireAdmin, (req, res) => {
  const { titol, descripcio, data, placesDisponibles, enllacReserva, calendlyUri } = req.body || {};
  const nou = {
    id: Date.now(),
    titol,
    descripcio,
    data,
    placesDisponibles: parseInt(placesDisponibles) || 0,
    enllacReserva: enllacReserva || "",
    calendlyUri: calendlyUri || null,
    inscrits: []
  };
  tallers.push(nou);
  desaTallers(tallers);
  res.status(201).json(nou);
});

app.put("/api/tallers/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const i = tallers.findIndex(t => t.id === id);
  if (i === -1) return res.status(404).json({ error: "Taller no trobat" });
  const { titol, descripcio, data, placesDisponibles, enllacReserva, inscrits } = req.body || {};
  if (titol !== undefined) tallers[i].titol = titol;
  if (descripcio !== undefined) tallers[i].descripcio = descripcio;
  if (data !== undefined) tallers[i].data = data;
  if (placesDisponibles !== undefined) tallers[i].placesDisponibles = parseInt(placesDisponibles) || 0;
  if (enllacReserva !== undefined) tallers[i].enllacReserva = enllacReserva;
  if (inscrits !== undefined) tallers[i].inscrits = inscrits;
  desaTallers(tallers);
  res.json(tallers[i]);
});

app.delete("/api/tallers/:id", requireAdmin, (req, res) => {
  const n = tallers.length;
  tallers = tallers.filter(t => t.id !== Number(req.params.id));
  if (tallers.length === n) return res.status(404).json({ error: "Taller no trobat" });
  desaTallers(tallers);
  res.status(204).send();
});

// -------------------------
// API Productes
// -------------------------
let products = [
  { id: 1, name_ca: "Carxofes", name_es: "Alcachofas", price_cents: 450, stock: 10, is_active: true },
  { id: 2, name_ca: "Calçots", name_es: "Calçots", price_cents: 600, stock: 5, is_active: true }
];

// Públic
app.get("/api/products", (_req, res) => {
  res.json(products.filter(p => p.is_active));
});

// Admin CRUD
app.get("/api/admin/products", requireAdmin, (_req, res) => res.json(products));

app.get("/api/admin/products/:id", requireAdmin, (req, res) => {
  const p = products.find(x => x.id === Number(req.params.id));
  if (!p) return res.status(404).json({ error: "Producte no trobat" });
  res.json(p);
});

app.post("/api/admin/products", requireAdmin, (req, res) => {
  const { name_ca, name_es, price_cents, stock, image_url, is_active } = req.body;
  const nou = {
    id: Date.now(),
    name_ca, name_es,
    price_cents,
    stock,
    image_url: image_url || null,
    is_active: is_active ?? true
  };
  products.push(nou);
  res.status(201).json(nou);
});

app.patch("/api/admin/products/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const p = products.find(x => x.id === id);
  if (!p) return res.status(404).json({ error: "Producte no trobat" });
  const { name_ca, name_es, price_cents, stock, image_url, is_active, toggleActive } = req.body;
  if (toggleActive !== undefined) p.is_active = !p.is_active;
  if (name_ca !== undefined) p.name_ca = name_ca;
  if (name_es !== undefined) p.name_es = name_es;
  if (price_cents !== undefined) p.price_cents = price_cents;
  if (stock !== undefined) p.stock = stock;
  if (image_url !== undefined) p.image_url = image_url;
  if (is_active !== undefined) p.is_active = is_active;
  res.json(p);
});

// -------------------------
// Webhook Calendly
// -------------------------
app.post("/api/webhook/calendly", (req, res) => {
  try {
    const event = req.body;
    console.log("Webhook rebut:", JSON.stringify(event, null, 2));
    // ... el teu codi de gestió
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Error webhook:", err);
    res.status(500).json({ error: "Error processant webhook" });
  }
});

// -------------------------
// Arrencar
// -------------------------
app.listen(PORT, () => console.log(`✅ Servidor actiu al port ${PORT}`));





