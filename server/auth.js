import { query } from './db.js';

const ADMIN_EMAIL = 'barbearia.evandrogarcia2@gmail.com';

export function isAdmin(email) {
  return email === ADMIN_EMAIL;
}

export async function getOrCreateUser(profile) {
  const { sub, email, first_name, last_name, given_name, family_name, picture, profile_image_url } = profile;
  const firstName = first_name || given_name || '';
  const lastName = last_name || family_name || '';
  const name = firstName && lastName ? `${firstName} ${lastName}` : (firstName || email);
  const profileImage = picture || profile_image_url;
  
  const existingUser = await query('SELECT * FROM users WHERE google_id = $1', [sub]);
  
  if (existingUser.rows.length > 0) {
    await query(
      'UPDATE users SET email = $1, name = $2, profile_image = $3 WHERE google_id = $4',
      [email, name, profileImage, sub]
    );
    return { ...existingUser.rows[0], is_admin: isAdmin(email) };
  }
  
  const result = await query(
    'INSERT INTO users (google_id, email, name, profile_image, is_admin) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [sub, email, name, profileImage, isAdmin(email)]
  );
  
  return result.rows[0];
}

export async function validateToken(token) {
  if (!token) return null;
  
  const result = await query(
    'SELECT * FROM auth_tokens WHERE token = $1 AND expires_at > NOW()',
    [token]
  );
  
  return result.rows.length > 0 ? result.rows[0] : null;
}

export async function requireAuth(req, res, next) {
  // Check session first
  if (req.session && req.session.user) {
    return next();
  }
  
  // Check Authorization header for Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const tokenData = await validateToken(token);
    
    if (tokenData) {
      req.user = {
        id: tokenData.user_id,
        email: tokenData.email,
        isAdmin: tokenData.is_admin
      };
      return next();
    }
  }
  
  return res.status(401).json({ error: 'Não autenticado' });
}

export async function requireAdmin(req, res, next) {
  // Check session first
  if (req.session && req.session.user) {
    if (!isAdmin(req.session.user.email)) {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem acessar.' });
    }
    return next();
  }
  
  // Check Authorization header for Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const tokenData = await validateToken(token);
    
    if (tokenData && tokenData.is_admin) {
      req.user = {
        id: tokenData.user_id,
        email: tokenData.email,
        isAdmin: true
      };
      return next();
    }
    
    if (tokenData && !tokenData.is_admin) {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem acessar.' });
    }
  }
  
  return res.status(401).json({ error: 'Não autenticado' });
}
