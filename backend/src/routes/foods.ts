import { Router, Request, Response } from 'express';
import db from '../db';
import { Food, ServingSize, FoodWithServingSizes } from '../types';

const router = Router();

function getFoodWithServingSizes(foodId: number): FoodWithServingSizes | undefined {
  const food = db.prepare('SELECT * FROM foods WHERE id = ?').get(foodId) as Food | undefined;
  if (!food) return undefined;
  const serving_sizes = db.prepare(
    'SELECT * FROM serving_sizes WHERE food_id = ? ORDER BY sort_order, id'
  ).all(foodId) as ServingSize[];
  return { ...food, serving_sizes };
}

// GET /api/foods - list all foods (with optional search or barcode filter)
router.get('/', (req: Request, res: Response) => {
  const { search, barcode } = req.query;
  let foods: Food[];

  if (barcode && typeof barcode === 'string') {
    foods = db.prepare('SELECT * FROM foods WHERE barcode = ?').all(barcode) as Food[];
  } else if (search && typeof search === 'string') {
    const stmt = db.prepare(
      'SELECT * FROM foods WHERE name LIKE ? OR brand LIKE ? ORDER BY name'
    );
    const pattern = `%${search}%`;
    foods = stmt.all(pattern, pattern) as Food[];
  } else {
    foods = db.prepare('SELECT * FROM foods ORDER BY name').all() as Food[];
  }

  // Attach serving sizes to each food
  const allServingSizes = db.prepare(
    'SELECT * FROM serving_sizes ORDER BY sort_order, id'
  ).all() as ServingSize[];

  const sizesByFoodId = new Map<number, ServingSize[]>();
  for (const ss of allServingSizes) {
    const arr = sizesByFoodId.get(ss.food_id) || [];
    arr.push(ss);
    sizesByFoodId.set(ss.food_id, arr);
  }

  const result: FoodWithServingSizes[] = foods.map(f => ({
    ...f,
    serving_sizes: sizesByFoodId.get(f.id) || [],
  }));

  res.json(result);
});

// GET /api/foods/:id - get single food
router.get('/:id', (req: Request, res: Response) => {
  const food = getFoodWithServingSizes(Number(req.params.id));
  if (!food) {
    res.status(404).json({ error: 'Food not found' });
    return;
  }
  res.json(food);
});

// POST /api/foods - create food
router.post('/', (req: Request, res: Response) => {
  const {
    name, brand, unit,
    calories, protein, carbs, fat, fiber, sugar, saturated_fat, trans_fat, cholesterol,
    sodium, potassium, calcium, iron,
    vitamin_a, vitamin_c, vitamin_d, vitamin_e, vitamin_k,
    vitamin_b6, vitamin_b12, folate,
    magnesium, zinc, phosphorus,
    barcode,
    serving_sizes,
  } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const foodUnit = unit === 'ml' ? 'ml' : 'g';

  const insertFood = db.prepare(`
    INSERT INTO foods (
      name, brand, unit,
      calories, protein, carbs, fat, fiber, sugar, saturated_fat, trans_fat, cholesterol,
      sodium, potassium, calcium, iron,
      vitamin_a, vitamin_c, vitamin_d, vitamin_e, vitamin_k,
      vitamin_b6, vitamin_b12, folate,
      magnesium, zinc, phosphorus,
      barcode
    ) VALUES (
      ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?
    )
  `);

  const insertServingSize = db.prepare(`
    INSERT INTO serving_sizes (food_id, name, grams, sort_order, is_default)
    VALUES (?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    const result = insertFood.run(
      name, brand ?? null, foodUnit,
      calories ?? null, protein ?? null, carbs ?? null, fat ?? null,
      fiber ?? null, sugar ?? null, saturated_fat ?? null, trans_fat ?? null, cholesterol ?? null,
      sodium ?? null, potassium ?? null, calcium ?? null, iron ?? null,
      vitamin_a ?? null, vitamin_c ?? null, vitamin_d ?? null, vitamin_e ?? null, vitamin_k ?? null,
      vitamin_b6 ?? null, vitamin_b12 ?? null, folate ?? null,
      magnesium ?? null, zinc ?? null, phosphorus ?? null,
      barcode ?? null
    );

    const foodId = result.lastInsertRowid as number;

    // Insert user-provided serving sizes
    const sizes: Array<{ name: string; grams: number; sort_order?: number; is_default?: number }> =
      Array.isArray(serving_sizes) ? serving_sizes : [];

    let hasDefault = sizes.some(s => s.is_default);

    // Always auto-create the default 100g/100ml entry if none marked
    if (!hasDefault) {
      insertServingSize.run(foodId, `100${foodUnit}`, 100, 0, 1);
    }

    for (let i = 0; i < sizes.length; i++) {
      const s = sizes[i];
      insertServingSize.run(foodId, s.name, s.grams, s.sort_order ?? i + 1, s.is_default ? 1 : 0);
    }

    return foodId;
  });

  const foodId = transaction();
  const food = getFoodWithServingSizes(foodId as number);
  res.status(201).json(food);
});

// PUT /api/foods/:id - update food
router.put('/:id', (req: Request, res: Response) => {
  const foodId = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM foods WHERE id = ?').get(foodId) as Food | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Food not found' });
    return;
  }

  const {
    name, brand, unit,
    calories, protein, carbs, fat, fiber, sugar, saturated_fat, trans_fat, cholesterol,
    sodium, potassium, calcium, iron,
    vitamin_a, vitamin_c, vitamin_d, vitamin_e, vitamin_k,
    vitamin_b6, vitamin_b12, folate,
    magnesium, zinc, phosphorus,
    barcode,
    serving_sizes,
  } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const foodUnit = unit === 'ml' ? 'ml' : 'g';

  const transaction = db.transaction(() => {
    db.prepare(`
      UPDATE foods SET
        name = ?, brand = ?, unit = ?,
        calories = ?, protein = ?, carbs = ?, fat = ?, fiber = ?, sugar = ?,
        saturated_fat = ?, trans_fat = ?, cholesterol = ?,
        sodium = ?, potassium = ?, calcium = ?, iron = ?,
        vitamin_a = ?, vitamin_c = ?, vitamin_d = ?, vitamin_e = ?, vitamin_k = ?,
        vitamin_b6 = ?, vitamin_b12 = ?, folate = ?,
        magnesium = ?, zinc = ?, phosphorus = ?,
        barcode = ?
      WHERE id = ?
    `).run(
      name, brand ?? null, foodUnit,
      calories ?? null, protein ?? null, carbs ?? null, fat ?? null,
      fiber ?? null, sugar ?? null, saturated_fat ?? null, trans_fat ?? null, cholesterol ?? null,
      sodium ?? null, potassium ?? null, calcium ?? null, iron ?? null,
      vitamin_a ?? null, vitamin_c ?? null, vitamin_d ?? null, vitamin_e ?? null, vitamin_k ?? null,
      vitamin_b6 ?? null, vitamin_b12 ?? null, folate ?? null,
      magnesium ?? null, zinc ?? null, phosphorus ?? null,
      barcode ?? null,
      foodId
    );

    // Update serving sizes if provided
    if (Array.isArray(serving_sizes)) {
      const existingSizes = db.prepare(
        'SELECT id FROM serving_sizes WHERE food_id = ?'
      ).all(foodId) as { id: number }[];
      const existingIds = new Set(existingSizes.map(s => s.id));
      const incomingIds = new Set(
        serving_sizes.filter((s: any) => s.id).map((s: any) => s.id as number)
      );

      // For removed serving sizes, preserve log data by setting custom_grams
      for (const oldId of existingIds) {
        if (!incomingIds.has(oldId)) {
          const ss = db.prepare('SELECT grams FROM serving_sizes WHERE id = ?').get(oldId) as { grams: number } | undefined;
          if (ss) {
            db.prepare(`
              UPDATE food_logs
              SET custom_grams = ? * quantity, serving_size_id = NULL
              WHERE serving_size_id = ?
            `).run(ss.grams, oldId);
          }
          db.prepare('DELETE FROM serving_sizes WHERE id = ?').run(oldId);
        }
      }

      // Update existing and insert new
      for (let i = 0; i < serving_sizes.length; i++) {
        const s = serving_sizes[i] as any;
        if (s.id && existingIds.has(s.id)) {
          db.prepare(`
            UPDATE serving_sizes SET name = ?, grams = ?, sort_order = ?, is_default = ?
            WHERE id = ?
          `).run(s.name, s.grams, s.sort_order ?? i, s.is_default ? 1 : 0, s.id);
        } else {
          db.prepare(`
            INSERT INTO serving_sizes (food_id, name, grams, sort_order, is_default)
            VALUES (?, ?, ?, ?, ?)
          `).run(foodId, s.name, s.grams, s.sort_order ?? i, s.is_default ? 1 : 0);
        }
      }

      // Ensure there's always a default
      const hasDefault = serving_sizes.some((s: any) => s.is_default);
      if (!hasDefault) {
        const defaultExists = db.prepare(
          'SELECT id FROM serving_sizes WHERE food_id = ? AND is_default = 1'
        ).get(foodId);
        if (!defaultExists) {
          db.prepare(`
            INSERT INTO serving_sizes (food_id, name, grams, sort_order, is_default)
            VALUES (?, ?, 100, 0, 1)
          `).run(foodId, `100${foodUnit}`);
        }
      }
    }
  });

  transaction();
  const food = getFoodWithServingSizes(foodId);
  res.json(food);
});

// DELETE /api/foods/:id - delete food
router.delete('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM foods WHERE id = ?').get(req.params.id) as Food | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Food not found' });
    return;
  }

  db.prepare('DELETE FROM foods WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
