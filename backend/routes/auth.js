import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/database.js';
import { loginValidation } from '../middleware/validators.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

// Login
router.post('/login', loginValidation, async (req, res) => {
  const { email, password, rememberMe = false } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM admin_users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    let refreshToken = null;
    if (rememberMe) {
      refreshToken = crypto.randomBytes(64).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

      await pool.query(
        'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_info) VALUES ($1, $2, $3, $4)',
        [user.id, tokenHash, expiresAt, req.headers['user-agent'] || 'Unknown']
      );
    }

    res.json({
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Refresh access token
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const result = await pool.query(
      `SELECT rt.*, au.email, au.name, au.role
       FROM refresh_tokens rt
       JOIN admin_users au ON rt.user_id = au.id
       WHERE rt.token_hash = $1
         AND rt.is_revoked = false
         AND rt.expires_at > NOW()
         AND au.is_active = true`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const tokenData = result.rows[0];

    const accessToken = jwt.sign(
      { id: tokenData.user_id, email: tokenData.email, role: tokenData.role },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    res.json({ accessToken, expiresIn: ACCESS_TOKEN_EXPIRY });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Logout (revoke refresh token)
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    try {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await pool.query(
        'UPDATE refresh_tokens SET is_revoked = true WHERE token_hash = $1',
        [tokenHash]
      );
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  res.json({ success: true });
});

// Get current user info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, created_at FROM admin_users WHERE id = $1 AND is_active = true',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  try {
    const result = await pool.query(
      'SELECT password_hash FROM admin_users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const newHash = await bcrypt.hash(newPassword, rounds);

    await pool.query(
      'UPDATE admin_users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, req.user.id]
    );

    // Revoke all refresh tokens for this user
    await pool.query(
      'UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1',
      [req.user.id]
    );

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Create initial admin user (only works if no admin exists)
router.post('/setup', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    // Check if any admin exists
    const existingAdmin = await pool.query('SELECT id FROM admin_users LIMIT 1');
    if (existingAdmin.rows.length > 0) {
      return res.status(403).json({ error: 'Admin already exists. Use login instead.' });
    }

    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, rounds);

    const result = await pool.query(
      'INSERT INTO admin_users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email, passwordHash, name || 'Admin', 'admin']
    );

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Setup error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create admin user' });
  }
});

export default router;
