import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import challengeRoutes from './routes/challenges.js';
import checkinRoutes from './routes/checkins.js';
import journalRoutes from './routes/journal.js';
import walletRoutes from './routes/wallet.js';
import insightsRoutes from './routes/insights.js';

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
    author: "Swami Vivekananda"
  },
  {
    text: "Take risks in your life. If you win, you can lead. If you lose, you can guide.",
    author: "Swami Vivekananda"
  },
  {
    text: "તમારી અંદર રહેલી શક્તિને ઓળખો, આત્મવિશ્વાસથી જીવન બદલી શકાય છે.",
    author: "Swami Vivekananda"
  },
  {
    text: "ભક્તિ માત્ર મંદિરમાં નથી, જીવનના દરેક કાર્યને ભગવાન માટે કરવું એ સાચી ભક્તિ છે.",
    author: "Pandurang Shastri Athavale"
  },
  {
    text: "The greatest discipline is to transform yourself before trying to transform society.",
    author: "Pandurang Shastri Athavale"
  },
  {
    text: "जिंदगी तो अपने दम पर जी जाती है, दूसरों के कंधों पर तो जनाजे उठते हैं।",
    author: "Bhagat Singh"
  },
  {
    text: "मैं एक इंसान हूँ और जो भी चीज़ इंसानियत को प्रभावित करती है उससे मुझे फर्क पड़ता है।",
    author: "Bhagat Singh"
  },
  {
    text: "Never bend your head. Always hold it high.",
    author: "Chhatrapati Shivaji Maharaj"
  },
  {
    text: "स्वराज्य मेरा जन्मसिद्ध अधिकार नहीं, मेरा धर्म और कर्तव्य है।",
    author: "Inspired by Shivaji Maharaj"
  },
  {
    text: "शौर्य बिना जीवन अधूरा है, और अनुशासन बिना शौर्य व्यर्थ है।",
    author: "Inspired by Maharana Pratap"
  },
  {
    text: "जो अपने धर्म, सम्मान और कर्तव्य के लिए खड़ा रहता है वही सच्चा योद्धा है।",
    author: "Maharana Pratap"
  },
  {
    text: "मैं अपनी झांसी नहीं दूंगी।",
    author: "Rani Lakshmi Bai"
  },
  {
    text: "Courage and determination can defeat even the strongest enemy.",
    author: "Inspired by Rani Lakshmi Bai"
  },
  {
    text: "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।",
    author: "Bhagavad Gita"
  },
  {
    text: "योगः कर्मसु कौशलम् — Excellence comes through disciplined action.",
    author: "Bhagavad Gita"
  },
  {
    text: "मन एव मनुष्याणां कारणं बन्धमोक्षयोः — Your mind can be your prison or your freedom.",
    author: "Amritabindu Upanishad"
  },
  {
    text: "You do not rise to the level of your goals, you fall to the level of your systems.",
    author: "James Clear"
  },
  {
    text: "Discipline is choosing between what you want now and what you want most.",
    author: "Abraham Lincoln"
  },
  {
    text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    author: "Aristotle"
  },
  {
    text: "The man who moves a mountain begins by carrying away small stones.",
    author: "Confucius"
  },
  {
    text: "Rule your mind or it will rule you.",
    author: "Horace"
  },
  {
    text: "નાના નાના સારા કર્મો રોજ કરવાથી જ મહાન જીવન બને છે.",
    author: "Indian Wisdom"
  },
  {
    text: "તમારા વિચારો બદલો, તમારી આદતો બદલાશે. તમારી આદતો બદલો, તમારું જીવન બદલાશે.",
    author: "Indian Wisdom"
  },
  {
    text: "A warrior wins the battle first inside his mind, then outside in the world.",
    author: "Inspired by Indian Warriors"
  },
  {
    text: "સૂર્યની જેમ રોજ ઉગો, ગઈકાલની હાર આજે જીતમાં બદલી શકાય છે.",
    author: "Daily Discipline"
  }
];

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/insights', insightsRoutes);

// Daily Quote Endpoint
app.get('/api/quote', (req, res) => {
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const quote = quotes[dayOfYear % quotes.length];
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
  console.log(`🚀 Sadhna backend server running on http://localhost:${PORT}`);
});
