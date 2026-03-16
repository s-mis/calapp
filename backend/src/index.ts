import express from 'express';
import cors from 'cors';
import { initDb } from './db';
import foodsRouter from './routes/foods';
import logsRouter from './routes/logs';
import reportsRouter from './routes/reports';
import settingsRouter from './routes/settings';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
initDb();

// Routes
app.use('/api/foods', foodsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
