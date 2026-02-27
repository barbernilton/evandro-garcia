import { query } from './db.js';
import { requireAdmin, isAdmin } from './auth.js';
import { sendBookingConfirmation } from './notifications.js';
import { uploadFileToStorage, uploadCarouselToStorage, serveObjectFile } from './objectStorage.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const carouselStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../client/uploads/carousel');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const barberStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../client/uploads/barbers');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadCarousel = multer({ 
  storage: carouselStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|webm|mov/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype.split('/')[1]);
    if (extname || file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/')) {
      return cb(null, true);
    }
    cb(new Error('Apenas imagens e vídeos são permitidos'));
  }
});

const uploadBarber = multer({ 
  storage: barberStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname || file.mimetype.startsWith('image/')) {
      return cb(null, true);
    }
    cb(new Error('Apenas imagens são permitidas'));
  }
});

const musicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../client/uploads/music');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadMusic = multer({ 
  storage: musicStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp3|wav|ogg|m4a|aac/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname || file.mimetype.startsWith('audio/')) {
      return cb(null, true);
    }
    cb(new Error('Apenas arquivos de áudio são permitidos'));
  }
});

const ADMIN_EMAIL = 'barbearia.evandrogarcia2@gmail.com';
const ADMIN_PASSWORD = 'EG#2026';

export function setupRoutes(app) {
  // ========== SERVICES ==========
  app.get('/api/services', async (req, res) => {
    try {
      const result = await query('SELECT * FROM services ORDER BY name');
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/services', requireAdmin, async (req, res) => {
    try {
      const { name, price, duration } = req.body;
      const result = await query(
        'INSERT INTO services (name, price, duration) VALUES ($1, $2, $3) RETURNING *',
        [name, price, duration]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/services/:id', requireAdmin, async (req, res) => {
    try {
      const { name, price, duration } = req.body;
      const result = await query(
        'UPDATE services SET name = $1, price = $2, duration = $3 WHERE id = $4 RETURNING *',
        [name, price, duration, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/services/:id', requireAdmin, async (req, res) => {
    try {
      await query('DELETE FROM services WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== BARBERS ==========
  app.get('/api/barbers', async (req, res) => {
    try {
      const result = await query('SELECT * FROM barbers ORDER BY name');
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Estatísticas mensais dos barbeiros (clientes únicos atendidos)
  app.get('/api/barbers/stats', requireAdmin, async (req, res) => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      
      const result = await query(`
        SELECT b.id, b.name, COUNT(DISTINCT COALESCE(bk.customer_phone, bk.customer_name)) as clients_count
        FROM barbers b
        LEFT JOIN bookings bk ON (b.name = bk.barber_name OR b.id = bk.barber_id)
          AND EXTRACT(YEAR FROM bk.date) = $1
          AND EXTRACT(MONTH FROM bk.date) = $2
          AND bk.status != 'cancelado'
        GROUP BY b.id, b.name
        ORDER BY b.name
      `, [year, month]);
      
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/barbers', requireAdmin, async (req, res) => {
    try {
      const { name, specialty, experience, photo, storeId, calendarId, calendarColor, email } = req.body;
      const result = await query(
        'INSERT INTO barbers (name, specialty, experience, photo, store_id, calendar_id, calendar_color, email) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [name, specialty, experience, photo || 'assets/barbers/default.jpg', storeId || 1, calendarId || null, calendarColor || '5', email || null]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/barbers/:id', requireAdmin, async (req, res) => {
    try {
      const { name, specialty, experience, photo, storeId, calendarId, calendarColor, email } = req.body;
      const result = await query(
        'UPDATE barbers SET name = $1, specialty = $2, experience = $3, photo = $4, store_id = $5, calendar_id = $6, calendar_color = $7, email = $8 WHERE id = $9 RETURNING *',
        [name, specialty, experience, photo, storeId || 1, calendarId || null, calendarColor || '5', email || null, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/busy-slots', async (req, res) => {
    try {
      const { date, barberId } = req.query;
      
      if (!date) {
        return res.status(400).json({ error: 'Data é obrigatória' });
      }
      
      const dateObj = new Date(date + 'T12:00:00');
      if (dateObj.getDay() === 0) {
        return res.json({ busyIntervals: [], closed: true, message: 'Fechado ao domingo' });
      }
      
      let sql = "SELECT time, service_name FROM bookings WHERE date = $1 AND status != 'cancelado'";
      const params = [date];
      if (barberId) {
        sql += ' AND barber_id = $2';
        params.push(barberId);
      }
      const result = await query(sql, params);
      
      const busyIntervals = [];
      for (const booking of result.rows) {
        const [h, m] = booking.time.split(':').map(Number);
        const startMinutes = h * 60 + m;
        let duration = 30;
        if (booking.service_name) {
          const svcResult = await query('SELECT duration FROM services WHERE name = $1', [booking.service_name]);
          if (svcResult.rows.length > 0 && svcResult.rows[0].duration) {
            const match = svcResult.rows[0].duration.match(/(\d+)/);
            if (match) duration = parseInt(match[1]);
          }
        }
        busyIntervals.push({
          start: startMinutes,
          end: startMinutes + duration,
          startTime: booking.time,
          endTime: `${Math.floor((startMinutes + duration) / 60).toString().padStart(2, '0')}:${((startMinutes + duration) % 60).toString().padStart(2, '0')}`
        });
      }
      
      res.json({ busyIntervals });
    } catch (err) {
      console.error('Erro ao buscar horários ocupados:', err.message);
      res.json({ busyIntervals: [] });
    }
  });

  app.delete('/api/barbers/:id', requireAdmin, async (req, res) => {
    try {
      await query('DELETE FROM barbers WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== EXPENSES ==========
  app.get('/api/expenses', requireAdmin, async (req, res) => {
    try {
      const result = await query('SELECT * FROM expenses ORDER BY date DESC');
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/expenses', requireAdmin, async (req, res) => {
    try {
      const { description, value, date, category } = req.body;
      const result = await query(
        'INSERT INTO expenses (description, value, date, category) VALUES ($1, $2, $3, $4) RETURNING *',
        [description, value, date, category]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/expenses/:id', requireAdmin, async (req, res) => {
    try {
      const { description, value, date, category } = req.body;
      const result = await query(
        'UPDATE expenses SET description = $1, value = $2, date = $3, category = $4 WHERE id = $5 RETURNING *',
        [description, value, date, category, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/expenses/:id', requireAdmin, async (req, res) => {
    try {
      await query('DELETE FROM expenses WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== BOOKINGS ==========
  app.get('/api/bookings', requireAdmin, async (req, res) => {
    try {
      const includeRecurring = req.query.includeRecurring === 'true';
      let sql = 'SELECT * FROM bookings';
      if (!includeRecurring) {
        sql += ' WHERE (is_recurring IS NULL OR is_recurring = false)';
      }
      sql += ' ORDER BY date DESC, time DESC';
      const result = await query(sql);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/bookings', async (req, res) => {
    try {
      const data = req.body;
      const customerName = data.customerName || data.name;
      const customerEmail = data.customerEmail || data.email;
      const customerPhone = data.customerPhone || data.phone;
      const serviceName = data.serviceName || (data.services && data.services.length > 0 ? data.services.map(s => s.name || s).join(', ') : '');
      const storeId = data.storeId || data.store || 1;
      const date = data.date;
      const time = data.time;
      
      const bookingDate = new Date(date + 'T12:00:00');
      if (bookingDate.getDay() === 0) {
        return res.status(400).json({ success: false, message: 'Não é possível agendar ao domingo. Estamos fechados.' });
      }
      
      if (time) {
        const [h, m] = time.split(':').map(Number);
        if (h === 13) {
          return res.status(400).json({ success: false, message: 'Horário de almoço (13:00-14:00). Não é possível agendar.' });
        }
        if (h < 9 || h > 19) {
          return res.status(400).json({ success: false, message: 'Fora do horário de funcionamento (09:00-20:00).' });
        }
      }
      const totalPrice = data.totalPrice || data.total || 0;
      
      let barberId = data.barber ? parseInt(data.barber) : null;
      let barberName = data.barberName || '';
      
      if (barberId && !barberName) {
        const barberResult = await query('SELECT id, name FROM barbers WHERE id = $1', [barberId]);
        if (barberResult.rows.length > 0) {
          barberName = barberResult.rows[0].name;
        }
      } else if (barberName && !barberId) {
        const barberResult = await query('SELECT id FROM barbers WHERE name = $1', [barberName]);
        if (barberResult.rows.length > 0) {
          barberId = barberResult.rows[0].id;
        }
      }
      
      const result = await query(
        `INSERT INTO bookings (customer_name, customer_email, customer_phone, service_name, barber_name, barber_id, store_id, date, time, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [customerName, customerEmail, customerPhone, serviceName, barberName, barberId, storeId, date, time, totalPrice]
      );

      sendBookingConfirmation(result.rows[0]).catch(err => console.log('Email erro:', err.message));

      res.json({ 
        success: true, 
        message: 'Agendamento confirmado com sucesso!', 
        booking: result.rows[0]
      });
    } catch (err) {
      console.error('Erro ao criar agendamento:', err);
      res.status(500).json({ success: false, message: 'Erro interno ao processar o agendamento. Tente novamente.' });
    }
  });

  app.patch('/api/bookings/:id/status', requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      const result = await query(
        'UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *',
        [status, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/bookings/delete-all', requireAdmin, async (req, res) => {
    try {
      const deleteResult = await query('DELETE FROM bookings');
      res.json({ success: true, deleted: deleteResult.rowCount });
    } catch (err) {
      console.error('Erro ao apagar todos os agendamentos:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/bookings/delete-by-name', requireAdmin, async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Nome é obrigatório' });
      }
      const result = await query('DELETE FROM bookings WHERE LOWER(customer_name) LIKE LOWER($1)', [`%${name.trim()}%`]);
      res.json({ success: true, deleted: result.rowCount });
    } catch (err) {
      console.error('Erro ao apagar agendamentos por nome:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/bookings/:id', requireAdmin, async (req, res) => {
    try {
      await query('DELETE FROM bookings WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== SUBSCRIPTIONS ==========
  app.get('/api/subscriptions', requireAdmin, async (req, res) => {
    try {
      const result = await query('SELECT * FROM subscriptions ORDER BY created_at DESC');
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/subscriptions', async (req, res) => {
    try {
      const { customerName, customerEmail, customerPhone, planType, planName, planPrice } = req.body;
      const result = await query(
        'INSERT INTO subscriptions (customer_name, customer_email, customer_phone, plan_type, plan_name, plan_price) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [customerName, customerEmail, customerPhone, planType || 'corte', planName || 'Assinatura Mensal Corte', planPrice || 50.00]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/subscriptions/:id/status', requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      let paymentDate = null;
      let nextDueDate = null;

      if (status === 'pago') {
        paymentDate = new Date();
        nextDueDate = new Date();
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      }

      const result = await query(
        'UPDATE subscriptions SET status = $1, payment_date = $2, next_due_date = $3 WHERE id = $4 RETURNING *',
        [status, paymentDate, nextDueDate, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/subscriptions/:id', requireAdmin, async (req, res) => {
    try {
      const { status, paymentDate, nextDueDate } = req.body;
      const result = await query(
        'UPDATE subscriptions SET status = $1, payment_date = $2, next_due_date = $3 WHERE id = $4 RETURNING *',
        [status, paymentDate || new Date(), nextDueDate, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/subscriptions/:id', requireAdmin, async (req, res) => {
    try {
      await query('DELETE FROM subscriptions WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== CAROUSEL MEDIA ==========
  app.get('/api/carousel', async (req, res) => {
    try {
      const result = await query('SELECT * FROM carousel_media ORDER BY display_order, id');
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/carousel', requireAdmin, async (req, res) => {
    try {
      const { type, url, title, description } = req.body;
      const orderResult = await query('SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM carousel_media');
      const nextOrder = orderResult.rows[0].next_order;
      const result = await query(
        'INSERT INTO carousel_media (type, url, title, description, display_order) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [type || 'image', url, title, description, nextOrder]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/carousel/upload', requireAdmin, uploadCarousel.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }
      const { title, description } = req.body;
      
      let fileUrl;
      try {
        fileUrl = await uploadCarouselToStorage(req.file.path, req.file.filename);
        fs.unlink(req.file.path, () => {});
      } catch (storageErr) {
        console.log('Object storage fallback to local:', storageErr.message);
        fileUrl = `uploads/carousel/${req.file.filename}`;
      }
      
      const isVideo = req.file.mimetype.startsWith('video/');
      const type = isVideo ? 'video' : 'image';
      
      const orderResult = await query('SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM carousel_media');
      const nextOrder = orderResult.rows[0].next_order;
      
      const result = await query(
        'INSERT INTO carousel_media (type, url, title, description, display_order) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [type, fileUrl, title || '', description || '', nextOrder]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/barbers/upload', requireAdmin, uploadBarber.single('photo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhuma foto enviada' });
      }
      const { name, specialty, experience, storeId, calendarId, calendarColor, email } = req.body;
      
      let photoUrl;
      try {
        photoUrl = await uploadFileToStorage(req.file.path, req.file.filename);
        fs.unlink(req.file.path, () => {});
      } catch (storageErr) {
        console.log('Object storage fallback to local:', storageErr.message);
        photoUrl = `uploads/barbers/${req.file.filename}`;
      }
      
      const result = await query(
        'INSERT INTO barbers (name, specialty, experience, photo, store_id, calendar_id, calendar_color, email) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [name, specialty, experience, photoUrl, storeId || 1, calendarId || null, calendarColor || '5', email || null]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/barbers/:id/upload', requireAdmin, uploadBarber.single('photo'), async (req, res) => {
    try {
      const { name, specialty, experience, storeId, calendarId, calendarColor, email } = req.body;
      let photoUrl = req.body.existingPhoto;
      
      if (req.file) {
        try {
          photoUrl = await uploadFileToStorage(req.file.path, req.file.filename);
          fs.unlink(req.file.path, () => {});
        } catch (storageErr) {
          console.log('Object storage fallback to local:', storageErr.message);
          photoUrl = `uploads/barbers/${req.file.filename}`;
        }
      }
      
      const result = await query(
        'UPDATE barbers SET name = $1, specialty = $2, experience = $3, photo = $4, store_id = $5, calendar_id = $6, calendar_color = $7, email = $8 WHERE id = $9 RETURNING *',
        [name, specialty, experience, photoUrl, storeId || 1, calendarId || null, calendarColor || '5', email || null, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/carousel/:id', requireAdmin, async (req, res) => {
    try {
      await query('DELETE FROM carousel_media WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== RADIO TRACKS ==========
  app.get('/api/radio', async (req, res) => {
    try {
      const result = await query('SELECT * FROM radio_tracks WHERE is_active = true ORDER BY display_order, id');
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/radio/all', requireAdmin, async (req, res) => {
    try {
      const result = await query('SELECT * FROM radio_tracks ORDER BY display_order, id');
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/radio/upload', requireAdmin, uploadMusic.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }
      const { title, artist } = req.body;
      const fileUrl = `uploads/music/${req.file.filename}`;
      
      const orderResult = await query('SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM radio_tracks');
      const nextOrder = orderResult.rows[0].next_order;
      
      const result = await query(
        'INSERT INTO radio_tracks (title, artist, url, display_order) VALUES ($1, $2, $3, $4) RETURNING *',
        [title || 'Sem título', artist || '', fileUrl, nextOrder]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/radio/:id', requireAdmin, async (req, res) => {
    try {
      const { title, artist, is_active } = req.body;
      
      if (is_active !== undefined) {
        const result = await query(
          'UPDATE radio_tracks SET is_active = $1 WHERE id = $2 RETURNING *',
          [is_active, req.params.id]
        );
        return res.json(result.rows[0]);
      }
      
      const result = await query(
        'UPDATE radio_tracks SET title = $1, artist = $2 WHERE id = $3 RETURNING *',
        [title, artist, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/radio/:id', requireAdmin, async (req, res) => {
    try {
      await query('DELETE FROM radio_tracks WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== DASHBOARD ==========
  app.get('/api/dashboard', requireAdmin, async (req, res) => {
    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const incomeResult = await query(
        `SELECT COALESCE(SUM(total_price), 0) as income FROM bookings 
         WHERE date >= $1 AND date <= $2 AND status != 'cancelado'`,
        [firstDayOfMonth.toISOString().split('T')[0], lastDayOfMonth.toISOString().split('T')[0]]
      );

      const subscriptionIncomeResult = await query(
        `SELECT COALESCE(SUM(plan_price), 0) as income FROM subscriptions 
         WHERE status = 'pago' AND payment_date >= $1 AND payment_date <= $2`,
        [firstDayOfMonth, lastDayOfMonth]
      );

      const expenseResult = await query(
        `SELECT COALESCE(SUM(value), 0) as expense_total FROM expenses 
         WHERE date >= $1 AND date <= $2`,
        [firstDayOfMonth, lastDayOfMonth]
      );

      const bookingCountResult = await query(
        `SELECT COUNT(*) as count FROM bookings 
         WHERE date >= $1 AND date <= $2`,
        [firstDayOfMonth.toISOString().split('T')[0], lastDayOfMonth.toISOString().split('T')[0]]
      );

      const bookingIncome = parseFloat(incomeResult.rows[0].income) || 0;
      const subscriptionIncome = parseFloat(subscriptionIncomeResult.rows[0].income) || 0;
      const income = bookingIncome + subscriptionIncome;
      const expenseTotal = parseFloat(expenseResult.rows[0].expense_total) || 0;
      const profit = income - expenseTotal;
      const bookingCount = parseInt(bookingCountResult.rows[0].count) || 0;

      const monthlyDataResult = await query(`
        SELECT 
          EXTRACT(MONTH FROM date) as month,
          COALESCE(SUM(total_price), 0) as income
        FROM bookings 
        WHERE EXTRACT(YEAR FROM date) = $1 AND status != 'cancelado'
        GROUP BY EXTRACT(MONTH FROM date)
        ORDER BY month
      `, [now.getFullYear()]);

      // Monthly subscription income
      const monthlySubsResult = await query(`
        SELECT 
          EXTRACT(MONTH FROM payment_date) as month,
          COALESCE(SUM(plan_price), 0) as income
        FROM subscriptions 
        WHERE EXTRACT(YEAR FROM payment_date) = $1 AND status = 'pago'
        GROUP BY EXTRACT(MONTH FROM payment_date)
        ORDER BY month
      `, [now.getFullYear()]);

      const monthlyExpensesResult = await query(`
        SELECT 
          EXTRACT(MONTH FROM date) as month,
          COALESCE(SUM(value), 0) as expense
        FROM expenses 
        WHERE EXTRACT(YEAR FROM date) = $1
        GROUP BY EXTRACT(MONTH FROM date)
        ORDER BY month
      `, [now.getFullYear()]);

      // Calculate net profit (income - expenses) for each month
      const monthlyData = Array(12).fill(0);
      
      // First add booking income
      monthlyDataResult.rows.forEach(row => {
        const monthIndex = parseInt(row.month) - 1;
        monthlyData[monthIndex] += parseFloat(row.income) || 0;
      });

      // Add subscription income to monthly data
      monthlySubsResult.rows.forEach(row => {
        const monthIndex = parseInt(row.month) - 1;
        monthlyData[monthIndex] += parseFloat(row.income) || 0;
      });

      // Subtract expenses to get net profit
      monthlyExpensesResult.rows.forEach(row => {
        const monthIndex = parseInt(row.month) - 1;
        monthlyData[monthIndex] -= parseFloat(row.expense) || 0;
      });

      res.json({
        income,
        expenseTotal,
        profit,
        bookingCount,
        monthlyData
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== AVAILABILITY (for booking form) ==========
  app.get('/api/availability', async (req, res) => {
    try {
      const { date, barberId } = req.query;
      
      const dateObj = new Date(date + 'T12:00:00');
      if (dateObj.getDay() === 0) {
        return res.json({ available: [], closed: true, message: 'Fechado ao domingo' });
      }
      
      const bookedSlots = await query(
        'SELECT time FROM bookings WHERE date = $1 AND barber_id = $2 AND status != $3',
        [date, barberId, 'cancelado']
      );
      
      const allSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', 
                        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'];

      const bookedTimes = bookedSlots.rows.map(r => r.time);
      const available = allSlots.filter(slot => !bookedTimes.includes(slot));
      
      res.json({ available });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== USER AUTHENTICATION ==========
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, password } = req.body;
      
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
      }
      
      // Check if user already exists
      const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Este email já está registrado' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const result = await query(
        'INSERT INTO users (name, email, password_hash, is_admin) VALUES ($1, $2, $3, $4) RETURNING id, name, email, is_admin',
        [name, email.toLowerCase(), hashedPassword, email.toLowerCase() === ADMIN_EMAIL]
      );
      
      const user = result.rows[0];
      
      // Generate and store token
      const token = crypto.randomBytes(32).toString('hex');
      await query(
        'INSERT INTO auth_tokens (user_id, token, email, is_admin) VALUES ($1, $2, $3, $4)',
        [user.id, token, user.email, user.is_admin]
      );
      
      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isAdmin: user.is_admin
        },
        token
      });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Erro ao registrar usuário' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }
      
      // Check for admin login
      if (email.toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        // Ensure admin user exists in database
        let adminUser = await query('SELECT id, name, email, is_admin FROM users WHERE email = $1', [ADMIN_EMAIL]);
        
        if (adminUser.rows.length === 0) {
          // Create admin user if not exists
          const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
          adminUser = await query(
            'INSERT INTO users (name, email, password_hash, is_admin) VALUES ($1, $2, $3, $4) RETURNING id, name, email, is_admin',
            ['Evandro Garcia', ADMIN_EMAIL, hashedPassword, true]
          );
        }
        
        const user = adminUser.rows[0];
        
        // Generate and store token
        const token = crypto.randomBytes(32).toString('hex');
        await query(
          'INSERT INTO auth_tokens (user_id, token, email, is_admin) VALUES ($1, $2, $3, $4)',
          [user.id, token, user.email, true]
        );
        
        return res.json({
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            isAdmin: true
          },
          token
        });
      }
      
      // Regular user login
      const result = await query('SELECT id, name, email, password_hash, is_admin FROM users WHERE email = $1', [email.toLowerCase()]);
      
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Email ou senha incorretos' });
      }
      
      const user = result.rows[0];
      
      // Verify password
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Email ou senha incorretos' });
      }
      
      // Generate and store token
      const token = crypto.randomBytes(32).toString('hex');
      await query(
        'INSERT INTO auth_tokens (user_id, token, email, is_admin) VALUES ($1, $2, $3, $4)',
        [user.id, token, user.email, user.is_admin]
      );
      
      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isAdmin: user.is_admin
        },
        token
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Erro ao fazer login' });
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Não autenticado' });
      }
      
      const token = authHeader.substring(7);
      
      const tokenResult = await query(
        'SELECT * FROM auth_tokens WHERE token = $1 AND expires_at > NOW()',
        [token]
      );
      
      if (tokenResult.rows.length === 0) {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
      }
      
      const tokenData = tokenResult.rows[0];
      
      res.json({
        user: {
          id: tokenData.user_id,
          email: tokenData.email,
          isAdmin: tokenData.is_admin
        },
        authenticated: true
      });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao verificar autenticação' });
    }
  });

  // Logout endpoint - delete token from database
  app.post('/api/auth/logout', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await query('DELETE FROM auth_tokens WHERE token = $1', [token]);
    }
    res.json({ success: true });
  });

  // ========== CUSTOMERS ==========
  app.get('/api/customers', async (req, res) => {
    try {
      const customers = await query('SELECT id, name, phone, email, notes, created_at, \'customer\' as source FROM customers ORDER BY name');
      const users = await query('SELECT id, name, \'N/A\' as phone, email, \'\' as notes, created_at, \'user\' as source FROM users ORDER BY name');
      const combined = [...customers.rows, ...users.rows];
      res.json(combined);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/customers/search', async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) return res.json([]);
      const result = await query(
        'SELECT * FROM customers WHERE name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1 LIMIT 10',
        [`%${q}%`]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/customers/check-duplicate', async (req, res) => {
    try {
      const { phone, email } = req.query;
      let existing = null;
      if (phone) {
        const result = await query('SELECT * FROM customers WHERE phone = $1', [phone]);
        if (result.rows.length > 0) existing = result.rows[0];
      }
      if (!existing && email) {
        const result = await query('SELECT * FROM customers WHERE email = $1', [email]);
        if (result.rows.length > 0) existing = result.rows[0];
      }
      res.json({ exists: !!existing, customer: existing });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/customers', async (req, res) => {
    try {
      const { name, phone, email, notes } = req.body;
      if (!name || !phone) {
        return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
      }
      const result = await query(
        'INSERT INTO customers (name, phone, email, notes) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, phone, email || null, notes || null]
      );
      res.json(result.rows[0]);
    } catch (err) {
      if (err.code === '23505') {
        return res.status(400).json({ error: 'Cliente com este telefone já existe', duplicate: true });
      }
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/customers/:id', async (req, res) => {
    try {
      const { name, phone, email, notes } = req.body;
      const result = await query(
        'UPDATE customers SET name=$1, phone=$2, email=$3, notes=$4 WHERE id=$5 RETURNING *',
        [name, phone, email, notes, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/customers/:id', async (req, res) => {
    try {
      await query('DELETE FROM customers WHERE id=$1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== RECURRING BOOKINGS ==========
  
  // Helper function to calculate recurrence dates
  function calculateRecurrenceDates(startDate, frequency, intervalValue, daysOfWeek, endDate, occurrences, maxDates = 52) {
    const dates = [];
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    const maxOccurrences = occurrences || maxDates;
    
    let current = new Date(start);
    let count = 0;
    
    while (count < maxOccurrences && (!end || current <= end)) {
      if (frequency === 'weekly' && daysOfWeek && daysOfWeek.length > 0) {
        // For weekly with specific days
        const dayOfWeek = current.getDay();
        if (daysOfWeek.includes(dayOfWeek)) {
          dates.push(new Date(current));
          count++;
        }
        current.setDate(current.getDate() + 1);
        
        // Check if we've completed a week and need to skip
        if (current.getDay() === start.getDay() && intervalValue > 1) {
          current.setDate(current.getDate() + (intervalValue - 1) * 7);
        }
      } else {
        dates.push(new Date(current));
        count++;
        
        switch (frequency) {
          case 'daily':
            current.setDate(current.getDate() + intervalValue);
            break;
          case 'weekly':
            current.setDate(current.getDate() + 7 * intervalValue);
            break;
          case 'biweekly':
            current.setDate(current.getDate() + 14);
            break;
          case 'monthly':
            current.setMonth(current.getMonth() + intervalValue);
            break;
          default:
            current.setDate(current.getDate() + intervalValue);
        }
      }
      
      // Safety limit
      if (dates.length > 200) break;
    }
    
    return dates;
  }

  app.post('/api/recurring-bookings/check-conflicts', async (req, res) => {
    try {
      const { barberId, dates, time, duration } = req.body;
      const conflicts = [];
      
      for (const dateStr of dates) {
        const startMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);
        const endMinutes = startMinutes + duration;
        
        const existing = await query(
          'SELECT * FROM bookings WHERE barber_id = $1 AND date = $2 AND status != $3',
          [barberId, dateStr, 'cancelado']
        );
        
        for (const booking of existing.rows) {
          const bookingStart = parseInt(booking.time.split(':')[0]) * 60 + parseInt(booking.time.split(':')[1]);
          let bookingDuration = 30;
          if (booking.service_name) {
            const serviceResult = await query('SELECT duration FROM services WHERE name = $1', [booking.service_name]);
            if (serviceResult.rows.length > 0 && serviceResult.rows[0].duration) {
              const match = serviceResult.rows[0].duration.match(/\d+/);
              if (match) bookingDuration = parseInt(match[0]);
            }
          }
          const bookingEnd = bookingStart + bookingDuration;
          
          if (startMinutes < bookingEnd && endMinutes > bookingStart) {
            conflicts.push({
              date: dateStr,
              time: booking.time,
              customer: booking.customer_name,
              reason: 'Horário já ocupado no sistema'
            });
          }
        }
      }
      
      res.json({ conflicts, hasConflicts: conflicts.length > 0 });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Preview recurrence dates
  app.post('/api/recurring-bookings/preview', async (req, res) => {
    try {
      const { startDate, frequency, intervalValue, daysOfWeek, endDate, occurrences } = req.body;
      const dates = calculateRecurrenceDates(
        startDate,
        frequency,
        intervalValue || 1,
        daysOfWeek || [],
        endDate,
        occurrences
      );
      res.json({ 
        dates: dates.map(d => d.toISOString().split('T')[0]),
        count: dates.length
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create recurring booking
  app.post('/api/recurring-bookings', async (req, res) => {
    try {
      const { 
        customerId, customerName, customerPhone, customerEmail,
        barberId, barberName, serviceIds, serviceName,
        frequency, intervalValue, daysOfWeek, time, duration, totalPrice,
        startDate, endDate, occurrences
      } = req.body;
      
      // Create or get customer
      let customer;
      if (customerId) {
        const result = await query('SELECT * FROM customers WHERE id = $1', [customerId]);
        customer = result.rows[0];
      } else {
        // Check for duplicate
        const existing = await query('SELECT * FROM customers WHERE phone = $1', [customerPhone]);
        if (existing.rows.length > 0) {
          customer = existing.rows[0];
          // Update if needed
          await query(
            'UPDATE customers SET name=$1, email=$2 WHERE id=$3',
            [customerName, customerEmail || customer.email, customer.id]
          );
        } else {
          const result = await query(
            'INSERT INTO customers (name, phone, email) VALUES ($1, $2, $3) RETURNING *',
            [customerName, customerPhone, customerEmail || null]
          );
          customer = result.rows[0];
        }
      }
      
      // Calculate dates
      const dates = calculateRecurrenceDates(
        startDate,
        frequency,
        intervalValue || 1,
        daysOfWeek || [],
        endDate,
        occurrences
      );
      
      if (dates.length === 0) {
        return res.status(400).json({ error: 'Nenhuma data válida para a recorrência' });
      }
      
      // Check all conflicts
      const conflicts = [];
      for (const date of dates) {
        const dateStr = date.toISOString().split('T')[0];
        const existing = await query(
          'SELECT * FROM bookings WHERE barber_id = $1 AND date = $2 AND status != $3',
          [barberId, dateStr, 'cancelado']
        );
        
        const startMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);
        const endMinutes = startMinutes + duration;
        
        for (const booking of existing.rows) {
          const bookingStart = parseInt(booking.time.split(':')[0]) * 60 + parseInt(booking.time.split(':')[1]);
          const bookingEnd = bookingStart + 30;
          
          if (startMinutes < bookingEnd && endMinutes > bookingStart) {
            conflicts.push({ date: dateStr, time: booking.time });
          }
        }
      }
      
      if (conflicts.length > 0) {
        return res.status(400).json({ 
          error: 'Existem conflitos de horário',
          conflicts 
        });
      }
      
      // Create recurrence record
      const recurrenceResult = await query(
        `INSERT INTO booking_recurrences 
         (customer_id, barber_id, service_ids, frequency, interval_value, days_of_week, time, duration, total_price, start_date, end_date, occurrences)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [customer.id, barberId, JSON.stringify(serviceIds), frequency, intervalValue || 1, 
         JSON.stringify(daysOfWeek || []), time, duration, totalPrice,
         startDate, endDate || null, occurrences || null]
      );
      
      const recurrence = recurrenceResult.rows[0];
      
      const createdBookings = [];
      
      for (const date of dates) {
        const dateStr = date.toISOString().split('T')[0];
        
        const bookingResult = await query(
          `INSERT INTO bookings 
           (customer_name, customer_email, customer_phone, service_name, barber_id, barber_name, date, time, total_price, status, recurrence_id, customer_id, is_recurring)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
          [customer.name, customer.email, customer.phone, serviceName, barberId, barberName, 
           dateStr, time, totalPrice, 'confirmado', recurrence.id, customer.id, true]
        );
        createdBookings.push(bookingResult.rows[0]);
      }
      
      res.json({
        success: true,
        recurrence,
        bookings: createdBookings,
        customer,
        count: createdBookings.length
      });
    } catch (err) {
      console.error('Error creating recurring booking:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get all recurrences
  app.get('/api/recurring-bookings', async (req, res) => {
    try {
      const result = await query(`
        SELECT br.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
               b.name as barber_name
        FROM booking_recurrences br
        LEFT JOIN customers c ON br.customer_id = c.id
        LEFT JOIN barbers b ON br.barber_id = b.id
        ORDER BY br.created_at DESC
      `);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get single recurrence with bookings
  app.get('/api/recurring-bookings/:id', async (req, res) => {
    try {
      const recurrence = await query(`
        SELECT br.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
               b.name as barber_name
        FROM booking_recurrences br
        LEFT JOIN customers c ON br.customer_id = c.id
        LEFT JOIN barbers b ON br.barber_id = b.id
        WHERE br.id = $1
      `, [req.params.id]);
      
      const bookings = await query(
        'SELECT * FROM bookings WHERE recurrence_id = $1 ORDER BY date',
        [req.params.id]
      );
      
      res.json({
        recurrence: recurrence.rows[0],
        bookings: bookings.rows
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Cancel single booking from recurrence
  app.put('/api/recurring-bookings/:recurrenceId/bookings/:bookingId/cancel', async (req, res) => {
    try {
      await query(
        'UPDATE bookings SET status = $1 WHERE id = $2',
        ['cancelado', req.params.bookingId]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Cancel all future bookings in recurrence
  app.put('/api/recurring-bookings/:id/cancel-future', async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await query(
        'UPDATE bookings SET status = $1 WHERE recurrence_id = $2 AND date >= $3',
        ['cancelado', req.params.id, today]
      );
      await query(
        'UPDATE booking_recurrences SET status = $1 WHERE id = $2',
        ['cancelled', req.params.id]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/recurring-bookings/delete-all', requireAdmin, async (req, res) => {
    try {
      await query('DELETE FROM bookings WHERE recurrence_id IS NOT NULL');
      const deleteResult = await query('DELETE FROM booking_recurrences');
      res.json({ success: true, deleted: deleteResult.rowCount });
    } catch (err) {
      console.error('Erro ao apagar todas as recorrências:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/recurring-bookings/:id', async (req, res) => {
    try {
      await query('UPDATE bookings SET status = $1 WHERE recurrence_id = $2', ['cancelado', req.params.id]);
      await query('DELETE FROM booking_recurrences WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Edit single booking in recurrence
  app.put('/api/recurring-bookings/:recurrenceId/bookings/:bookingId', async (req, res) => {
    try {
      const { date, time, barberId, barberName } = req.body;
      await query(
        'UPDATE bookings SET date=$1, time=$2, barber_id=$3, barber_name=$4 WHERE id=$5',
        [date, time, barberId, barberName, req.params.bookingId]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/recurring-bookings/:id/delete-all', requireAdmin, async (req, res) => {
    try {
      const bookingsResult = await query('SELECT id FROM bookings WHERE recurrence_id = $1', [req.params.id]);
      await query('DELETE FROM bookings WHERE recurrence_id = $1', [req.params.id]);
      await query('DELETE FROM booking_recurrences WHERE id = $1', [req.params.id]);
      res.json({ success: true, deleted: bookingsResult.rows.length });
    } catch (err) {
      console.error('Erro ao apagar recorrência:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/customers/extract-from-bookings', requireAdmin, async (req, res) => {
    try {
      const bookingsResult = await query(
        `SELECT DISTINCT customer_name, customer_email, customer_phone 
         FROM bookings 
         WHERE customer_phone IS NOT NULL AND customer_phone != '' AND customer_name IS NOT NULL AND customer_name != ''
         ORDER BY customer_name`
      );

      let created = 0;
      let skipped = 0;

      for (const booking of bookingsResult.rows) {
        const existing = await query('SELECT id FROM customers WHERE phone = $1', [booking.customer_phone]);
        if (existing.rows.length > 0) {
          skipped++;
          continue;
        }
        try {
          await query(
            'INSERT INTO customers (name, phone, email) VALUES ($1, $2, $3)',
            [booking.customer_name, booking.customer_phone, booking.customer_email || null]
          );
          created++;
        } catch (insertErr) {
          if (insertErr.code === '23505') {
            skipped++;
          } else {
            console.error('Erro ao criar cliente:', insertErr.message);
          }
        }
      }

      res.json({ success: true, created, skipped, total: bookingsResult.rows.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (userId === 1) return res.status(400).json({ error: 'Não é possível apagar o administrador principal' });
      await query('DELETE FROM users WHERE id = $1', [userId]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/import-bookings', requireAdmin, async (req, res) => {
    try {
      const { bookings } = req.body;
      if (!bookings || !Array.isArray(bookings)) {
        return res.status(400).json({ error: 'Dados inválidos' });
      }

      let inserted = 0;
      let skipped = 0;
      for (const b of bookings) {
        try {
          const exists = await query('SELECT id FROM bookings WHERE google_event_id = $1', [b.google_event_id]);
          if (exists.rows.length > 0) {
            skipped++;
            continue;
          }
          await query(
            `INSERT INTO bookings (customer_name, customer_email, customer_phone, service_name, barber_name, store_id, date, time, total_price, status, created_at, google_event_id, is_recurring)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [b.customer_name, b.customer_email || null, b.customer_phone || null, b.service_name, b.barber_name, b.store_id || 1, b.date, b.time, b.total_price || 0, b.status || 'confirmado', b.created_at, b.google_event_id, b.is_recurring || false]
          );
          inserted++;
        } catch (err) {
          console.error('Erro ao importar booking:', err.message);
        }
      }
      res.json({ success: true, inserted, skipped, total: bookings.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}
