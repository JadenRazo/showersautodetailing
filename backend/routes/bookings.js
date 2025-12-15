import express from 'express';
import pool from '../config/database.js';
import { sendNotification } from '../middleware/notifications.js';
import { bookingValidation, idParamValidation } from '../middleware/validators.js';
import { bookingLimiter } from '../middleware/rateLimiter.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Create a new booking (public with rate limiting and validation)
router.post('/', bookingLimiter, bookingValidation, async (req, res) => {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      vehicleType,
      packageId,
      serviceId,
      addonIds,
      bookingDate,
      bookingTime,
      address,
      notes
    } = req.body;

    let totalAmount = 0;
    let serviceName = '';

    // Determine pricing based on service or package
    if (serviceId) {
      // Use new services table with fixed pricing
      const serviceResult = await pool.query(
        'SELECT name, sedan_price, suv_price, truck_price FROM services WHERE id = $1',
        [serviceId]
      );

      if (serviceResult.rows.length === 0) {
        return res.status(404).json({ error: 'Service not found' });
      }

      const service = serviceResult.rows[0];
      serviceName = service.name;
      const vehicle = vehicleType.toLowerCase();

      // Map vehicle type to price column (commercial uses truck_price)
      if (vehicle === 'sedan') {
        totalAmount = parseFloat(service.sedan_price);
      } else if (vehicle === 'suv') {
        totalAmount = parseFloat(service.suv_price);
      } else {
        totalAmount = parseFloat(service.truck_price); // commercial
      }
    } else if (packageId) {
      // Fallback to legacy packages table
      const packageResult = await pool.query(
        'SELECT name, base_price, vehicle_multipliers FROM packages WHERE id = $1',
        [packageId]
      );

      if (packageResult.rows.length === 0) {
        return res.status(404).json({ error: 'Package not found' });
      }

      const { name, base_price, vehicle_multipliers } = packageResult.rows[0];
      serviceName = name;
      const multiplier = vehicle_multipliers[vehicleType.toLowerCase()] || 1.0;
      totalAmount = parseFloat(base_price) * multiplier;
    } else {
      return res.status(400).json({ error: 'Service or package ID required' });
    }

    // Calculate addon costs if any
    let addonTotal = 0;
    const addonDetails = [];

    if (addonIds && Array.isArray(addonIds) && addonIds.length > 0) {
      const vehicle = vehicleType.toLowerCase();
      const priceColumn = vehicle === 'commercial' ? 'commercial_price'
        : vehicle === 'suv' ? 'suv_price' : 'sedan_price';

      const placeholders = addonIds.map((_, i) => `$${i + 1}`).join(',');
      const addonResult = await pool.query(
        `SELECT id, name, ${priceColumn} as price FROM addons
         WHERE id IN (${placeholders}) AND is_active = true`,
        addonIds
      );

      for (const addon of addonResult.rows) {
        addonTotal += parseFloat(addon.price);
        addonDetails.push({
          id: addon.id,
          name: addon.name,
          price: parseFloat(addon.price)
        });
      }
    }

    totalAmount += addonTotal;

    // Get deposit percentage from settings
    const settingsResult = await pool.query(
      "SELECT value FROM settings WHERE key = 'deposit_percentage'"
    );
    const depositPercentage = settingsResult.rows.length > 0
      ? parseFloat(settingsResult.rows[0].value)
      : parseFloat(process.env.DEPOSIT_PERCENTAGE || 0.25);

    const depositAmount = totalAmount * depositPercentage;

    // Insert booking
    const result = await pool.query(
      `INSERT INTO bookings
       (customer_name, customer_email, customer_phone, vehicle_type, package_id, service_id,
        booking_date, booking_time, address, notes, total_amount, deposit_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [customerName, customerEmail, customerPhone, vehicleType, packageId || null, serviceId || null,
       bookingDate, bookingTime, address, notes, totalAmount, depositAmount, 'pending']
    );

    const booking = result.rows[0];

    // Insert selected addons into booking_addons table
    if (addonDetails.length > 0) {
      const addonInserts = addonDetails.map(addon =>
        pool.query(
          'INSERT INTO booking_addons (booking_id, addon_id, price_charged) VALUES ($1, $2, $3)',
          [booking.id, addon.id, addon.price]
        )
      );
      await Promise.all(addonInserts);
    }

    // Send notification
    await sendNotification({
      type: 'new_booking',
      data: {
        bookingId: booking.id,
        customerName,
        customerEmail,
        customerPhone,
        vehicleType,
        serviceName,
        bookingDate,
        bookingTime,
        totalAmount,
        depositAmount,
        addons: addonDetails
      }
    });

    res.status(201).json({
      success: true,
      booking,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      depositAmount: parseFloat(depositAmount.toFixed(2)),
      addons: addonDetails
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Get all bookings (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, p.name as package_name
       FROM bookings b
       LEFT JOIN packages p ON b.package_id = p.id
       ORDER BY b.booking_date DESC, b.booking_time DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get single booking (with ID validation)
router.get('/:id', idParamValidation, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT b.*, p.name as package_name, p.description as package_description
       FROM bookings b
       LEFT JOIN packages p ON b.package_id = p.id
       WHERE b.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// Update booking status (admin only)
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(
      'UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

export default router;
