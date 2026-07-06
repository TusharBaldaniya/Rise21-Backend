import express from 'express';
import prisma from '../prisma.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Get mind logs for a date
router.get('/mindcheck/:date', authMiddleware, async (req, res) => {
  try {
    const { date } = req.params;
    const logs = await prisma.mindCheckLog.findMany({
      where: {
        userId: req.userId,
        date
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    console.error('Fetch mind check logs error:', error);
    res.status(500).json({ error: 'Could not fetch mind logs.' });
  }
});

// Post a mind check log
router.post('/mindcheck', authMiddleware, async (req, res) => {
  try {
    const { date, triggerName, penaltyAmount } = req.body;

    if (!date || !triggerName || penaltyAmount === undefined) {
      return res.status(400).json({ error: 'Date, trigger name, and penalty amount are required.' });
    }

    // Create log
    const log = await prisma.mindCheckLog.create({
      data: {
        userId: req.userId,
        date,
        triggerName,
        penaltyAmount: parseFloat(penaltyAmount)
      }
    });

    // Create wallet charge transaction if penalty > 0
    let transaction = null;
    if (parseFloat(penaltyAmount) > 0) {
      transaction = await prisma.walletTransaction.create({
        data: {
          userId: req.userId,
          date,
          type: 'charge',
          amount: parseFloat(penaltyAmount),
          category: 'Mind Check Trigger',
          // Store log ID in description for easy reverse matching when deleting
          description: `Mind slip-up: ${triggerName} (Ref: ${log.id})`
        }
      });
    }

    res.status(201).json({ log, transaction });
  } catch (error) {
    console.error('Create mind check log error:', error);
    res.status(500).json({ error: 'Could not log mind trigger.' });
  }
});

// Delete a mind check log
router.delete('/mindcheck/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const log = await prisma.mindCheckLog.findFirst({
      where: { id, userId: req.userId }
    });

    if (!log) {
      return res.status(404).json({ error: 'Log not found.' });
    }

    // Delete the log
    await prisma.mindCheckLog.delete({
      where: { id }
    });

    // Delete corresponding transaction using the reference log ID
    await prisma.walletTransaction.deleteMany({
      where: {
        userId: req.userId,
        type: 'charge',
        category: 'Mind Check Trigger',
        description: { contains: `(Ref: ${id})` }
      }
    });

    res.json({ message: 'Mind check log deleted successfully.' });
  } catch (error) {
    console.error('Delete mind check log error:', error);
    res.status(500).json({ error: 'Could not delete mind check log.' });
  }
});

// Get reflection for a date
router.get('/reflection/:date', authMiddleware, async (req, res) => {
  try {
    const { date } = req.params;
    const reflection = await prisma.reflection.findUnique({
      where: {
        date_userId: {
          date,
          userId: req.userId
        }
      }
    });
    res.json(reflection || null);
  } catch (error) {
    console.error('Fetch reflection error:', error);
    res.status(500).json({ error: 'Could not fetch reflection.' });
  }
});

// Get all reflections
router.get('/reflection', authMiddleware, async (req, res) => {
  try {
    const reflections = await prisma.reflection.findMany({
      where: { userId: req.userId },
      orderBy: { date: 'desc' }
    });
    res.json(reflections);
  } catch (error) {
    console.error('Fetch all reflections error:', error);
    res.status(500).json({ error: 'Could not fetch reflections.' });
  }
});

// Create or update reflection
router.post('/reflection', authMiddleware, async (req, res) => {
  try {
    const { date, goodThing, mistake, improvement, gratitude, mood } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required.' });
    }

    const reflection = await prisma.reflection.upsert({
      where: {
        date_userId: {
          date,
          userId: req.userId
        }
      },
      update: {
        goodThing: goodThing || '',
        mistake: mistake || '',
        improvement: improvement || '',
        gratitude: gratitude || '',
        mood: mood || null
      },
      create: {
        userId: req.userId,
        date,
        goodThing: goodThing || '',
        mistake: mistake || '',
        improvement: improvement || '',
        gratitude: gratitude || '',
        mood: mood || null
      }
    });

    res.json(reflection);
  } catch (error) {
    console.error('Save reflection error:', error);
    res.status(500).json({ error: 'Could not save reflection.' });
  }
});

export default router;
