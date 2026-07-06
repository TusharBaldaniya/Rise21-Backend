import express from 'express';
import prisma from '../prisma.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Upload/upsert selfie for a date
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { date, imageBlob } = req.body;

    if (!date || !imageBlob) {
      return res.status(400).json({ error: 'Date and image data are required.' });
    }

    const selfie = await prisma.dailySelfie.upsert({
      where: {
        userId_date: {
          userId: req.userId,
          date
        }
      },
      update: {
        imageBlob
      },
      create: {
        userId: req.userId,
        date,
        imageBlob
      }
    });

    res.status(201).json(selfie);
  } catch (error) {
    console.error('Selfie upload error:', error);
    res.status(500).json({ error: 'Could not upload selfie.' });
  }
});

// Get all selfies of the user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const selfies = await prisma.dailySelfie.findMany({
      where: { userId: req.userId },
      orderBy: { date: 'asc' }
    });

    res.json(selfies);
  } catch (error) {
    console.error('Selfies fetch error:', error);
    res.status(500).json({ error: 'Could not fetch selfies.' });
  }
});

export default router;
