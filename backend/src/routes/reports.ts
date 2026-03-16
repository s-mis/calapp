import { Router, Request, Response } from 'express';
import db from '../db';
import { DailyTotals } from '../types';

const router = Router();

// Multiplier: (serving_size.grams OR custom_grams) * quantity / 100
const MULT = `(
  CASE WHEN fl.serving_size_id IS NOT NULL
    THEN ss.grams * fl.quantity / 100.0
    ELSE COALESCE(fl.custom_grams, 0) * fl.quantity / 100.0
  END
)`;

const TOTALS_SELECT = `
  fl.date,
  COALESCE(SUM(f.calories * ${MULT}), 0) as calories,
  COALESCE(SUM(f.protein * ${MULT}), 0) as protein,
  COALESCE(SUM(f.carbs * ${MULT}), 0) as carbs,
  COALESCE(SUM(f.fat * ${MULT}), 0) as fat,
  COALESCE(SUM(f.fiber * ${MULT}), 0) as fiber,
  COALESCE(SUM(f.sugar * ${MULT}), 0) as sugar,
  COALESCE(SUM(f.saturated_fat * ${MULT}), 0) as saturated_fat,
  COALESCE(SUM(f.trans_fat * ${MULT}), 0) as trans_fat,
  COALESCE(SUM(f.cholesterol * ${MULT}), 0) as cholesterol,
  COALESCE(SUM(f.sodium * ${MULT}), 0) as sodium,
  COALESCE(SUM(f.potassium * ${MULT}), 0) as potassium,
  COALESCE(SUM(f.calcium * ${MULT}), 0) as calcium,
  COALESCE(SUM(f.iron * ${MULT}), 0) as iron,
  COALESCE(SUM(f.vitamin_a * ${MULT}), 0) as vitamin_a,
  COALESCE(SUM(f.vitamin_c * ${MULT}), 0) as vitamin_c,
  COALESCE(SUM(f.vitamin_d * ${MULT}), 0) as vitamin_d,
  COALESCE(SUM(f.vitamin_e * ${MULT}), 0) as vitamin_e,
  COALESCE(SUM(f.vitamin_k * ${MULT}), 0) as vitamin_k,
  COALESCE(SUM(f.vitamin_b6 * ${MULT}), 0) as vitamin_b6,
  COALESCE(SUM(f.vitamin_b12 * ${MULT}), 0) as vitamin_b12,
  COALESCE(SUM(f.folate * ${MULT}), 0) as folate,
  COALESCE(SUM(f.magnesium * ${MULT}), 0) as magnesium,
  COALESCE(SUM(f.zinc * ${MULT}), 0) as zinc,
  COALESCE(SUM(f.phosphorus * ${MULT}), 0) as phosphorus,
  COUNT(fl.id) as entry_count
`;

const FROM_CLAUSE = `
  FROM food_logs fl
  JOIN foods f ON fl.food_id = f.id
  LEFT JOIN serving_sizes ss ON fl.serving_size_id = ss.id
`;

// GET /api/reports/daily?date=YYYY-MM-DD - totals for a day
router.get('/daily', (req: Request, res: Response) => {
  const { date } = req.query;
  if (!date || typeof date !== 'string') {
    res.status(400).json({ error: 'date query parameter is required (YYYY-MM-DD)' });
    return;
  }

  const result = db.prepare(`
    SELECT ${TOTALS_SELECT}
    ${FROM_CLAUSE}
    WHERE fl.date = ?
    GROUP BY fl.date
  `).get(date) as DailyTotals | undefined;

  res.json(result ?? {
    date,
    calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0,
    saturated_fat: 0, trans_fat: 0, cholesterol: 0,
    sodium: 0, potassium: 0, calcium: 0, iron: 0,
    vitamin_a: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0, vitamin_k: 0,
    vitamin_b6: 0, vitamin_b12: 0, folate: 0,
    magnesium: 0, zinc: 0, phosphorus: 0,
    entry_count: 0,
  });
});

// GET /api/reports/weekly?date=YYYY-MM-DD - daily totals for the week containing that date
router.get('/weekly', (req: Request, res: Response) => {
  const { date } = req.query;
  if (!date || typeof date !== 'string') {
    res.status(400).json({ error: 'date query parameter is required (YYYY-MM-DD)' });
    return;
  }

  // Calculate Monday of the week containing the given date
  const d = new Date(date + 'T00:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  const monday = new Date(d);
  monday.setDate(diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startDate = monday.toISOString().split('T')[0];
  const endDate = sunday.toISOString().split('T')[0];

  const results = db.prepare(`
    SELECT ${TOTALS_SELECT}
    ${FROM_CLAUSE}
    WHERE fl.date >= ? AND fl.date <= ?
    GROUP BY fl.date
    ORDER BY fl.date
  `).all(startDate, endDate) as DailyTotals[];

  // Fill in missing days with zeros
  const allDays: DailyTotals[] = [];
  const current = new Date(monday);
  for (let i = 0; i < 7; i++) {
    const dayStr = current.toISOString().split('T')[0];
    const existing = results.find(r => r.date === dayStr);
    allDays.push(existing ?? {
      date: dayStr,
      calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0,
      saturated_fat: 0, trans_fat: 0, cholesterol: 0,
      sodium: 0, potassium: 0, calcium: 0, iron: 0,
      vitamin_a: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0, vitamin_k: 0,
      vitamin_b6: 0, vitamin_b12: 0, folate: 0,
      magnesium: 0, zinc: 0, phosphorus: 0,
      entry_count: 0,
    });
    current.setDate(current.getDate() + 1);
  }

  res.json({ startDate, endDate, days: allDays });
});

// GET /api/reports/monthly?month=YYYY-MM - daily totals for the month
router.get('/monthly', (req: Request, res: Response) => {
  const { month } = req.query;
  if (!month || typeof month !== 'string') {
    res.status(400).json({ error: 'month query parameter is required (YYYY-MM)' });
    return;
  }

  const startDate = `${month}-01`;
  const [year, mon] = month.split('-').map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

  const results = db.prepare(`
    SELECT ${TOTALS_SELECT}
    ${FROM_CLAUSE}
    WHERE fl.date >= ? AND fl.date <= ?
    GROUP BY fl.date
    ORDER BY fl.date
  `).all(startDate, endDate) as DailyTotals[];

  // Fill in missing days
  const allDays: DailyTotals[] = [];
  for (let d = 1; d <= lastDay; d++) {
    const dayStr = `${month}-${String(d).padStart(2, '0')}`;
    const existing = results.find(r => r.date === dayStr);
    allDays.push(existing ?? {
      date: dayStr,
      calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0,
      saturated_fat: 0, trans_fat: 0, cholesterol: 0,
      sodium: 0, potassium: 0, calcium: 0, iron: 0,
      vitamin_a: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0, vitamin_k: 0,
      vitamin_b6: 0, vitamin_b12: 0, folate: 0,
      magnesium: 0, zinc: 0, phosphorus: 0,
      entry_count: 0,
    });
  }

  res.json({ month, startDate, endDate, days: allDays });
});

export default router;
