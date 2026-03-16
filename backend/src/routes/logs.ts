import { Router, Request, Response } from 'express';
import db from '../db';
import { FoodLog, FoodLogWithFood } from '../types';

const router = Router();

// GET /api/logs?date=YYYY-MM-DD - get logs for a day
router.get('/', (req: Request, res: Response) => {
  const { date } = req.query;
  if (!date || typeof date !== 'string') {
    res.status(400).json({ error: 'date query parameter is required (YYYY-MM-DD)' });
    return;
  }

  const logs = db.prepare(`
    SELECT
      fl.id, fl.food_id, fl.date, fl.meal_type, fl.serving_size_id, fl.quantity, fl.custom_grams, fl.created_at,
      f.id as f_id, f.name as f_name, f.brand as f_brand, f.unit as f_unit,
      f.calories as f_calories, f.protein as f_protein, f.carbs as f_carbs,
      f.fat as f_fat, f.fiber as f_fiber, f.sugar as f_sugar,
      f.saturated_fat as f_saturated_fat, f.trans_fat as f_trans_fat, f.cholesterol as f_cholesterol,
      f.sodium as f_sodium, f.potassium as f_potassium, f.calcium as f_calcium,
      f.iron as f_iron, f.vitamin_a as f_vitamin_a, f.vitamin_c as f_vitamin_c,
      f.vitamin_d as f_vitamin_d, f.vitamin_e as f_vitamin_e, f.vitamin_k as f_vitamin_k,
      f.vitamin_b6 as f_vitamin_b6, f.vitamin_b12 as f_vitamin_b12, f.folate as f_folate,
      f.magnesium as f_magnesium, f.zinc as f_zinc, f.phosphorus as f_phosphorus,
      f.barcode as f_barcode, f.created_at as f_created_at,
      ss.id as ss_id, ss.food_id as ss_food_id, ss.name as ss_name, ss.grams as ss_grams,
      ss.sort_order as ss_sort_order, ss.is_default as ss_is_default
    FROM food_logs fl
    JOIN foods f ON fl.food_id = f.id
    LEFT JOIN serving_sizes ss ON fl.serving_size_id = ss.id
    WHERE fl.date = ?
    ORDER BY
      CASE fl.meal_type
        WHEN 'breakfast' THEN 1
        WHEN 'lunch' THEN 2
        WHEN 'dinner' THEN 3
        WHEN 'snack' THEN 4
      END,
      fl.created_at
  `).all(date) as any[];

  const result: FoodLogWithFood[] = logs.map(row => ({
    id: row.id,
    food_id: row.food_id,
    date: row.date,
    meal_type: row.meal_type,
    serving_size_id: row.serving_size_id,
    quantity: row.quantity,
    custom_grams: row.custom_grams,
    created_at: row.created_at,
    food: {
      id: row.f_id,
      name: row.f_name,
      brand: row.f_brand,
      unit: row.f_unit,
      calories: row.f_calories,
      protein: row.f_protein,
      carbs: row.f_carbs,
      fat: row.f_fat,
      fiber: row.f_fiber,
      sugar: row.f_sugar,
      saturated_fat: row.f_saturated_fat,
      trans_fat: row.f_trans_fat,
      cholesterol: row.f_cholesterol,
      sodium: row.f_sodium,
      potassium: row.f_potassium,
      calcium: row.f_calcium,
      iron: row.f_iron,
      vitamin_a: row.f_vitamin_a,
      vitamin_c: row.f_vitamin_c,
      vitamin_d: row.f_vitamin_d,
      vitamin_e: row.f_vitamin_e,
      vitamin_k: row.f_vitamin_k,
      vitamin_b6: row.f_vitamin_b6,
      vitamin_b12: row.f_vitamin_b12,
      folate: row.f_folate,
      magnesium: row.f_magnesium,
      zinc: row.f_zinc,
      phosphorus: row.f_phosphorus,
      barcode: row.f_barcode,
      created_at: row.f_created_at,
    },
    serving_size: row.ss_id ? {
      id: row.ss_id,
      food_id: row.ss_food_id,
      name: row.ss_name,
      grams: row.ss_grams,
      sort_order: row.ss_sort_order,
      is_default: row.ss_is_default,
    } : null,
  }));

  res.json(result);
});

// POST /api/logs - log a food entry
router.post('/', (req: Request, res: Response) => {
  const { food_id, date, meal_type, serving_size_id, quantity, custom_grams } = req.body;

  if (!food_id || !date || !meal_type) {
    res.status(400).json({ error: 'food_id, date, and meal_type are required' });
    return;
  }

  const validMeals = ['breakfast', 'lunch', 'dinner', 'snack'];
  if (!validMeals.includes(meal_type)) {
    res.status(400).json({ error: 'meal_type must be breakfast, lunch, dinner, or snack' });
    return;
  }

  if (!serving_size_id && custom_grams == null) {
    res.status(400).json({ error: 'Either serving_size_id or custom_grams must be provided' });
    return;
  }

  // Verify food exists
  const food = db.prepare('SELECT id FROM foods WHERE id = ?').get(food_id);
  if (!food) {
    res.status(400).json({ error: 'Food not found' });
    return;
  }

  const stmt = db.prepare(
    'INSERT INTO food_logs (food_id, date, meal_type, serving_size_id, quantity, custom_grams) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const result = stmt.run(food_id, date, meal_type, serving_size_id ?? null, quantity ?? 1, custom_grams ?? null);

  const log = db.prepare('SELECT * FROM food_logs WHERE id = ?').get(result.lastInsertRowid) as FoodLog;
  res.status(201).json(log);
});

// PUT /api/logs/:id - update a log entry
router.put('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM food_logs WHERE id = ?').get(req.params.id) as FoodLog | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Log entry not found' });
    return;
  }

  const { food_id, date, meal_type, serving_size_id, quantity, custom_grams } = req.body;

  const validMeals = ['breakfast', 'lunch', 'dinner', 'snack'];
  if (meal_type && !validMeals.includes(meal_type)) {
    res.status(400).json({ error: 'meal_type must be breakfast, lunch, dinner, or snack' });
    return;
  }

  const stmt = db.prepare(`
    UPDATE food_logs SET
      food_id = ?, date = ?, meal_type = ?, serving_size_id = ?, quantity = ?, custom_grams = ?
    WHERE id = ?
  `);

  stmt.run(
    food_id ?? existing.food_id,
    date ?? existing.date,
    meal_type ?? existing.meal_type,
    serving_size_id !== undefined ? (serving_size_id ?? null) : existing.serving_size_id,
    quantity ?? existing.quantity,
    custom_grams !== undefined ? (custom_grams ?? null) : existing.custom_grams,
    req.params.id
  );

  const log = db.prepare('SELECT * FROM food_logs WHERE id = ?').get(req.params.id) as FoodLog;
  res.json(log);
});

// DELETE /api/logs/:id - delete a log entry
router.delete('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM food_logs WHERE id = ?').get(req.params.id) as FoodLog | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Log entry not found' });
    return;
  }

  db.prepare('DELETE FROM food_logs WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
