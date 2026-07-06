import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import challengeRoutes from './routes/challenges.js';
import checkinRoutes from './routes/checkins.js';
import journalRoutes from './routes/journal.js';
import walletRoutes from './routes/wallet.js';
import insightsRoutes from './routes/insights.js';
import selfieRoutes from './routes/selfies.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // For local development, allow any origin. Can be tightened later.
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Curated list of discipline, mindfulness, and self-improvement quotes
const quotes = [
  {
    text: "उठो, जागो और तब तक मत रुको जब तक लक्ष्य प्राप्त न हो जाए।",
    author: "Swami Vivekananda",
    category: "spirituality"
  },
  {
    text: "Take risks in your life. If you win, you can lead. If you lose, you can guide.",
    author: "Swami Vivekananda",
    category: "discipline"
  },
  {
    text: "તમારી અંદર રહેલી શક્તિને ઓળખો, આત્મવિશ્વાસથી જીવન બદલી શકાય છે.",
    author: "Swami Vivekananda",
    category: "wisdom"
  },
  {
    text: "ભક્તિ માત્ર મંદિરમાં નથી, જીવનના દરેક કાર્યને ભગવાન માટે કરવું એ સાચી ભક્તિ છે.",
    author: "Pandurang Shastri Athavale",
    category: "spirituality"
  },
  {
    text: "The greatest discipline is to transform yourself before trying to transform society.",
    author: "Pandurang Shastri Athavale",
    category: "discipline"
  },
  {
    text: "जिंदगी तो अपने दम पर जी जाती है, दूसरों के कंधों पर तो जनाजे उठते हैं।",
    author: "Bhagat Singh",
    category: "discipline"
  },
  {
    text: "Never bend your head. Always hold it high.",
    author: "Chhatrapati Shivaji Maharaj",
    category: "wisdom"
  },
  {
    text: "योगः कर्मसु कौशलम् — Excellence comes through disciplined action.",
    author: "Bhagavad Gita",
    category: "spirituality"
  },
  {
    text: "You do not rise to the level of your goals, you fall to the level of your systems.",
    author: "James Clear",
    category: "discipline"
  },
  {
    text: "Discipline is choosing between what you want now and what you want most.",
    author: "Abraham Lincoln",
    category: "discipline"
  },
  {
    text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    author: "Aristotle",
    category: "discipline"
  },
  {
    text: "The man who moves a mountain begins by carrying away small stones.",
    author: "Confucius",
    category: "wisdom"
  },
  {
    text: "Rule your mind or it will rule you.",
    author: "Horace",
    category: "wisdom"
  },
  {
    text: "Do not save what is left after spending, but spend what is left after saving.",
    author: "Warren Buffett",
    category: "wealth"
  },
  {
    text: "Wealth consists not in having great possessions, but in having few wants.",
    author: "Epictetus",
    category: "wealth"
  },
  {
    text: "A penny saved is a penny earned.",
    author: "Benjamin Franklin",
    category: "wealth"
  },
  {
    text: "Reading is to the mind what exercise is to the body.",
    author: "Joseph Addison",
    category: "fitness"
  },
  {
    text: "The body achieves what the mind believes.",
    author: "Unknown",
    category: "fitness"
  },
  {
    text: "Physical fitness is not only one of the most important keys to a healthy body, it is the basis of dynamic and creative intellectual activity.",
    author: "John F. Kennedy",
    category: "fitness"
  }
];

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/selfies', selfieRoutes);
app.get('/api/health', (req, res) => {
  res.send('OK');
});

// Daily Quote Endpoint
app.get('/api/quote', (req, res) => {
  const reqCategories = req.query.categories ? req.query.categories.split(',') : [];
  let filtered = quotes;
  if (reqCategories.length > 0) {
    filtered = quotes.filter(q => q.category && reqCategories.includes(q.category));
  }
  if (filtered.length === 0) {
    filtered = quotes;
  }

  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const quote = filtered[dayOfYear % filtered.length];
  res.json(quote);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Rise21 backend server running on http://localhost:${PORT}`);
});
