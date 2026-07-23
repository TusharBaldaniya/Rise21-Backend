import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import webpush from 'web-push';
import cron from 'node-cron';
import authRoutes from './routes/auth.js';
import challengeRoutes from './routes/challenges.js';
import checkinRoutes from './routes/checkins.js';
import journalRoutes from './routes/journal.js';
import walletRoutes from './routes/wallet.js';
import insightsRoutes from './routes/insights.js';
import selfieRoutes from './routes/selfies.js';
import adminRoutes from './routes/admin.js';
import announcementRoutes from './routes/announcements.js';
import prisma from './prisma.js';

dotenv.config();

// Web Push VAPID Configuration
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || 'BGrdbGwYAZCIMN_HAbUp14Wwgxb2uEZyn2KrCDjxRcoh8lrvEa3OWLxBlLtqXBFmzXjiyJrNbcw-6dGZ3hY6yQw';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '8lqt_vvpwSu97VhK2gXs0F48Xv9i0G6CNcfc2-SSSps';

webpush.setVapidDetails(
  'mailto:tushar.baldaniya@rise21.app',
  vapidPublicKey,
  vapidPrivateKey
);

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
    text: "न हि कल्याणकृत्कश्चिद् दुर्गतिं तात गच्छति। (જે સદ્કર્મ કરે છે તેનું ક્યારેય અનિષ્ટ થતું નથી.)",
    author: "Bhagavad Gita",
    category: "spirituality"
  },
  {
    text: "श्रद्धावान् लभते ज्ञानम्। (શ્રદ્ધાવાન વ્યક્તિને જ સાચું જ્ઞાન પ્રાપ્ત થાય છે.)",
    author: "Bhagavad Gita",
    category: "wisdom"
  },
  {
    text: "तस्मादुत्तिष्ठ कौन्तेय युद्धाय कृतनिश्चयः। (ઉઠો, દૃઢ નિશ્ચય સાથે તમારા કર્તવ્યમાં લાગી જાઓ.)",
    author: "Bhagavad Gita",
    category: "discipline"
  },

  // Swami Vivekananda
  {
    text: "जिस दिन आपके सामने कोई समस्या न आए, समझ लीजिए कि आप गलत रास्ते पर चल रहे हैं।",
    author: "Swami Vivekananda",
    category: "discipline"
  },
  {
    text: "શક્તિ જ જીવન છે, નિર્બળતા જ મૃત્યુ છે.",
    author: "Swami Vivekananda",
    category: "discipline"
  },
  {
    text: "બળવાન બનો. સમગ્ર સત્યનું રહસ્ય એ જ છે.",
    author: "Swami Vivekananda",
    category: "wisdom"
  },

  // Chanakya
  {
    text: "उद्योगिनं पुरुषसिंहमुपैति लक्ष्मीः। (મહેનતુ અને સાહસિક માણસ પાસે જ સમૃદ્ધિ આવે છે.)",
    author: "Chanakya",
    category: "discipline"
  },
  {
    text: "कालः सर्वभक्षी। (સમય સૌથી શક્તિશાળી છે; તેનો સદુપયોગ કરો.)",
    author: "Chanakya",
    category: "wisdom"
  },
  {
    text: "જે પોતાને જીતી શકે છે તે આખી દુનિયાને જીતી શકે છે.",
    author: "Chanakya",
    category: "discipline"
  },

  // Pandurang Shastri Athavale
  {
    text: "દરેક દિવસ ભગવાને આપેલી નવી તક છે, તેને વ્યર્થ ન જવા દો.",
    author: "Pandurang Shastri Athavale",
    category: "spirituality"
  },
  {
    text: "સ્વાધ્યાય એટલે રોજ થોડું સારું બનવાનો સંકલ્પ.",
    author: "Pandurang Shastri Athavale",
    category: "discipline"
  },
  {
    text: "જે પોતાને જીતે છે તે જ સાચો વિજેતા છે.",
    author: "Pandurang Shastri Athavale",
    category: "wisdom"
  },

  // Chhatrapati Shivaji Maharaj
  {
    text: "સાહસ અને ધીરજથી અશક્ય પણ શક્ય બની જાય છે.",
    author: "Chhatrapati Shivaji Maharaj",
    category: "discipline"
  },
  {
    text: "જે પોતાના ધર્મ અને કર્તવ્યનું રક્ષણ કરે છે, ભગવાન પણ તેનું રક્ષણ કરે છે.",
    author: "Chhatrapati Shivaji Maharaj",
    category: "spirituality"
  },

  // Netaji Subhas Chandra Bose
  {
    text: "संघर्ष ही जीवन का दूसरा नाम है।",
    author: "Netaji Subhas Chandra Bose",
    category: "discipline"
  },
  {
    text: "ક્યારેય હાર ન માનો, કારણ કે જીત ઘણી વખત છેલ્લી કોશિશ પછી મળે છે.",
    author: "Netaji Subhas Chandra Bose",
    category: "wisdom"
  },

  // Bhagat Singh
  {
    text: "जो व्यक्ति आगे बढ़ना चाहता है, उसे कठिनाइयों से मित्रता करनी होगी।",
    author: "Bhagat Singh",
    category: "discipline"
  },
  {
    text: "હિંમત એ જ માણસની સાચી ઓળખ છે.",
    author: "Bhagat Singh",
    category: "wisdom"
  },

  // Maharana Pratap
  {
    text: "સ્વાભિમાન માટે જીવવું એ જ સાચું જીવન છે.",
    author: "Maharana Pratap",
    category: "discipline"
  },
  {
    text: "परिस्थितियाँ चाहे जैसी हों, वीर कभी हार नहीं मानता।",
    author: "Maharana Pratap",
    category: "wisdom"
  },

  // APJ Abdul Kalam
  {
    text: "सपने वो नहीं जो आप सोते समय देखते हैं, सपने वो हैं जो आपको सोने नहीं देते।",
    author: "A.P.J. Abdul Kalam",
    category: "discipline"
  },
  {
    text: "જો તમે સૂર્યની જેમ ચમકવા માંગો છો, તો પહેલા સૂર્યની જેમ તપવું પડશે.",
    author: "A.P.J. Abdul Kalam",
    category: "discipline"
  },

  // Sardar Vallabhbhai Patel
  {
    text: "શક્તિ વગર શ્રદ્ધા વ્યર્થ છે, અને શ્રદ્ધા વગર શક્તિ અપૂર્ણ છે.",
    author: "Sardar Vallabhbhai Patel",
    category: "wisdom"
  },
  {
    text: "એકતા અને શિસ્તથી અશક્ય કાર્ય પણ શક્ય બને છે.",
    author: "Sardar Vallabhbhai Patel",
    category: "discipline"
  },

  // Sanskrit Subhashitas
  {
    text: "चरैवेति चरैवेति। (ચાલતા રહો, સતત આગળ વધતા રહો.)",
    author: "Sanskrit Subhashita",
    category: "discipline"
  },
  {
    text: "विद्या ददाति विनयं, विनयाद् याति पात्रताम्। (જ્ઞાન વિનય આપે છે, વિનયથી પાત્રતા મળે છે.)",
    author: "Sanskrit Subhashita",
    category: "wisdom"
  },
  {
    text: "उद्यमेन हि सिद्ध्यन्ति कार्याणि न मनोरथैः। (કાર્યો મહેનતથી પૂર્ણ થાય છે, માત્ર ઇચ્છાઓથી નહીં.)",
    author: "Sanskrit Subhashita",
    category: "discipline"
  },
  {
    text: "सत्यं वद, धर्मं चर। (સત્ય બોલો અને ધર્મનું આચરણ કરો.)",
    author: "Upanishads",
    category: "spirituality"
  },

  // Morning Motivation
  {
    text: "આજનો સૂર્ય તમારા માટે નવી શરૂઆત લઈને આવ્યો છે. ઊઠો અને તમારા શ્રેષ્ઠ સ્વરૂપને જીવો.",
    author: "Rise21",
    category: "discipline"
  },
  {
    text: "દરરોજ ૧% સુધારો, ૨૧ દિવસ પછી તમે નવા માણસ બની જશો.",
    author: "Rise21",
    category: "discipline"
  },
  {
    text: "તમારી સવાર જીતો, તમારો આખો દિવસ જીતી જશો.",
    author: "Rise21",
    category: "discipline"
  },
  {
    text: "આળસ થોડા સમયનો આરામ આપે છે, શિસ્ત આખું જીવન ગૌરવ આપે છે.",
    author: "Rise21",
    category: "discipline"
  },
  {
    text: "પ્રાર્થના મનને શુદ્ધ કરે છે, ધ્યાન મનને સ્થિર કરે છે અને શિસ્ત જીવનને મહાન બનાવે છે.",
    author: "Rise21",
    category: "spirituality"
  },
  {
    text: "જે દિવસે તમે બહાનાં છોડશો, એ દિવસે સફળતા તમારી તરફ દોડશે.",
    author: "Rise21",
    category: "discipline"
  },
  {
    text: "આજે જે કરશો તે જ આવતીકાલનું ભાગ્ય બનાવશે.",
    author: "Rise21",
    category: "wisdom"
  },
  {
    text: "વહેલા ઉઠવું માત્ર આદત નથી, તે જીવન બદલવાની શરૂઆત છે.",
    author: "Rise21",
    category: "discipline"
  },
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
app.use('/api/admin', adminRoutes);
app.use('/api/announcements', announcementRoutes);
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
    // await prisma.quote.deleteMany();
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
// seedQuotes();

import fs from 'fs';
import path from 'path';

// Persistent Disk Storage for Web Push Subscriptions
const SUBSCRIPTION_FILE = path.join(process.cwd(), 'push_subscriptions.json');

const loadSubscriptions = () => {
  try {
    if (fs.existsSync(SUBSCRIPTION_FILE)) {
      const data = fs.readFileSync(SUBSCRIPTION_FILE, 'utf8');
      const list = JSON.parse(data);
      const map = new Map();
      list.forEach(item => {
        if (item && item.subscription && item.subscription.endpoint) {
          map.set(item.subscription.endpoint, item);
        }
      });
      console.log(`📦 Loaded ${map.size} Web Push Subscriptions from disk.`);
      return map;
    }
  } catch (e) {
    console.error('Error loading push subscriptions from disk:', e);
  }
  return new Map();
};

const saveSubscriptions = (map) => {
  try {
    const list = Array.from(map.values());
    fs.writeFileSync(SUBSCRIPTION_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving push subscriptions to disk:', e);
  }
};

const pushSubscriptions = loadSubscriptions();

// Web Push Notification Endpoints
app.get('/api/notifications/vapid-public-key', (req, res) => {
  res.json({ publicKey: vapidPublicKey });
});

app.post('/api/notifications/subscribe', (req, res) => {
  const { subscription, userId, reminderTime } = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription object' });
  }

  const key = subscription.endpoint;
  pushSubscriptions.set(key, {
    subscription,
    userId: userId || 'anonymous',
    reminderTime: reminderTime || '20:00',
    timestamp: Date.now()
  });
  saveSubscriptions(pushSubscriptions);
  console.log(`📡 Registered Web Push Subscription for user ${userId || 'anon'} [Time: ${reminderTime || '20:00'}]`);

  res.status(201).json({ status: 'subscribed' });
});

export const broadcastPushNotification = async (title, body) => {
  if (pushSubscriptions.size === 0) {
    console.log('📡 No active push subscriptions to broadcast to.');
    return 0;
  }

  const payload = JSON.stringify({ title, body });
  let sentCount = 0;
  console.log(`📢 Broadcasting Web Push notification: "${title}" to ${pushSubscriptions.size} devices`);

  for (const [key, item] of pushSubscriptions.entries()) {
    try {
      await webpush.sendNotification(item.subscription, payload);
      sentCount++;
    } catch (err) {
      console.error('Error sending Web Push notification:', err.statusCode);
      if (err.statusCode === 410 || err.statusCode === 404) {
        pushSubscriptions.delete(key);
        saveSubscriptions(pushSubscriptions);
      }
    }
  }
  return sentCount;
};

app.post('/api/notifications/test-push', async (req, res) => {
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
  const quoteText = randomQuote.author ? `"${randomQuote.text}" — ${randomQuote.author}` : `"${randomQuote.text}"`;
  const sentCount = await broadcastPushNotification('Daily Motivation 🎯', quoteText);
  res.json({ status: 'ok', sent: sentCount });
});

// Server-side Background Push Scheduler (Runs every 1 minute)
cron.schedule('* * * * *', async () => {
  if (pushSubscriptions.size === 0) return;

  const now = new Date();
  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMinutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${currentHours}:${currentMinutes}`;

  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
  const quoteText = randomQuote.author ? `"${randomQuote.text}" — ${randomQuote.author}` : `"${randomQuote.text}"`;

  // 1. Morning Auto Push (07:00 AM)
  if (currentTimeStr === '07:00') {
    await broadcastPushNotification('Morning Motivation ☀️', quoteText);
  }

  // 2. Evening Auto Push (09:30 PM / 21:30)
  if (currentTimeStr === '21:30') {
    await broadcastPushNotification('Evening Reflection 🌙', quoteText);
  }

  // 3. Custom User Reminder Time Push
  for (const [key, item] of pushSubscriptions.entries()) {
    if (item.reminderTime === currentTimeStr && currentTimeStr !== '07:00' && currentTimeStr !== '21:30') {
      const payload = JSON.stringify({
        title: 'Daily Check-In 🎯',
        body: `${quoteText} Time for your daily habit check-in!`
      });
      try {
        await webpush.sendNotification(item.subscription, payload);
        console.log(`⏰ Triggered custom reminder push for user ${item.userId} at ${currentTimeStr}`);
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          pushSubscriptions.delete(key);
          saveSubscriptions(pushSubscriptions);
        }
      }
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date(), activeSubscriptions: pushSubscriptions.size });
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
