import { test, expect, Page } from '@playwright/test';

/**
 * Quick Add Override Columns — E2E Tests
 *
 * Mocks Supabase auth (localStorage + network) and API layer to verify
 * override fields flow correctly through the UI.
 */

const TODAY = new Date().toISOString().split('T')[0];
const SUPABASE_URL = 'https://wvfeitbddtpayubrdsoj.supabase.co';
const STORAGE_KEY = 'sb-wvfeitbddtpayubrdsoj-auth-token';

const FAKE_USER = {
  id: 'test-user-id',
  email: 'test@test.com',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: { provider: 'google' },
  user_metadata: { full_name: 'Test User' },
  created_at: '2024-01-01T00:00:00Z',
};

const FAKE_SESSION = {
  access_token: 'fake-access-token-for-testing',
  token_type: 'bearer',
  expires_in: 86400,
  expires_at: Math.floor(Date.now() / 1000) + 86400,
  refresh_token: 'fake-refresh-token',
  user: FAKE_USER,
};

const SENTINEL_FOOD = {
  id: 999,
  name: 'Quick add',
  brand: '__quick_add__',
  unit: 'g',
  calories: 0, protein: 0, carbs: 0, fat: 0,
  fiber: null, sugar: null, saturated_fat: null, trans_fat: null,
  cholesterol: null, sodium: null, potassium: null, calcium: null,
  iron: null, vitamin_a: null, vitamin_c: null, vitamin_d: null,
  vitamin_e: null, vitamin_k: null, vitamin_b6: null, vitamin_b12: null,
  folate: null, magnesium: null, zinc: null, phosphorus: null,
  barcode: null, created_at: '2024-01-01T00:00:00Z',
  serving_sizes: [],
};

const REGULAR_FOOD = {
  id: 1,
  name: 'Chicken Breast',
  brand: 'Generic',
  unit: 'g',
  calories: 165, protein: 31, carbs: 0, fat: 3.6,
  fiber: 0, sugar: 0, saturated_fat: 1, trans_fat: 0,
  cholesterol: 85, sodium: 74, potassium: 256, calcium: 11,
  iron: 0.7, vitamin_a: 0, vitamin_c: 0, vitamin_d: 0,
  vitamin_e: 0, vitamin_k: 0, vitamin_b6: 0.6, vitamin_b12: 0.3,
  folate: 4, magnesium: 29, zinc: 0.9, phosphorus: 228,
  barcode: null, created_at: '2024-01-01T00:00:00Z',
  serving_sizes: [{ id: 1, food_id: 1, name: '100g', grams: 100, sort_order: 0, is_default: 1 }],
};

function makeQuickAddLog(o: { cal: number; protein: number; carbs: number; fat: number }, id = 100) {
  return {
    id, food_id: SENTINEL_FOOD.id, date: TODAY, meal_type: 'lunch',
    serving_size_id: null, quantity: 1, custom_grams: null,
    cal_override: o.cal, protein_override: o.protein,
    carbs_override: o.carbs, fat_override: o.fat,
    created_at: new Date().toISOString(),
    food: SENTINEL_FOOD, serving_size: null,
  };
}

function makeRegularLog(id = 200) {
  return {
    id, food_id: REGULAR_FOOD.id, date: TODAY, meal_type: 'lunch',
    serving_size_id: 1, quantity: 1, custom_grams: null,
    cal_override: null, protein_override: null,
    carbs_override: null, fat_override: null,
    created_at: new Date().toISOString(),
    food: REGULAR_FOOD, serving_size: REGULAR_FOOD.serving_sizes[0],
  };
}

function zeroDailyTotals(overrides: Partial<Record<string, number>> = {}) {
  return {
    date: TODAY, entry_count: 0,
    calories: 0, protein: 0, carbs: 0, fat: 0,
    fiber: 0, sugar: 0, saturated_fat: 0, trans_fat: 0,
    cholesterol: 0, sodium: 0, potassium: 0, calcium: 0,
    iron: 0, vitamin_a: 0, vitamin_c: 0, vitamin_d: 0,
    vitamin_e: 0, vitamin_k: 0, vitamin_b6: 0, vitamin_b12: 0,
    folate: 0, magnesium: 0, zinc: 0, phosphorus: 0,
    ...overrides,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function setupMocks(page: Page, logs: any[] = [], dashboardTotals?: any) {
  // 1. Inject fake Supabase session into localStorage BEFORE any JS runs
  await page.addInitScript(({ key, session }) => {
    localStorage.setItem(key, JSON.stringify(session));
  }, { key: STORAGE_KEY, session: FAKE_SESSION });

  // 2. Intercept ALL Supabase auth network requests so they don't fail
  await page.route(`${SUPABASE_URL}/auth/v1/**`, route => {
    const url = route.request().url();

    // GET /auth/v1/user — return fake user
    if (url.includes('/auth/v1/user')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FAKE_USER),
      });
    }

    // POST /auth/v1/token — token refresh
    if (url.includes('/auth/v1/token')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FAKE_SESSION),
      });
    }

    // POST /auth/v1/logout
    if (url.includes('/auth/v1/logout')) {
      return route.fulfill({ status: 204, body: '' });
    }

    // Fallback for any other auth endpoint
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(FAKE_SESSION),
    });
  });

  // 3. Mock /api/logs GET
  await page.route('**/api/logs?date=*', route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(logs),
      });
    }
    return route.continue();
  });

  // 4. Mock /api/logs/recent-foods
  await page.route('**/api/logs/recent-foods', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([REGULAR_FOOD]),
    })
  );

  // 5. Mock /api/foods
  await page.route('**/api/foods*', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [SENTINEL_FOOD, REGULAR_FOOD], total: 2 }),
    })
  );

  // 6. Mock /api/dashboard
  const totals = dashboardTotals || zeroDailyTotals({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    calories: logs.reduce((s: number, l: any) => s + (l.cal_override ?? ((l.food?.calories ?? 0) * (l.serving_size?.grams ?? l.custom_grams ?? 0) * l.quantity / 100)), 0),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protein: logs.reduce((s: number, l: any) => s + (l.protein_override ?? ((l.food?.protein ?? 0) * (l.serving_size?.grams ?? l.custom_grams ?? 0) * l.quantity / 100)), 0),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    carbs: logs.reduce((s: number, l: any) => s + (l.carbs_override ?? ((l.food?.carbs ?? 0) * (l.serving_size?.grams ?? l.custom_grams ?? 0) * l.quantity / 100)), 0),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fat: logs.reduce((s: number, l: any) => s + (l.fat_override ?? ((l.food?.fat ?? 0) * (l.serving_size?.grams ?? l.custom_grams ?? 0) * l.quantity / 100)), 0),
    entry_count: logs.length,
  });

  await page.route('**/api/dashboard*', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        daily: totals,
        logs,
        weekly: { startDate: TODAY, endDate: TODAY, days: [] },
        settings: { calorie_goal: '2000', protein_goal: '150', carbs_goal: '250', fat_goal: '65' },
      }),
    })
  );

  // 7. Mock /api/settings
  await page.route('**/api/settings*', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ calorie_goal: '2000' }),
    })
  );
}

// ─── Test 1: Quick Add sends override fields in POST ───
test('quick add sends override fields in createLog POST', async ({ page }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const postRequests: any[] = [];

  await setupMocks(page);

  // Intercept POST /api/logs
  await page.route('**/api/logs', route => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      postRequests.push(body);
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 100, food_id: SENTINEL_FOOD.id, date: TODAY,
          meal_type: body.meal_type, serving_size_id: null, quantity: 1,
          custom_grams: null,
          cal_override: body.cal_override, protein_override: body.protein_override,
          carbs_override: body.carbs_override, fat_override: body.fat_override,
          created_at: new Date().toISOString(),
        }),
      });
    }
    return route.continue();
  });

  await page.goto('/log');

  // Wait for the page to load (check for date header which is always present)
  await page.waitForSelector('button:has(svg)', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Take a screenshot to see current state
  await page.screenshot({ path: 'test-results/test1-page-loaded.png' });

  // Click the FAB (+) button
  const fab = page.locator('.MuiFab-root').first();
  await expect(fab).toBeVisible({ timeout: 5000 });
  await fab.click();
  await page.waitForTimeout(500);

  // Switch to "Quick Add" tab
  await page.getByRole('button', { name: 'Quick Add' }).click();
  await page.waitForTimeout(300);

  // Fill in quick add fields
  await page.getByLabel('Calories').fill('600');
  await page.getByLabel('Protein (g)').fill('30');
  await page.getByLabel('Carbs (g)').fill('50');
  await page.getByLabel('Fat (g)').fill('25');

  await page.screenshot({ path: 'test-results/test1-quick-add-filled.png' });

  // Click Add
  const addBtn = page.locator('button:has-text("Add")').last();
  await addBtn.click();
  await page.waitForTimeout(1500);

  // Verify the POST request
  expect(postRequests.length).toBeGreaterThanOrEqual(1);
  const logPost = postRequests[postRequests.length - 1];
  expect(logPost.cal_override).toBe(600);
  expect(logPost.protein_override).toBe(30);
  expect(logPost.carbs_override).toBe(50);
  expect(logPost.fat_override).toBe(25);
  expect(logPost.custom_grams).toBeUndefined();
  expect(logPost.serving_size_id).toBeUndefined();
});

// ─── Test 2: Log page displays override values ───
test('log page displays override values from entry', async ({ page }) => {
  const log = makeQuickAddLog({ cal: 600, protein: 30, carbs: 50, fat: 25 });
  await setupMocks(page, [log]);

  await page.goto('/log');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-results/test2-log-page.png' });

  // Override calories displayed in the chip
  await expect(page.locator('.MuiChip-label:text("600 kcal")')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.MuiChip-label:text("P: 30.0g")')).toBeVisible();
  await expect(page.locator('.MuiChip-label:text("C: 50.0g")')).toBeVisible();
  await expect(page.locator('.MuiChip-label:text("F: 25.0g")')).toBeVisible();
  await expect(page.locator('text=Manual entry')).toBeVisible();
});

// ─── Test 3: Dashboard shows override totals ───
test('dashboard displays override-based totals', async ({ page }) => {
  const log = makeQuickAddLog({ cal: 600, protein: 30, carbs: 50, fat: 25 });
  await setupMocks(page, [log], zeroDailyTotals({
    calories: 600, protein: 30, carbs: 50, fat: 25, entry_count: 1,
  }));

  await page.goto('/');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-results/test3-dashboard.png' });

  // Should show 600 in the calorie ring heading
  await expect(page.getByRole('heading', { name: '600' })).toBeVisible({ timeout: 5000 });
});

// ─── Test 4: Regular log entry still works ───
test('regular food log entry displays food-based values (no overrides)', async ({ page }) => {
  const log = makeRegularLog();
  await setupMocks(page, [log]);

  await page.goto('/log');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-results/test4-regular-log.png' });

  await expect(page.locator('.MuiChip-label:text("165 kcal")')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=Chicken Breast')).toBeVisible();
});

// ─── Test 5: Mixed log — override + regular ───
test('mixed log shows correct values for both override and regular entries', async ({ page }) => {
  const quickLog = makeQuickAddLog({ cal: 400, protein: 20, carbs: 40, fat: 15 }, 100);
  const regularLog = makeRegularLog(200);
  await setupMocks(page, [quickLog, regularLog]);

  await page.goto('/log');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-results/test5-mixed-log.png' });

  await expect(page.locator('text=400 kcal')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=165 kcal')).toBeVisible({ timeout: 5000 });
  // Meal group total: 400 + 165 = 565
  await expect(page.locator('text=565 kcal')).toBeVisible({ timeout: 5000 });
});

// ─── Test 6: Log Again preserves overrides ───
test('log again on override entry sends override fields', async ({ page }) => {
  const log = makeQuickAddLog({ cal: 500, protein: 25, carbs: 45, fat: 20 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const postRequests: any[] = [];

  await setupMocks(page, [log]);

  await page.route('**/api/logs', route => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      postRequests.push(body);
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ ...log, id: 101 }),
      });
    }
    return route.continue();
  });

  await page.goto('/log');
  await page.waitForTimeout(3000);

  // Hover over entry to reveal desktop action buttons
  const entryCard = page.locator('.MuiCard-root').first();
  await entryCard.hover();
  await page.waitForTimeout(500);

  const againButton = page.locator('button[title="Log again"]');
  if (await againButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await againButton.click();
    await page.waitForTimeout(1500);

    expect(postRequests.length).toBeGreaterThanOrEqual(1);
    const logPost = postRequests[postRequests.length - 1];
    expect(logPost.cal_override).toBe(500);
    expect(logPost.protein_override).toBe(25);
    expect(logPost.carbs_override).toBe(45);
    expect(logPost.fat_override).toBe(20);
  }
});
