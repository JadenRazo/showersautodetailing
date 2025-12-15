import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Get all gallery photos (featured first)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT g.*, s.name as service_name
       FROM gallery_photos g
       LEFT JOIN services s ON g.service_id = s.id
       ORDER BY g.is_featured DESC, g.sort_order ASC, g.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching gallery:', error);
    res.status(500).json({ error: 'Failed to fetch gallery photos' });
  }
});

// Get featured photos only
router.get('/featured', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT g.*, s.name as service_name
       FROM gallery_photos g
       LEFT JOIN services s ON g.service_id = s.id
       WHERE g.is_featured = true
       ORDER BY g.sort_order ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching featured photos:', error);
    res.status(500).json({ error: 'Failed to fetch featured photos' });
  }
});

export default router;
