const express = require('express');
const multer = require('multer');
const path = require('path');
const { pool } = require('../db');

const router = express.Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter - only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Upload profile photo
router.post('/upload-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get user ID from multiple sources: session, JWT, or request body
    const userId = req.session?.userId || req.userId || req.body.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const photoPath = `/uploads/${req.file.filename}`;

    // Update user profile photo in database
    await pool.query(
      'UPDATE users SET profile_photo = $1 WHERE id = $2',
      [photoPath, userId]
    );

    res.json({
      success: true,
      message: 'Profile photo uploaded successfully',
      path: photoPath
    });
  } catch (error) {
    console.error('[Profile] Upload error:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// Get profile photo
router.get('/photo/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      'SELECT profile_photo FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      photoPath: result.rows[0].profile_photo
    });
  } catch (error) {
    console.error('[Profile] Get photo error:', error);
    res.status(500).json({ error: 'Failed to get photo' });
  }
});

// Delete profile photo
router.delete('/photo', async (req, res) => {
  try {
    // Get user ID from multiple sources: session, JWT, query param, or request body
    const userId = req.session?.userId || req.userId || req.query.userId || req.body.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await pool.query(
      'UPDATE users SET profile_photo = NULL WHERE id = $1',
      [userId]
    );

    res.json({
      success: true,
      message: 'Profile photo deleted successfully'
    });
  } catch (error) {
    console.error('[Profile] Delete photo error:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

module.exports = router;
