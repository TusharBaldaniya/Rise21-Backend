import express from 'express';
import prisma from '../prisma.js';
import authMiddleware from '../middleware/auth.js';
import adminMiddleware from '../middleware/admin.js';
import { broadcastPushNotification } from '../index.js';

const router = express.Router();

// Apply auth and admin checks to all admin endpoints
router.use(authMiddleware);
router.use(adminMiddleware);

// --- User Management ---

// Get all users with stats
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            challenges: true,
            checkIns: true,
            mindLogs: true,
            selfies: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(users);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: 'Could not fetch users list.' });
  }
});

// Update user role
router.put('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (role !== 'user' && role !== 'admin') {
      return res.status(400).json({ error: 'Invalid role. Must be user or admin.' });
    }

    // Prevent admin from demoting themselves (optional safety check)
    if (id === req.userId && role !== 'admin') {
      return res.status(400).json({ error: 'You cannot demote yourself from administrative privileges.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        username: true,
        name: true,
        role: true
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Could not update user role.' });
  }
});

// Reset user data (wipe tracking history but keep user account)
router.post('/users/:id/reset', async (req, res) => {
  try {
    const { id } = req.params;

    const userExists = await prisma.user.findUnique({
      where: { id }
    });

    if (!userExists) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Perform transaction to wipe user-related tables
    await prisma.$transaction([
      prisma.dailyCheckIn.deleteMany({ where: { userId: id } }),
      prisma.challenge.deleteMany({ where: { userId: id } }),
      prisma.mindCheckLog.deleteMany({ where: { userId: id } }),
      prisma.reflection.deleteMany({ where: { userId: id } }),
      prisma.walletTransaction.deleteMany({ where: { userId: id } }),
      prisma.dailySelfie.deleteMany({ where: { userId: id } }),
      prisma.user.update({
        where: { id },
        data: { restarts: '[]' }
      })
    ]);

    res.json({ message: 'User tracking data reset successfully.' });
  } catch (error) {
    console.error('Reset user data error:', error);
    res.status(500).json({ error: 'Could not reset user data.' });
  }
});

// Fully delete user account
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.userId) {
      return res.status(400).json({ error: 'You cannot delete your own admin account.' });
    }

    const userExists = await prisma.user.findUnique({
      where: { id }
    });

    if (!userExists) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Prisma relation cascade delete will take care of children
    await prisma.user.delete({
      where: { id }
    });

    res.json({ message: 'User account and all associated data deleted successfully.' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Could not delete user account.' });
  }
});

// --- Quote Management ---

// Get all quotes
router.get('/quotes', async (req, res) => {
  try {
    const quotesList = await prisma.quote.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(quotesList);
  } catch (error) {
    console.error('Fetch quotes error:', error);
    res.status(500).json({ error: 'Could not fetch quotes.' });
  }
});

// Create new quote
router.post('/quotes', async (req, res) => {
  try {
    const { text, author, category } = req.body;
    if (!text || !author) {
      return res.status(400).json({ error: 'Quote text and author are required.' });
    }

    const newQuote = await prisma.quote.create({
      data: {
        text,
        author,
        category: category || 'general'
      }
    });

    res.status(201).json(newQuote);
  } catch (error) {
    console.error('Create quote error:', error);
    res.status(500).json({ error: 'Could not create quote.' });
  }
});

// Edit existing quote
router.put('/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { text, author, category } = req.body;

    if (!text || !author) {
      return res.status(400).json({ error: 'Quote text and author are required.' });
    }

    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: {
        text,
        author,
        category: category || 'general'
      }
    });

    res.json(updatedQuote);
  } catch (error) {
    console.error('Update quote error:', error);
    res.status(500).json({ error: 'Could not update quote.' });
  }
});

// Delete quote
router.delete('/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.quote.delete({
      where: { id }
    });

    res.json({ message: 'Quote deleted successfully.' });
  } catch (error) {
    console.error('Delete quote error:', error);
    res.status(500).json({ error: 'Could not delete quote.' });
  }
});

// --- Broadcast Notification Announcements ---

// Post announcement
router.post('/announcements', async (req, res) => {
  try {
    const { title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required for announcements.' });
    }

    const newAnnouncement = await prisma.announcement.create({
      data: {
        title,
        message
      }
    });

    // Immediately dispatch Web Push notification to all active devices
    broadcastPushNotification(title, message).catch(err => {
      console.error('Error broadcasting push notification for announcement:', err);
    });

    res.status(201).json(newAnnouncement);
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: 'Could not post announcement.' });
  }
});

// Delete announcement
router.delete('/announcements/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.announcement.delete({
      where: { id }
    });

    res.json({ message: 'Announcement deleted successfully.' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ error: 'Could not delete announcement.' });
  }
});

export default router;
