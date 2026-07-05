import express from 'express';
import prisma from '../prisma.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Create a new challenge
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, startDate, endDate, durationDays, dailyTarget, penaltyAmount } = req.body;

    if (!title || !startDate || !endDate || !durationDays || !dailyTarget) {
      return res.status(400).json({ error: 'Title, start date, end date, duration, and daily target are required.' });
    }

    const challenge = await prisma.challenge.create({
      data: {
        userId: req.userId,
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        durationDays: parseInt(durationDays, 10),
        dailyTarget,
        penaltyAmount: parseFloat(penaltyAmount || 0),
        isActive: true
      }
    });

    res.status(201).json(challenge);
  } catch (error) {
    console.error('Challenge creation error:', error);
    res.status(500).json({ error: 'Could not create challenge.' });
  }
});

// List all user's challenges
router.get('/', authMiddleware, async (req, res) => {
  try {
    const challenges = await prisma.challenge.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(challenges);
  } catch (error) {
    console.error('Challenges fetch error:', error);
    res.status(500).json({ error: 'Could not fetch challenges.' });
  }
});

// Get a single challenge by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const challenge = await prisma.challenge.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      },
      include: {
        checkIns: {
          orderBy: { date: 'asc' }
        }
      }
    });

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found.' });
    }

    res.json(challenge);
  } catch (error) {
    console.error('Challenge details fetch error:', error);
    res.status(500).json({ error: 'Could not fetch challenge details.' });
  }
});

// Archive/Deactivate challenge
router.put('/:id/archive', authMiddleware, async (req, res) => {
  try {
    const challenge = await prisma.challenge.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found.' });
    }

    const updated = await prisma.challenge.update({
      where: { id: challenge.id },
      data: { isActive: false }
    });

    res.json(updated);
  } catch (error) {
    console.error('Challenge archive error:', error);
    res.status(500).json({ error: 'Could not archive challenge.' });
  }
});

// Delete a challenge
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const challenge = await prisma.challenge.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found.' });
    }

    await prisma.challenge.delete({
      where: { id: challenge.id }
    });

    res.json({ message: 'Challenge deleted successfully.' });
  } catch (error) {
    console.error('Challenge delete error:', error);
    res.status(500).json({ error: 'Could not delete challenge.' });
  }
});

export default router;
