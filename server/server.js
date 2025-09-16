
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
app.set('trust proxy', 1); // << IMPORTANT a Render

const PORT = process.env.PORT || 3000;
const TALLERS_PATH = path.join(__dirname, 'tallers.json');

// CORS (durant proves)
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Sessió
app.use(session({
  secret: 'clau-super-secreta',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,      // https a Render
    sameSite: 'none'   // cross-site cookies
  }
}));

// Usuari admin
const usuariAdmin = { usuari: 'admin', contrasenya: '1234' };

function autentificat(req, res, next) {
  if (req.session?.autenticat) return next();
  return res.status(401).json({ missatge: 'No autoritzat' });
}

// Rutes diagnòstic
app.get('/', (_req, res) => res.send('API en marxa ✅'));
app.get('/healthz', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Carrega/desa tallers
function carregarTallers() {
  try {
    const dades = fs.existsSync(TALLERS_PATH) ? fs.readFileSync(TALLERS_PATH, 'utf-8').trim() : '[]';
    return dades ? JSON.parse(dades) : [];
  } catch (error) {
    console.error('Error carregant tallers:', error);
    return [];
  }
}
function desaTallers(tallers) {
  fs.writeFileSync(TALLERS_PATH, JSON.stringify(tallers, null, 2));
}
let tallers = carregarTallers();

// API auth
app.post('/api/login', (req, res) => {
  const { usuari, contrasenya } = req.body || {};
  if (usuari === usuariAdmin.usuari && contrasenya === usuariAdmin.contrasenya) {
    req.session.autenticat = true;
    return res.json({ missatge: 'Login correcte' });
  }
  return res.status(401).json({ missatge: 'Credencials incorrectes' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ missatge: 'Sessió tancada' }));
});

app.get('/api/session', (req, res) => {
  res.status(req.session?.autenticat ? 200 : 401).json({ autenticat: !!req.session?.autenticat });
});

// API tallers
app.get('/api/tallers', (_req, res) => res.json(tallers));

app.post('/api/tallers', autentificat, (req, res) => {
  const { titol, descripcio, data, placesDisponibles, enllacReserva } = req.body || {};
  const nouTaller = {
    id: Date.now(),
    titol, descripcio, data,
    placesDisponibles: parseInt(placesDisponibles) || 0,
    enllacReserva: enllacReserva || '',
    inscrits: []
  };
  tallers.push(nouTaller);
  desaTallers(tallers);
  res.status(201).json(nouTaller);
});

app.put('/api/tallers/:id', autentificat, (req, res) => {
  const id = Number(req.params.id);
  const idx = tallers.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ missatge: 'Taller no trobat' });

  const { titol, descripcio, data, placesDisponibles, enllacReserva, inscrits } = req.body || {};
  if (titol !== undefined) tallers[idx].titol = titol;
  if (descripcio !== undefined) tallers[idx].descripcio = descripcio;
  if (data !== undefined) tallers[idx].data = data;
  if (placesDisponibles !== undefined) tallers[idx].placesDisponibles = parseInt(placesDisponibles) || 0;
  if (enllacReserva !== undefined) tallers[idx].enllacReserva = enllacReserva;
  if (inscrits !== undefined) tallers[idx].inscrits = inscrits;

  desaTallers(tallers);
  res.json(tallers[idx]);
});

app.delete('/api/tallers/:id', autentificat, (req, res) => {
  const id = Number(req.params.id);
  const prev = tallers.length;
  tallers = tallers.filter(t => t.id !== id);
  if (tallers.length === prev) return res.status(404).json({ missatge: 'Taller no trobat' });
  desaTallers(tallers);
  res.status(204).send();
});

// Estàtics (usa aquest bloc si public/admin estan FORA de server/)
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// 404
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.status(404).send('Not found');
});

app.listen(PORT, () => {
  console.log(`Servidor actiu al port ${PORT}`);
});



