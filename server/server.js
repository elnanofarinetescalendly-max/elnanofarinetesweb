// server/server.js
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
app.set('trust proxy', 1);                 // <- necessari a Render
const PORT = process.env.PORT || 3000;
const TALLERS_PATH = path.join(__dirname, 'tallers.json');

// CORS (durant proves permet qualsevol origen). Després limita-ho al domini del teu frontend.
app.use(cors({ 
  origin: ['https://elnanofarinetesweb.vercel.app'], 
  credentials: true }));

app.use(express.json());

// Sessió (cookies cross-site)
app.use(session({
  secret: 'clau-super-secreta',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,                          // Render és HTTPS
    sameSite: 'none'                       // perquè funcioni des d’un altre domini
  }
}));

// Helpers tallers
function carregarTallers() {
  try {
    const raw = fs.existsSync(TALLERS_PATH) ? fs.readFileSync(TALLERS_PATH, 'utf8').trim() : '[]';
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error carregant tallers:', e);
    return [];
  }
}
function desaTallers(arr) { fs.writeFileSync(TALLERS_PATH, JSON.stringify(arr, null, 2)); }
let tallers = carregarTallers();

// Auth bàsica
const usuariAdmin = { usuari: 'admin', contrasenya: '1234' };
function autentificat(req, res, next) { return req.session?.autenticat ? next() : res.status(401).json({ missatge: 'No autoritzat' }); }

// Rutes diagnòstic
app.get('/', (_req, res) => res.send('API en marxa ✅'));
app.get('/healthz', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Login / logout / sessió
app.post('/api/login', (req, res) => {
  const { usuari, contrasenya } = req.body || {};
  if (usuari === usuariAdmin.usuari && contrasenya === usuariAdmin.contrasenya) {
    req.session.autenticat = true;
    return res.json({ missatge: 'Login correcte' });
  }
  return res.status(401).json({ missatge: 'Credencials incorrectes' });
});
app.post('/api/logout', (req, res) => { req.session.destroy(() => res.json({ missatge: 'Sessió tancada' })); });
app.get('/api/session', (req, res) => res.status(req.session?.autenticat ? 200 : 401).json({ autenticat: !!req.session?.autenticat }));

// API tallers
app.get('/api/tallers', (_req, res) => res.json(tallers));
app.post('/api/tallers', autentificat, (req, res) => {
  const { titol, descripcio, data, placesDisponibles, enllacReserva, calendlyUri } = req.body || {};
  const nou = {
    id: Date.now(),
    titol, descripcio, data,
    placesDisponibles: parseInt(placesDisponibles) || 0,
    enllacReserva: enllacReserva || '',
    calendlyUri: calendlyUri || null,
    inscrits: []
  };
  tallers.push(nou); desaTallers(tallers);
  res.status(201).json(nou);
});
app.put('/api/tallers/:id', autentificat, (req, res) => {
  const id = Number(req.params.id);
  const i = tallers.findIndex(t => t.id === id);
  if (i === -1) return res.status(404).json({ missatge: 'Taller no trobat' });
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
app.delete('/api/tallers/:id', autentificat, (req, res) => {
  const n = tallers.length;
  tallers = tallers.filter(t => t.id !== Number(req.params.id));
  if (tallers.length === n) return res.status(404).json({ missatge: 'Taller no trobat' });
  desaTallers(tallers);
  res.status(204).send();
});

// Estàtics (public/admin són germanes de server → fem ..)
  // app.use(express.static(path.join(__dirname, '..', 'public')));
  // app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// 404
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.status(404).send('Not found');
});

app.listen(PORT, () => console.log(`Servidor actiu al port ${PORT}`));
// 📩 Webhook de Calendly
app.post('/api/webhook/calendly', (req, res) => {
    try {
        const event = req.body;

        console.log("Webhook rebut:", JSON.stringify(event, null, 2));

        // Exemple: quan hi ha un event "invitee.created"
        if (event.event === "invitee.created") {
            const email = event.payload.email;
            const nom = event.payload.name;
            const eventUri = event.payload.event;

            // Aquí has de tenir alguna manera de mapejar l'event de Calendly → id del taller
            // Exemple simple: buscar per titol si coincideix amb eventUri o notes
            const index = tallers.findIndex(t => eventUri.includes(t.titol));
            if (index !== -1 && tallers[index].placesDisponibles > 0) {
                tallers[index].placesDisponibles--;
                if (!tallers[index].inscrits) tallers[index].inscrits = [];
                tallers[index].inscrits.push(nom || email);
                desaTallers(tallers);
            }
        }

        res.status(200).json({ ok: true });
    } catch (err) {
        console.error("Error webhook:", err);
        res.status(500).json({ error: "Error processant webhook" });
    }
});

const CALENDLY_TOKEN = process.env.CALENDLY_TOKEN; // 👈 posa’l a Render com a secret
const ORGANIZATION = "https://api.calendly.com/scheduled_events?organization=https://api.calendly.com/organizations/361ec01e-2b96-429b-9a42-bf29871ac073"; // 👈 el teu

async function syncCalendly() {
  try {
    const res = await fetch(`https://api.calendly.com/scheduled_events?organization=${encodeURIComponent(ORGANIZATION)}`, {
      headers: {
        "Authorization": `Bearer ${CALENDLY_TOKEN}`,
        "Content-Type": "application/json"
      }
    });

    const data = await res.json();

    if (data.collection) {
      console.log("📅 Esdeveniments de Calendly trobats:", data.collection.length);

      data.collection.forEach(ev => {
        const titol = ev.name;
        const dataEv = ev.start_time.split("T")[0];

        // Buscar si existeix al JSON de tallers
        const index = tallers.findIndex(t => t.calendlyUri && ev.uri.includes(t.calendlyUri));
        if (index !== -1) {
          // 👇 Exemple: marcar que almenys hi ha una reserva
          tallers[index].inscrits = tallers[index].inscrits || [];
          if (!tallers[index].inscrits.includes("Calendly")) {
            tallers[index].inscrits.push("Calendly");
            if (tallers[index].placesDisponibles > 0) {
              tallers[index].placesDisponibles--;
            }
            desaTallers(tallers);
          }
        }
      });
    }
  } catch (err) {
    console.error("❌ Error sincronitzant amb Calendly:", err);
  }
}
// Executa cada 5 minuts
setInterval(syncCalendly, 5 * 60 * 1000);

// Opcional: sincronitzar un cop en arrencar
syncCalendly();






