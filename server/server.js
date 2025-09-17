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
app.use(cors({ origin: true, credentials: true }));
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
  const { titol, descripcio, data, placesDisponibles, enllacReserva } = req.body || {};
  const nou = {
    id: Date.now(),
    titol, descripcio, data,
    placesDisponibles: parseInt(placesDisponibles) || 0,
    enllacReserva: enllacReserva || '',
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




