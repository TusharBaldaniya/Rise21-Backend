import express from 'express';
import prisma from '../prisma.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Get checkins for a specific date (YYYY-MM-DD)
router.get('/date/:date', authMiddleware, async (req, res) => {
  try {
    const { date } = req.params;
    const checkIns = await prisma.dailyCheckIn.findMany({
      where: {
        userId: req.userId,
        date
      },
      include: {
        challenge: true
      }
    });
    res.json(checkIns);
  } catch (error) {
    console.error('Fetch checkins by date error:', error);
    res.status(500).json({ error: 'Could not fetch checkins for date.' });
  }
});

// Create or update a daily checkin
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { challengeId, date, status, reason } = req.body;

    if (!challengeId || !date || !status) {
      return res.status(400).json({ error: 'challengeId, date, and status are required.' });
    }

    if (status !== 'completed' && status !== 'missed') {
      return res.status(400).json({ error: 'Status must be either "completed" or "missed".' });
    }

    // Retrieve challenge
    const challenge = await prisma.challenge.findFirst({
      where: { id: challengeId, userId: req.userId }
    });

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found.' });
    }

    const penaltyAmount = status === 'missed' ? challenge.penaltyAmount : 0;

    // Check if check-in already exists
    const existingCheckIn = await prisma.dailyCheckIn.findUnique({
      where: {
        challengeId_date: {
          challengeId,
          date
        }
      }
    });

    let checkIn;

    if (existingCheckIn) {
      const oldStatus = existingCheckIn.status;

      // Update check-in
      checkIn = await prisma.dailyCheckIn.update({
        where: { id: existingCheckIn.id },
        data: {
          status,
          reason: reason || null,
          penaltyCharged: penaltyAmount
        }
      });

      // Handle transactions update
      if (oldStatus === 'missed' && status === 'completed') {
        // Delete corresponding penalty transaction
        await prisma.walletTransaction.deleteMany({
          where: {
            userId: req.userId,
            date,
            type: 'charge',
            category: 'Challenge Penalty',
            description: { startsWith: `Missed: ${challenge.title}` }
          }
        });
      } else if (oldStatus === 'completed' && status === 'missed') {
        // Create penalty transaction
        if (penaltyAmount > 0) {
          await prisma.walletTransaction.create({
            data: {
              userId: req.userId,
              date,
              type: 'charge',
              amount: penaltyAmount,
              category: 'Challenge Penalty',
              description: `Missed: ${challenge.title}${reason ? ` (Reason: ${reason})` : ''}`
            }
          });
        }
      } else if (oldStatus === 'missed' && status === 'missed') {
        // Reason might have updated, adjust transaction description
        await prisma.walletTransaction.deleteMany({
          where: {
            userId: req.userId,
            date,
            type: 'charge',
            category: 'Challenge Penalty',
            description: { startsWith: `Missed: ${challenge.title}` }
          }
        });
        if (penaltyAmount > 0) {
          await prisma.walletTransaction.create({
            data: {
              userId: req.userId,
              date,
              type: 'charge',
              amount: penaltyAmount,
              category: 'Challenge Penalty',
              description: `Missed: ${challenge.title}${reason ? ` (Reason: ${reason})` : ''}`
            }
          });
        }
      }
    } else {
      // Create new check-in
      checkIn = await prisma.dailyCheckIn.create({
        data: {
          userId: req.userId,
          challengeId,
          date,
          status,
          reason: reason || null,
          penaltyCharged: penaltyAmount
        }
      });

      // Create transaction if missed and penalty > 0
      if (status === 'missed' && penaltyAmount > 0) {
        await prisma.walletTransaction.create({
          data: {
            userId: req.userId,
            date,
            type: 'charge',
            amount: penaltyAmount,
            category: 'Challenge Penalty',
            description: `Missed: ${challenge.title}${reason ? ` (Reason: ${reason})` : ''}`
          }
        });
      }
    }

    res.json(checkIn);
  } catch (error) {
    console.error('Checkin submit error:', error);
    res.status(500).json({ error: 'Could not process check-in.' });
  }
});

export default router;
