
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const TALLERS_PATH = path.join(__dirname, 'tallers.json');

const app = express();
const PORT = 3000;

// 🔧 Configura el middleware
app.use(cors({
    origin: ['https://elnanofarinetes-server.onrender.com'], // Canvia-ho si el teu frontend és en un altre port
    credentials: true
}));
app.use(express.json());
app.use(session({
    secret: 'clau-super-secreta', // Canvia-ho en producció
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: true,
        sameSite: 'none'
    } // Posar true si uses HTTPS
}));

// 🔐 Usuari administrador
const usuariAdmin = { usuari: 'admin', contrasenya: '1234' };

// 🔐 Middleware per protegir rutes
function autentificat(req, res, next) {
    if (req.session?.autenticat) next();
    else res.status(401).json({ missatge: 'No autoritzat' });
}

// 🔓 Login
app.post('/api/login', (req, res) => {
    const { usuari, contrasenya } = req.body;
    if (usuari === usuariAdmin.usuari && contrasenya === usuariAdmin.contrasenya) {
        req.session.autenticat = true;
        res.status(200).json({ missatge: 'Login correcte' });
    } else {
        res.status(401).json({ missatge: 'Credencials incorrectes' });
    }
});

// 🔐 Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy(() => res.status(200).json({ missatge: 'Sessió tancada' }));
});

// 🧪 (opcional) Comprovació de sessió
app.get('/api/session', (req, res) => {
    if (req.session?.autenticat) res.status(200).json({ autenticat: true });
    else res.status(401).json({ autenticat: false });
});

// Carrega els tallers del fitxer
function carregarTallers() {
    try {
        const dades = fs.readFileSync(TALLERS_PATH, 'utf-8').trim();
        if (!dades) return [];
        return JSON.parse(dades);
    } catch (error) {
        console.error('Error carregant tallers:', error);
        return [];
    }
}


// Desa els tallers al fitxer
function desaTallers(tallers) {
    fs.writeFileSync(TALLERS_PATH, JSON.stringify(tallers, null, 2));
}

// Inicialitza tallers
let tallers = carregarTallers();


// 🔓 Ruta pública
app.get('/api/tallers', (req, res) => {
    res.json(tallers);
});

// 🔐 Crear i eliminar tallers (només si loguejat)
app.post('/api/tallers', autentificat, (req, res) => {
    const { titol, descripcio, data, placesDisponibles, enllacReserva } = req.body;

    const nouTaller = {
        id: Date.now(),
        titol,
        descripcio,
        data,
        placesDisponibles: parseInt(placesDisponibles) || 0,
        enllacReserva: enllacReserva || ""
    };

    tallers.push(nouTaller);
    desaTallers(tallers); // si estàs guardant a un fitxer JSON
    res.status(201).json(nouTaller);
});


app.delete('/api/tallers/:id', autentificat, (req, res) => {
    const id = parseInt(req.params.id);
    tallers = tallers.filter(t => t.id !== id);
    desaTallers(tallers);
    res.status(204).send();
});

// Serveix la carpeta pública (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Serveix la carpeta d'administració
app.use('/admin', express.static(path.join(__dirname, 'admin')));


app.listen(PORT, () => {
    console.log(`Servidor actiu a https://elnanofarinetes-server.onrender.com:${PORT}`);
});

// 🔄 Actualitza un taller (ex: restar una plaça)
app.put('/api/tallers/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { placesDisponibles } = req.body;

    const index = tallers.findIndex(t => t.id === id);
    if (index === -1) {
        return res.status(404).json({ missatge: 'Taller no trobat' });
    }

    tallers[index].placesDisponibles = placesDisponibles;
    desaTallers(tallers);

    res.json(tallers[index]);
});

