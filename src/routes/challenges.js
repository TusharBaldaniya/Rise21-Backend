import express from 'express';
import prisma from '../prisma.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Create a new challenge
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, startDate, endDate, durationDays, dailyTarget, penaltyAmount, icon, whyStarted } = req.body;

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
        isActive: true,
        icon: icon || '🎯',
        whyStarted: whyStarted || ''
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
      include: {
        checkIns: {
          orderBy: { date: 'asc' }
        }
      },
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

// Update a challenge (e.g. edit title/details or extend duration)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, dailyTarget, penaltyAmount, icon, whyStarted, durationDays } = req.body;
    
    const challenge = await prisma.challenge.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found.' });
    }

    let endDateUpdate = undefined;
    if (durationDays !== undefined) {
      const parsedDays = parseInt(durationDays, 10);
      if (isNaN(parsedDays) || parsedDays <= 0) {
        return res.status(400).json({ error: 'Duration days must be a positive integer.' });
      }
      const start = new Date(challenge.startDate);
      start.setDate(start.getDate() + parsedDays);
      endDateUpdate = start;
    }

    const updated = await prisma.challenge.update({
      where: { id: challenge.id },
      data: {
        title: title !== undefined ? title : challenge.title,
        description: description !== undefined ? description : challenge.description,
        dailyTarget: dailyTarget !== undefined ? dailyTarget : challenge.dailyTarget,
        penaltyAmount: penaltyAmount !== undefined ? parseFloat(penaltyAmount) : challenge.penaltyAmount,
        icon: icon !== undefined ? icon : challenge.icon,
        whyStarted: whyStarted !== undefined ? whyStarted : challenge.whyStarted,
        durationDays: durationDays !== undefined ? parseInt(durationDays, 10) : challenge.durationDays,
        endDate: endDateUpdate !== undefined ? endDateUpdate : challenge.endDate
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Challenge update error:', error);
    res.status(500).json({ error: 'Could not update challenge.' });
  }
});

export default router;
