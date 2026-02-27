import express from 'express';
import session from 'express-session';
import pg from 'pg';
import connectPgSimple from 'connect-pg-simple';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase, query } from './db.js';
import { getOrCreateUser, requireAdmin, isAdmin } from './auth.js';
import { setupRoutes } from './routes.js';
import { startNotificationScheduler } from './notifications.js';
import { serveObjectFile } from './objectStorage.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

const PgSession = connectPgSimple(session);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(session({
  store: new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: 'sessions',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'evandro-garcia-barber-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.REPLIT_DEPLOYMENT ? true : false,
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}));

app.set('trust proxy', 1);

app.use(express.static(path.join(__dirname, '../client')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));

setupRoutes(app);

app.use('/objects', async (req, res, next) => {
  if (req.method !== 'GET') return next();
  try {
    await serveObjectFile('/objects' + req.path, res);
  } catch (err) {
    console.error('Error serving object:', err);
    if (!res.headersSent) {
      res.status(404).json({ error: 'File not found' });
    }
  }
});

app.get('/admin', (req, res) => {
  if (req.session.user && req.session.user.isAdmin) {
    res.sendFile(path.join(__dirname, '../client/admin.html'));
  } else if (req.session.user && !req.session.user.isAdmin) {
    res.status(403).send('Acesso negado. Apenas o administrador pode acessar este painel.');
  } else {
    res.sendFile(path.join(__dirname, '../client/admin.html'));
  }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

async function startServer() {
  try {
    await initializeDatabase();
    
    startNotificationScheduler();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
