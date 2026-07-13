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
import prisma from './prisma.js';

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
  // Bhagavad Gita
  {
    text: "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन। (પોતાના કર્તવ્ય કર્મ કરવા પર જ તારો અધિકાર છે, તેના ફળ પર ક્યારેય નહીં.)",
    author: "Bhagavad Gita",
    category: "discipline"
  },
  {
    text: "योगः कर्मसु कौशलम् — योग अर्थात् कर्मों में कुशलता ही सच्ची कुशलता है।",
    author: "Bhagavad Gita",
    category: "discipline"
  },
  {
    text: "उद्धरेदात्मनात्मानं नात्मानमवसादयेत्। आत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः॥ (મનુષ્યે પોતાના દ્વારા પોતાનો ઉદ્ધાર કરવો જોઈએ.)",
    author: "Bhagavad Gita",
    category: "spirituality"
  },
  {
    text: "ध्यायतो विषयान्पुंसः सङ्गस्तेषूपजायते। सङ्गात्संजायते कामः कामात्क्रोधोऽभिजायते॥",
    author: "Bhagavad Gita",
    category: "wisdom"
  },
  {
    text: "सुखदुःखे समे कृत्वा लाभालाभौ जयाजयौ। (सुख-दुःख, लाभ-हानि और जय-पराजय को समान मानकर युद्ध करो।)",
    author: "Bhagavad Gita",
    category: "wisdom"
  },
  // Pandurang Shastri Athavale
  {
    text: "ભક્તિ એ માત્ર પૂજા-પાઠ નથી, પરંતુ જીવનના પ્રત્યેક સત્કાર્યને ઇશ્વરીય કાર્ય ગણવું તે સાચી ભક્તિ છે.",
    author: "Pandurang Shastri Athavale",
    category: "spirituality"
  },
  {
    text: "સમાજ પરિવર્તન પહેલાં સ્વયં પરિવર્તન જરૂરી છે, તે જ સાચી શિસ્ત અને તપસ્યા છે.",
    author: "Pandurang Shastri Athavale",
    category: "discipline"
  },
  {
    text: "કૃતજ્ઞતા એ માનવ સંસ્કૃતિનો પ્રાણ છે. ઇશ્વર પ્રત્યે સદાય કૃતજ્ઞ બનો.",
    author: "Pandurang Shastri Athavale",
    category: "wisdom"
  },
  {
    text: "જે વ્યક્તિ પોતાના વિચારો અને વાણી પર કાબુ મેળવી શકે છે તે જ સાચો સ્વાધ્યાયી છે.",
    author: "Pandurang Shastri Athavale",
    category: "wisdom"
  },
  // Bhagat Singh
  {
    text: "जिंदगी तो अपने दम पर जी जाती है, दूसरों के कंधों पर तो सिर्फ जनाजे उठाए जाते हैं।",
    author: "Bhagat Singh",
    category: "discipline"
  },
  {
    text: "राख का हर एक कण मेरी गर्मी से गतिमान है, मैं एक ऐसा पागल हूँ जो जेल में भी आज़ाद है।",
    author: "Bhagat Singh",
    category: "wisdom"
  },
  {
    text: "लिख रहा हूँ मैं अंजाम जिसका कल आगाज आयेगा, मेरे लहू का हर एक कतरा इंकलाब लायेगा।",
    author: "Bhagat Singh",
    category: "wisdom"
  },
  // Swami Vivekananda
  {
    text: "उठो, जागो और तब तक मत रुको जब तक लक्ष्य प्राप्त न हो जाए।",
    author: "Swami Vivekananda",
    category: "discipline"
  },
  {
    text: "एक समय में एक काम करो, और ऐसा करते समय अपनी पूरी आत्मा उसमें डाल दो और बाकी सब कुछ भूल जाओ।",
    author: "Swami Vivekananda",
    category: "discipline"
  },
  {
    text: "તમારી અંદર રહેલી દૈવી શક્તિને ઓળખો, આત્મવિશ્વાસથી જ મહાન જીવન ઘડી શકાય છે.",
    author: "Swami Vivekananda",
    category: "wisdom"
  },
  {
    text: "જેવો તમારો વિચાર હશે, તેવું જ તમારું જીવન બનશે. હંમેશા ઉચ્ચ અને ઉદાત્ત વિચારો જ સેવો.",
    author: "Swami Vivekananda",
    category: "wisdom"
  },
  {
    text: "खुद को कमजोर समझना सबसे बड़ा पाप है। अपने आप पर अटूट विश्वास रखो।",
    author: "Swami Vivekananda",
    category: "spirituality"
  },
  // Chhatrapati Shivaji Maharaj
  {
    text: "જ્યારે ધ્યેય પર્વત જેવડું ઊંચું હોય, ત્યારે ધીરજ અને પુરુષાર્થ પણ અસાધારણ હોવા જોઈએ.",
    author: "Chhatrapati Shivaji Maharaj",
    category: "discipline"
  },
  {
    text: "स्वतंत्रता एक वरदान है, जिसे केवल पुरुषार्थ और पराक्रम से ही सुरक्षित रखा जा सकता है।",
    author: "Chhatrapati Shivaji Maharaj",
    category: "wisdom"
  },
  // Netaji Subhas Chandra Bose
  {
    text: "યાદ રાખો, સૌથી મોટો ગુનો અન્યાય અને ખોટી બાબત સાથે સમાધાન કરવું છે.",
    author: "Netaji Subhas Chandra Bose",
    category: "discipline"
  },
  {
    text: "सफलता हमेशा बलिदान मांगती है, बिना संघर्ष के कोई महान कार्य सिद्ध नहीं होता।",
    author: "Netaji Subhas Chandra Bose",
    category: "wisdom"
  },
  // Chanakya
  {
    text: "मनसि एकं वचसि एकं कर्मणि एकं महात्मनाम्। (મહાત્માઓનું મન, વાણી અને કર્મ હંમેશાં એક સમાન હોય છે.)",
    author: "Chanakya",
    category: "discipline"
  },
  {
    text: "आलस्यं हि मनुष्याणां शरीरस्थो महान् रिपुः। (આળસ એ મનુષ્યના શરીરનો સૌથી મોટો શત્રુ છે.)",
    author: "Chanakya",
    category: "discipline"
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
app.get('/api/quote', async (req, res) => {
  try {
    const dbQuotes = await prisma.quote.findMany();
    if (dbQuotes.length === 0) {
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      return res.json(randomQuote);
    }
    const randomQuote = dbQuotes[Math.floor(Math.random() * dbQuotes.length)];
    res.json(randomQuote);
  } catch (error) {
    console.error('Fetch quote error:', error);
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    res.json(randomQuote);
  }
});

// Seed quotes if database is empty
async function seedQuotes() {
  try {
    const count = await prisma.quote.count();
    if (count === 0) {
      console.log('🌱 Seeding initial quotes to database...');
      await prisma.quote.createMany({
        data: quotes
      });
      console.log('✅ Seeding complete.');
    }
  } catch (error) {
    console.error('Error seeding quotes:', error);
  }
}
seedQuotes();

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
