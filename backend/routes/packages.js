import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Get all active packages
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM packages WHERE is_active = true ORDER BY sort_order ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// Get single package by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM packages WHERE id = $1 AND is_active = true',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching package:', error);
    res.status(500).json({ error: 'Failed to fetch package' });
  }
});

// Calculate price for a specific package and vehicle type
router.post('/calculate-price', async (req, res) => {
  try {
    const { packageId, vehicleType } = req.body;

    if (!packageId || !vehicleType) {
      return res.status(400).json({ error: 'Package ID and vehicle type required' });
    }

    const result = await pool.query(
      'SELECT base_price, vehicle_multipliers FROM packages WHERE id = $1 AND is_active = true',
      [packageId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const { base_price, vehicle_multipliers } = result.rows[0];
    const multiplier = vehicle_multipliers[vehicleType.toLowerCase()] || 1.0;
    const finalPrice = parseFloat(base_price) * multiplier;

    res.json({
      basePrice: parseFloat(base_price),
      multiplier,
      finalPrice: parseFloat(finalPrice.toFixed(2)),
      vehicleType
    });
  } catch (error) {
    console.error('Error calculating price:', error);
    res.status(500).json({ error: 'Failed to calculate price' });
  }
});

export default router;
