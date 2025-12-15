import express from 'express';
import pool from '../config/database.js';
import { reviewValidation } from '../middleware/validators.js';

const router = express.Router();

// Get all approved reviews
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM reviews WHERE is_approved = true ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Submit a new review (with validation)
router.post('/', reviewValidation, async (req, res) => {
  try {
    const {
      customerName,
      customerEmail,
      rating,
      reviewText,
      bookingId
    } = req.body;

    const result = await pool.query(
      `INSERT INTO reviews (customer_name, customer_email, rating, review_text, booking_id, is_approved)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING *`,
      [customerName, customerEmail, rating, reviewText, bookingId]
    );

    res.status(201).json({
      success: true,
      message: 'Review submitted and pending approval',
      review: result.rows[0]
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// Get average rating
router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
       FROM reviews WHERE is_approved = true`
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching review stats:', error);
    res.status(500).json({ error: 'Failed to fetch review statistics' });
  }
});

export default router;
