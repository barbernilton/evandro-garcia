import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        profile_image VARCHAR(500),
        password_hash VARCHAR(255),
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS auth_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255),
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours')
      );

      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        duration VARCHAR(50),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS barbers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        specialty VARCHAR(255),
        experience VARCHAR(100),
        photo VARCHAR(500),
        store_id INTEGER DEFAULT 1,
        calendar_id VARCHAR(500),
        calendar_color VARCHAR(10) DEFAULT '5',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        description VARCHAR(255) NOT NULL,
        value DECIMAL(10,2) NOT NULL,
        date DATE NOT NULL,
        category VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255),
        customer_phone VARCHAR(50),
        service_id INTEGER REFERENCES services(id),
        service_name VARCHAR(255),
        barber_id INTEGER REFERENCES barbers(id),
        barber_name VARCHAR(255),
        store_id INTEGER DEFAULT 1,
        date DATE NOT NULL,
        time VARCHAR(20) NOT NULL,
        total_price DECIMAL(10,2),
        status VARCHAR(50) DEFAULT 'confirmado',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50),
        plan_type VARCHAR(50) DEFAULT 'corte',
        plan_name VARCHAR(255) DEFAULT 'Assinatura Mensal',
        plan_price DECIMAL(10,2) DEFAULT 50.00,
        status VARCHAR(50) DEFAULT 'pendente',
        payment_date DATE,
        next_due_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Add columns if they don't exist (for existing databases)
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='plan_type') THEN
          ALTER TABLE subscriptions ADD COLUMN plan_type VARCHAR(50) DEFAULT 'corte';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='plan_name') THEN
          ALTER TABLE subscriptions ADD COLUMN plan_name VARCHAR(255) DEFAULT 'Assinatura Mensal';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='plan_price') THEN
          ALTER TABLE subscriptions ADD COLUMN plan_price DECIMAL(10,2) DEFAULT 50.00;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='barbers' AND column_name='calendar_id') THEN
          ALTER TABLE barbers ADD COLUMN calendar_id VARCHAR(500);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='barbers' AND column_name='calendar_color') THEN
          ALTER TABLE barbers ADD COLUMN calendar_color VARCHAR(10) DEFAULT '5';
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR(255) PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);

      CREATE TABLE IF NOT EXISTS carousel_media (
        id SERIAL PRIMARY KEY,
        type VARCHAR(20) DEFAULT 'image',
        url VARCHAR(500) NOT NULL,
        title VARCHAR(255),
        description TEXT,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS radio_tracks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        artist VARCHAR(255),
        url VARCHAR(500) NOT NULL,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(phone)
      );

      CREATE TABLE IF NOT EXISTS booking_recurrences (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        barber_id INTEGER REFERENCES barbers(id),
        service_ids TEXT NOT NULL,
        frequency VARCHAR(50) NOT NULL,
        interval_value INTEGER DEFAULT 1,
        days_of_week TEXT,
        time VARCHAR(20) NOT NULL,
        duration INTEGER NOT NULL,
        total_price DECIMAL(10,2),
        start_date DATE NOT NULL,
        end_date DATE,
        occurrences INTEGER,
        status VARCHAR(50) DEFAULT 'active',
        google_event_ids TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Add recurrence columns to bookings if they don't exist
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='recurrence_id') THEN
          ALTER TABLE bookings ADD COLUMN recurrence_id INTEGER REFERENCES booking_recurrences(id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='customer_id') THEN
          ALTER TABLE bookings ADD COLUMN customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='google_event_id') THEN
          ALTER TABLE bookings ADD COLUMN google_event_id VARCHAR(500);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='is_recurring') THEN
          ALTER TABLE bookings ADD COLUMN is_recurring BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='reminder_sent') THEN
          ALTER TABLE bookings ADD COLUMN reminder_sent BOOLEAN DEFAULT false;
        END IF;
      END $$;
    `);
    
    // Seed carousel with existing site media if empty
    const carouselCount = await client.query('SELECT COUNT(*) FROM carousel_media');
    if (parseInt(carouselCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO carousel_media (type, url, title, display_order) VALUES
        ('image', 'assets/cortes/corte1.jpg', 'Corte 1', 1),
        ('video', 'assets/cortes/video1.mp4', 'Vídeo 1', 2),
        ('image', 'assets/cortes/corte2.jpg', 'Corte 2', 3),
        ('video', 'assets/cortes/video2.mp4', 'Vídeo 2', 4),
        ('image', 'assets/cortes/corte3.jpg', 'Corte 3', 5),
        ('video', 'assets/cortes/video3.mp4', 'Vídeo 3', 6),
        ('video', 'assets/cortes/video4.mp4', 'Vídeo 4', 7)
      `);
      console.log('Carousel media seeded with existing site content');
    }
    
    const radioCount = await client.query('SELECT COUNT(*) FROM radio_tracks');
    if (parseInt(radioCount.rows[0].count) === 0) {
      const musicDir = path.join(__dirname, '../client/uploads/music');
      if (fs.existsSync(musicDir)) {
        const files = fs.readdirSync(musicDir).filter(f => /\.(mp3|wav|ogg|m4a)$/i.test(f));
        for (let i = 0; i < files.length; i++) {
          await client.query(
            'INSERT INTO radio_tracks (title, artist, url, display_order, is_active) VALUES ($1, $2, $3, $4, true)',
            [`Faixa ${i + 1}`, 'Barbershop Radio', `uploads/music/${files[i]}`, i + 1]
          );
        }
        if (files.length > 0) console.log(`Radio seeded with ${files.length} existing tracks`);
      }
    }

    console.log('Database tables initialized');
  } finally {
    client.release();
  }
}

export async function query(text, params) {
  return pool.query(text, params);
}

export default pool;
