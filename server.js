import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB = process.env.MONGODB_DB || 'pizzavenue';
const CONFIG_COLLECTION = 'config';

app.use(cors());
app.use(express.json({ limit: '2mb' }));

let mongoClient;
let db;
async function connectMongo() {
  if (db) return db;
  if (!MONGODB_URI) {
    console.warn('MONGODB_URI not set; backend will run but API calls will fail.');
  }
  mongoClient = new MongoClient(MONGODB_URI, {
    ignoreUndefined: true,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  });
  await mongoClient.connect();
  db = mongoClient.db(MONGODB_DB);
  return db;
}

async function getConfigDoc(key, fallback) {
  const database = await connectMongo();
  const col = database.collection(CONFIG_COLLECTION);
  const doc = await col.findOne({ _id: key });
  return doc && doc.data !== undefined ? doc.data : fallback;
}

async function setConfigDoc(key, data) {
  const database = await connectMongo();
  const col = database.collection(CONFIG_COLLECTION);
  await col.updateOne({ _id: key }, { $set: { data } }, { upsert: true });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Deals
app.get('/api/deals', (_req, res) => {
  getConfigDoc('deals', []).then((deals) => res.json(deals)).catch((e) => {
    console.error(e);
    res.status(500).json([]);
  });
});

app.put('/api/deals', (req, res) => {
  const deals = Array.isArray(req.body) ? req.body : [];
  setConfigDoc('deals', deals).then(() => res.json({ ok: true })).catch((e) => {
    console.error(e);
    res.status(500).json({ ok: false });
  });
});

// Menu
app.get('/api/menu', (_req, res) => {
  getConfigDoc('menu', {}).then((menu) => res.json(menu)).catch((e) => {
    console.error(e);
    res.status(500).json({});
  });
});

app.put('/api/menu', (req, res) => {
  const menu = req.body && typeof req.body === 'object' ? req.body : {};
  setConfigDoc('menu', menu).then(() => res.json({ ok: true })).catch((e) => {
    console.error(e);
    res.status(500).json({ ok: false });
  });
});

connectMongo()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });


