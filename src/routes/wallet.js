import express from 'express';
import prisma from '../prisma.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Get wallet summary and transaction list
router.get('/', authMiddleware, async (req, res) => {
  try {
    const transactions = await prisma.walletTransaction.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate sum of charges and redirections
    let collected = 0;
    let redirected = 0;

    transactions.forEach(t => {
      if (t.type === 'charge') {
        collected += t.amount;
      } else if (t.type === 'redirection') {
        redirected += t.amount;
      }
    });

    const balance = collected - redirected;

    res.json({
      balance,
      collected,
      redirected,
      transactions
    });
  } catch (error) {
    console.error('Wallet summary fetch error:', error);
    res.status(500).json({ error: 'Could not fetch wallet summary.' });
  }
});

// Post a redirection (spending penalty money on positive deeds)
router.post('/redirect', authMiddleware, async (req, res) => {
  try {
    const { date, amount, category, description } = req.body;

    if (!date || !amount || !category || !description) {
      return res.status(400).json({ error: 'Date, amount, category, and description are required.' });
    }

    const redirectAmount = parseFloat(amount);
    if (redirectAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero.' });
    }

    // Fetch existing transactions to verify balance
    const transactions = await prisma.walletTransaction.findMany({
      where: { userId: req.userId }
    });

    let collected = 0;
    let redirected = 0;

    transactions.forEach(t => {
      if (t.type === 'charge') {
        collected += t.amount;
      } else if (t.type === 'redirection') {
        redirected += t.amount;
      }
    });

    const currentBalance = collected - redirected;

    if (redirectAmount > currentBalance) {
      return res.status(400).json({
        error: `Insufficient balance in accountability wallet. Current balance: ₹${currentBalance}.`
      });
    }

    // Log the redirection transaction
    const transaction = await prisma.walletTransaction.create({
      data: {
        userId: req.userId,
        date,
        type: 'redirection',
        amount: redirectAmount,
        category,
        description
      }
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Create redirection error:', error);
    res.status(500).json({ error: 'Could not process redirection transaction.' });
  }
});

export default router;
