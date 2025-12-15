import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Get all active addons (optionally filter by category)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;

    let query = 'SELECT * FROM addons WHERE is_active = true';
    const params = [];

    if (category) {
      query += ' AND category = $1';
      params.push(category);
    }

    query += ' ORDER BY sort_order ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching addons:', error);
    res.status(500).json({ error: 'Failed to fetch addons' });
  }
});

// Get single addon by ID or slug
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;

    // Check if identifier is numeric (ID) or string (slug)
    const isId = /^\d+$/.test(identifier);
    const query = isId
      ? 'SELECT * FROM addons WHERE id = $1 AND is_active = true'
      : 'SELECT * FROM addons WHERE slug = $1 AND is_active = true';

    const result = await pool.query(query, [identifier]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Addon not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching addon:', error);
    res.status(500).json({ error: 'Failed to fetch addon' });
  }
});

// Get all active services with their pricing
router.get('/services/all', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM services WHERE is_active = true ORDER BY id ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Get included and available addons for a specific service
router.get('/services/:serviceId/addons', async (req, res) => {
  try {
    const { serviceId } = req.params;

    // Get included addons for this service
    const includedResult = await pool.query(`
      SELECT a.* FROM addons a
      INNER JOIN service_included_addons sia ON a.id = sia.addon_id
      WHERE sia.service_id = $1 AND a.is_active = true
      ORDER BY a.sort_order ASC
    `, [serviceId]);

    // Get available (recommended) addons for this service
    const availableResult = await pool.query(`
      SELECT a.* FROM addons a
      INNER JOIN service_available_addons saa ON a.id = saa.addon_id
      WHERE saa.service_id = $1 AND a.is_active = true
      ORDER BY a.sort_order ASC
    `, [serviceId]);

    // If no specific available addons configured, return all addons except included ones
    let availableAddons = availableResult.rows;
    if (availableAddons.length === 0) {
      const includedIds = includedResult.rows.map(a => a.id);
      const allAddonsQuery = includedIds.length > 0
        ? 'SELECT * FROM addons WHERE is_active = true AND id NOT IN (' + includedIds.join(',') + ') ORDER BY sort_order ASC'
        : 'SELECT * FROM addons WHERE is_active = true ORDER BY sort_order ASC';
      const allAddonsResult = await pool.query(allAddonsQuery);
      availableAddons = allAddonsResult.rows;
    }

    res.json({
      included: includedResult.rows,
      available: availableAddons
    });
  } catch (error) {
    console.error('Error fetching service addons:', error);
    res.status(500).json({ error: 'Failed to fetch service addons' });
  }
});

// Calculate total price for selected addons
router.post('/calculate', async (req, res) => {
  try {
    const { addonIds, vehicleType } = req.body;

    if (!addonIds || !Array.isArray(addonIds) || addonIds.length === 0) {
      return res.json({ total: 0, addons: [] });
    }

    if (!vehicleType) {
      return res.status(400).json({ error: 'Vehicle type required' });
    }

    const validVehicleTypes = ['sedan', 'suv', 'commercial'];
    const normalizedVehicle = vehicleType.toLowerCase();

    if (!validVehicleTypes.includes(normalizedVehicle)) {
      return res.status(400).json({ error: 'Invalid vehicle type' });
    }

    // Get the price column based on vehicle type
    const priceColumn = normalizedVehicle === 'commercial'
      ? 'commercial_price'
      : normalizedVehicle === 'suv'
        ? 'suv_price'
        : 'sedan_price';

    const placeholders = addonIds.map((_, i) => `$${i + 1}`).join(',');
    const result = await pool.query(
      `SELECT id, name, slug, ${priceColumn} as price FROM addons
       WHERE id IN (${placeholders}) AND is_active = true`,
      addonIds
    );

    const total = result.rows.reduce((sum, addon) => sum + parseFloat(addon.price), 0);

    res.json({
      total: parseFloat(total.toFixed(2)),
      vehicleType: normalizedVehicle,
      addons: result.rows.map(addon => ({
        id: addon.id,
        name: addon.name,
        slug: addon.slug,
        price: parseFloat(addon.price)
      }))
    });
  } catch (error) {
    console.error('Error calculating addon total:', error);
    res.status(500).json({ error: 'Failed to calculate addon total' });
  }
});

// Get standalone addons (can be purchased without a service)
router.get('/standalone/all', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM addons WHERE is_active = true AND is_standalone = true ORDER BY sort_order ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching standalone addons:', error);
    res.status(500).json({ error: 'Failed to fetch standalone addons' });
  }
});

export default router;
