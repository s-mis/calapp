'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Dialog from '@mui/material/Dialog';
import { useFab } from '@/context/FabContext';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Slider from '@mui/material/Slider';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import { getDashboard, updateSetting, deleteLog } from '@/services/api';
import { DailyTotals, FoodLogWithFood, WeeklyReport } from '@/types';
import FoodLogEntry from '@/components/FoodLogEntry';
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  Legend,
  TooltipProps,
} from 'recharts';

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{
      bgcolor: 'rgba(13,13,13,0.95)',
      border: '1px solid rgba(0,229,255,0.3)',
      borderRadius: 1,
      p: 1.5,
      minWidth: 100,
    }}>
      <Typography variant="caption" sx={{ color: '#00E5FF', display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      {payload.map((p) => (
        <Box key={p.dataKey} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant="body2" sx={{ color: p.color }}>{p.name}</Typography>
          <Typography variant="body2" fontWeight={600}>
            {typeof p.value === 'number' ? (p.dataKey === 'calories' ? `${Math.round(p.value)} kcal` : `${p.value.toFixed(1)}g`) : p.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

const today = () => new Date().toISOString().split('T')[0];

const DEFAULT_CALORIE_GOAL = 2000;
const DEFAULT_PROTEIN_GOAL = 150;
const DEFAULT_CARBS_GOAL = 250;
const DEFAULT_FAT_GOAL = 65;

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MEAL_COLORS: Record<string, string> = {
  breakfast: '#00E5FF',
  lunch: '#39FF14',
  dinner: '#FFD600',
  snack: '#E040FB',
};

function getLogCalories(entry: FoodLogWithFood): number {
  if (entry.cal_override != null) return entry.cal_override;
  const gramsPerServing = entry.serving_size?.grams ?? entry.custom_grams ?? 0;
  const effectiveGrams = gramsPerServing * entry.quantity;
  const multiplier = effectiveGrams / 100;
  return (entry.food.calories ?? 0) * multiplier;
}

export default function DashboardPage() {
  const router = useRouter();
  const { setFabAction } = useFab();
  const [totals, setTotals] = useState<DailyTotals | null>(null);
  const [allLogs, setAllLogs] = useState<FoodLogWithFood[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [calorieGoal, setCalorieGoal] = useState(DEFAULT_CALORIE_GOAL);
  const [proteinGoal, setProteinGoal] = useState(DEFAULT_PROTEIN_GOAL);
  const [carbsGoal, setCarbsGoal] = useState(DEFAULT_CARBS_GOAL);
  const [fatGoal, setFatGoal] = useState(DEFAULT_FAT_GOAL);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [proteinGoalInput, setProteinGoalInput] = useState('');
  const [carbsGoalInput, setCarbsGoalInput] = useState('');
  const [fatGoalInput, setFatGoalInput] = useState('');
  const [goalError, setGoalError] = useState('');
  const [goalMode, setGoalMode] = useState<'grams' | 'percent'>('grams');
  const [proteinPct, setProteinPct] = useState(30);
  const [carbsPct, setCarbsPct] = useState(40);
  const [fatPct, setFatPct] = useState(30);
  const [autoBalance, setAutoBalance] = useState(true);

  const loadData = async () => {
    const { daily, logs, weekly, settings } = await getDashboard(today());
    setTotals(daily);
    setAllLogs(logs);
    setWeeklyReport(weekly);
    if (settings.calorie_goal) {
      setCalorieGoal(Number(settings.calorie_goal) || DEFAULT_CALORIE_GOAL);
    }
    if (settings.protein_goal) {
      setProteinGoal(Number(settings.protein_goal) || DEFAULT_PROTEIN_GOAL);
    }
    if (settings.carbs_goal) {
      setCarbsGoal(Number(settings.carbs_goal) || DEFAULT_CARBS_GOAL);
    }
    if (settings.fat_goal) {
      setFatGoal(Number(settings.fat_goal) || DEFAULT_FAT_GOAL);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    setFabAction(() => router.push('/log?openDialog=true'));
    return () => setFabAction(null);
  }, []);

  const handleDeleteLog = async (id: number) => {
    await deleteLog(id);
    loadData();
  };

  const [goalSaving, setGoalSaving] = useState(false);
  const handleGoalSave = async () => {
    const calParsed = parseInt(goalInput, 10);
    if (!calParsed || calParsed < 1 || goalSaving) return;
    setGoalSaving(true);

    let protGrams: number;
    let carbsGrams: number;
    let fatGrams: number;

    if (goalMode === 'percent') {
      if (proteinPct + carbsPct + fatPct > 100) {
        setGoalError(`Percentages add up to ${proteinPct + carbsPct + fatPct}% — must be at most 100%`);
        return;
      }
      protGrams = Math.round((calParsed * proteinPct / 100) / 4);
      carbsGrams = Math.round((calParsed * carbsPct / 100) / 4);
      fatGrams = Math.round((calParsed * fatPct / 100) / 9);
    } else {
      protGrams = parseInt(proteinGoalInput, 10) || 0;
      carbsGrams = parseInt(carbsGoalInput, 10) || 0;
      fatGrams = parseInt(fatGoalInput, 10) || 0;
      const macroCals = protGrams * 4 + carbsGrams * 4 + fatGrams * 9;
      if (macroCals > calParsed) {
        setGoalError(`Macros add up to ${macroCals} kcal which exceeds ${calParsed} kcal goal`);
        return;
      }
    }

    setGoalError('');
    await Promise.all([
      updateSetting('calorie_goal', String(calParsed)),
      protGrams > 0 ? updateSetting('protein_goal', String(protGrams)) : Promise.resolve(),
      carbsGrams > 0 ? updateSetting('carbs_goal', String(carbsGrams)) : Promise.resolve(),
      fatGrams > 0 ? updateSetting('fat_goal', String(fatGrams)) : Promise.resolve(),
    ]);
    setCalorieGoal(calParsed);
    if (protGrams > 0) setProteinGoal(protGrams);
    if (carbsGrams > 0) setCarbsGoal(carbsGrams);
    if (fatGrams > 0) setFatGoal(fatGrams);
    setGoalDialogOpen(false);
    setGoalSaving(false);
  };

  const recentLogs = useMemo(() => allLogs.slice(-5).reverse(), [allLogs]);

  const macroData = useMemo(() => {
    if (!totals) return [];
    const protein = totals.protein ?? 0;
    const carbs = totals.carbs ?? 0;
    const fat = totals.fat ?? 0;
    if (protein + carbs + fat === 0) return [];
    return [
      { name: 'Protein', value: protein, color: '#39FF14' },
      { name: 'Carbs', value: carbs, color: '#FFD600' },
      { name: 'Fat', value: fat, color: '#FF6B35' },
    ];
  }, [totals]);

  const mealData = useMemo(() => {
    if (allLogs.length === 0) return [];
    const byMeal: Record<string, number> = {};
    for (const log of allLogs) {
      const cals = getLogCalories(log);
      byMeal[log.meal_type] = (byMeal[log.meal_type] ?? 0) + cals;
    }
    return Object.entries(byMeal)
      .filter(([, v]) => v > 0)
      .map(([meal, cals]) => ({
        name: meal.charAt(0).toUpperCase() + meal.slice(1),
        value: Math.round(cals),
        color: MEAL_COLORS[meal] ?? '#999',
      }));
  }, [allLogs]);

  const weeklyData = useMemo(() => {
    if (!weeklyReport) return [];
    return weeklyReport.days.map((day) => {
      const d = new Date(day.date + 'T00:00:00');
      const dayIndex = (d.getDay() + 6) % 7;
      const cals = Math.round(day.calories);
      return {
        name: DAY_LABELS[dayIndex],
        calories: cals,
        // Ghost value for empty days so bar is still visible
        ghost: cals === 0 ? 1 : 0,
        protein: parseFloat(day.protein.toFixed(1)),
        carbs: parseFloat(day.carbs.toFixed(1)),
        fat: parseFloat(day.fat.toFixed(1)),
      };
    });
  }, [weeklyReport]);

  const weeklyAvg = useMemo(() => {
    if (!weeklyReport) return null;
    const days = weeklyReport.days;
    const activeDays = days.filter(d => d.entry_count > 0);
    const count = activeDays.length || 1;
    return {
      calories: Math.round(activeDays.reduce((s, d) => s + d.calories, 0) / count),
      protein: parseFloat((activeDays.reduce((s, d) => s + d.protein, 0) / count).toFixed(1)),
      carbs: parseFloat((activeDays.reduce((s, d) => s + d.carbs, 0) / count).toFixed(1)),
      fat: parseFloat((activeDays.reduce((s, d) => s + d.fat, 0) / count).toFixed(1)),
      daysTracked: activeDays.length,
    };
  }, [weeklyReport]);

  const calories = totals?.calories ?? 0;
  const calorieValue = Math.min(calories, calorieGoal);
  const isOver = calories > calorieGoal;

  return (
    <Box sx={{ p: 2, pb: '120px' }}>
      <Typography variant="h5" gutterBottom>Today</Typography>

      {/* 1. Today's Summary — 2x2 grid */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>

            {/* Calorie Ring — full-width on mobile */}
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
              <Box sx={{ position: 'relative', width: { xs: 200, sm: 160 }, height: { xs: 200, sm: 160 }, filter: `drop-shadow(0 0 8px ${isOver ? 'rgba(255,23,68,0.4)' : 'rgba(0,229,255,0.4)'})` }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="70%"
                    outerRadius="90%"
                    startAngle={90}
                    endAngle={-270}
                    data={[{ value: calorieValue, fill: isOver ? '#FF1744' : '#00E5FF' }]}
                  >
                    <PolarAngleAxis type="number" domain={[0, calorieGoal]} angleAxisId={0} tick={false} />
                    <RadialBar
                      background={{ fill: '#2A2A2A' }}
                      dataKey="value"
                      angleAxisId={0}
                      cornerRadius={10}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="h5" fontWeight="bold" color={isOver ? 'error.main' : 'text.primary'}>
                    {calories.toFixed(0)}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                    onClick={() => {
                      setGoalInput(String(calorieGoal));
                      setProteinGoalInput(String(proteinGoal));
                      setCarbsGoalInput(String(carbsGoal));
                      setFatGoalInput(String(fatGoal));
                      setGoalError('');
                      setGoalDialogOpen(true);
                    }}
                  >
                    / {calorieGoal} kcal
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Top-right: Macro goal rows */}
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1.5 }}>
              {([
                { label: 'Protein', value: totals?.protein ?? 0, goal: proteinGoal, color: '#39FF14' },
                { label: 'Carbs', value: totals?.carbs ?? 0, goal: carbsGoal, color: '#FFD600' },
                { label: 'Fat', value: totals?.fat ?? 0, goal: fatGoal, color: '#FF6B35' },
              ] as const).map((g) => {
                const pct = g.goal > 0 ? Math.min((g.value / g.goal) * 100, 100) : 0;
                const over = g.value > g.goal;
                const displayColor = over ? '#FF1744' : g.color;
                return (
                  <Box key={g.label}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                      <Typography variant="caption" fontWeight={500} sx={{ color: displayColor }}>
                        {g.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {g.value.toFixed(1)}/{g.goal}g
                      </Typography>
                    </Box>
                    <Box sx={{ width: '100%', height: 6, borderRadius: 3, bgcolor: '#2A2A2A' }}>
                      <Box sx={{
                        width: `${pct}%`,
                        height: '100%',
                        borderRadius: 3,
                        bgcolor: displayColor,
                        boxShadow: `0 0 8px ${displayColor}66`,
                        transition: 'width 0.3s ease',
                      }} />
                    </Box>
                  </Box>
                );
              })}
            </Box>

            {/* Bottom-left: Remaining kcal */}
            <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              {(() => {
                const remaining = calorieGoal - calories;
                const isOverBudget = remaining < 0;
                const color = isOverBudget ? '#FF1744' : '#39FF14';
                return (
                  <>
                    <Typography
                      variant="h4"
                      fontWeight="bold"
                      sx={{
                        color,
                        textShadow: `0 0 12px ${color}66`,
                        ...(isOverBudget ? {
                          animation: 'pulse 2s ease-in-out infinite',
                          '@keyframes pulse': {
                            '0%, 100%': { opacity: 1 },
                            '50%': { opacity: 0.7 },
                          },
                        } : {}),
                      }}
                    >
                      {Math.abs(Math.round(remaining))}
                    </Typography>
                    <Typography variant="caption" sx={{ color }}>
                      kcal {isOverBudget ? 'over' : 'left'}
                    </Typography>
                  </>
                );
              })()}
              {(totals?.fiber ?? 0) > 0 && (
                <Typography variant="caption" color="#E040FB" sx={{ mt: 0.5 }}>
                  Fiber: {(totals!.fiber).toFixed(1)}g
                </Typography>
              )}
            </Box>

            {/* Bottom-right: By Meal */}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 0.5 }}>
                By Meal
              </Typography>
              {mealData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={110}>
                    <PieChart>
                      <Pie
                        data={mealData}
                        cx="50%"
                        cy="50%"
                        outerRadius={45}
                        innerRadius={30}
                        dataKey="value"
                        stroke="none"
                      >
                        {mealData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: number) => `${val} kcal`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                    {mealData.map((m) => (
                      <Box key={m.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: m.color }} />
                        <Typography variant="caption">{m.name} {m.value}</Typography>
                      </Box>
                    ))}
                  </Box>
                </>
              ) : (
                <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ display: 'block', mt: 4 }}>
                  No data
                </Typography>
              )}
            </Box>

          </Box>
        </CardContent>
      </Card>

      {/* Goal Edit Dialog */}
      <Dialog open={goalDialogOpen} onClose={() => setGoalDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Set Daily Goals</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            type="number"
            label="Calories (kcal)"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleGoalSave(); }}
            sx={{ mt: 1 }}
            slotProps={{ htmlInput: { min: 1, step: 50 } }}
          />

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 1 }}>
            <ToggleButtonGroup
              value={goalMode}
              exclusive
              size="small"
              onChange={(_, v) => {
                if (!v) return;
                setGoalError('');
                if (v === 'percent') {
                  const cal = parseInt(goalInput, 10) || DEFAULT_CALORIE_GOAL;
                  const p = parseInt(proteinGoalInput, 10) || 0;
                  const c = parseInt(carbsGoalInput, 10) || 0;
                  const f = parseInt(fatGoalInput, 10) || 0;
                  setProteinPct(Math.round((p * 4 / cal) * 100));
                  setCarbsPct(Math.round((c * 4 / cal) * 100));
                  setFatPct(Math.round((f * 9 / cal) * 100));
                } else {
                  const cal = parseInt(goalInput, 10) || DEFAULT_CALORIE_GOAL;
                  setProteinGoalInput(String(Math.round((cal * proteinPct / 100) / 4)));
                  setCarbsGoalInput(String(Math.round((cal * carbsPct / 100) / 4)));
                  setFatGoalInput(String(Math.round((cal * fatPct / 100) / 9)));
                }
                setGoalMode(v);
              }}
            >
              <ToggleButton value="grams">Grams</ToggleButton>
              <ToggleButton value="percent">% of Calories</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {goalMode === 'grams' ? (
            <>
              <TextField
                fullWidth
                type="number"
                label="Protein (g)"
                value={proteinGoalInput}
                onChange={(e) => setProteinGoalInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleGoalSave(); }}
                sx={{ mt: 1 }}
                slotProps={{ htmlInput: { min: 1, step: 5 } }}
              />
              <TextField
                fullWidth
                type="number"
                label="Carbs (g)"
                value={carbsGoalInput}
                onChange={(e) => setCarbsGoalInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleGoalSave(); }}
                sx={{ mt: 2 }}
                slotProps={{ htmlInput: { min: 1, step: 5 } }}
              />
              <TextField
                fullWidth
                type="number"
                label="Fat (g)"
                value={fatGoalInput}
                onChange={(e) => setFatGoalInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleGoalSave(); }}
                sx={{ mt: 2 }}
                slotProps={{ htmlInput: { min: 1, step: 5 } }}
              />
            </>
          ) : (
            <>
              <FormControlLabel
                control={<Checkbox checked={autoBalance} onChange={(e) => setAutoBalance(e.target.checked)} size="small" />}
                label={<Typography variant="body2">Auto-balance to 100%</Typography>}
                sx={{ mt: 0.5, mb: 0.5 }}
              />
              {(() => {
                const cal = parseInt(goalInput, 10) || 0;
                const handleSlider = (
                  changed: 'protein' | 'carbs' | 'fat',
                  newVal: number,
                ) => {
                  if (!autoBalance) {
                    if (changed === 'protein') setProteinPct(newVal);
                    else if (changed === 'carbs') setCarbsPct(newVal);
                    else setFatPct(newVal);
                    return;
                  }
                  const others = changed === 'protein'
                    ? { a: carbsPct, b: fatPct, setA: setCarbsPct, setB: setFatPct }
                    : changed === 'carbs'
                      ? { a: proteinPct, b: fatPct, setA: setProteinPct, setB: setFatPct }
                      : { a: proteinPct, b: carbsPct, setA: setProteinPct, setB: setCarbsPct };
                  const remaining = 100 - newVal;
                  const otherSum = others.a + others.b;
                  let newA: number;
                  let newB: number;
                  if (otherSum === 0) {
                    newA = Math.round(remaining / 2);
                    newB = remaining - newA;
                  } else {
                    newA = Math.round((others.a / otherSum) * remaining);
                    newB = remaining - newA;
                  }
                  newA = Math.max(0, Math.min(100, newA));
                  newB = Math.max(0, Math.min(100, newB));
                  if (changed === 'protein') setProteinPct(newVal);
                  else if (changed === 'carbs') setCarbsPct(newVal);
                  else setFatPct(newVal);
                  others.setA(newA);
                  others.setB(newB);
                };
                const sliders: { key: 'protein' | 'carbs' | 'fat'; label: string; value: number; color: string; calsPerGram: number }[] = [
                  { key: 'protein', label: 'Protein', value: proteinPct, color: '#39FF14', calsPerGram: 4 },
                  { key: 'carbs', label: 'Carbs', value: carbsPct, color: '#FFD600', calsPerGram: 4 },
                  { key: 'fat', label: 'Fat', value: fatPct, color: '#FF6B35', calsPerGram: 9 },
                ];
                return sliders.map((s) => (
                  <Box key={s.key} sx={{ px: 1, mt: s.key === 'protein' ? 0 : 0.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: s.color }}>{s.label}</Typography>
                      <Typography variant="body2" sx={{ color: s.color }}>{s.value}% — {Math.round((cal * s.value / 100) / s.calsPerGram)}g</Typography>
                    </Box>
                    <Slider
                      value={s.value}
                      onChange={(_, v) => handleSlider(s.key, v as number)}
                      min={0} max={100} step={1}
                      sx={{ color: s.color }}
                    />
                  </Box>
                ));
              })()}
              <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 0.5 }}>
                Total: {proteinPct + carbsPct + fatPct}%{proteinPct + carbsPct + fatPct < 100 ? ` (${100 - proteinPct - carbsPct - fatPct}% unallocated)` : ''}
              </Typography>
            </>
          )}

          {goalError && (
            <Typography variant="body2" color="error" sx={{ mt: 1.5 }}>
              {goalError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGoalDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleGoalSave} disabled={goalSaving}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* 4. This Week */}
      {weeklyData.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="subtitle2" gutterBottom textAlign="center">This Week</Typography>

            {weeklyAvg && weeklyAvg.daysTracked > 0 && (() => {
              const gauges = [
                { label: 'Cals', value: weeklyAvg.calories, goal: calorieGoal, unit: 'kcal', color: '#00E5FF', decimals: 0 },
                { label: 'Protein', value: weeklyAvg.protein, goal: proteinGoal, unit: 'g', color: '#39FF14', decimals: 1 },
                { label: 'Carbs', value: weeklyAvg.carbs, goal: carbsGoal, unit: 'g', color: '#FFD600', decimals: 1 },
                { label: 'Fat', value: weeklyAvg.fat, goal: fatGoal, unit: 'g', color: '#FF6B35', decimals: 1 },
              ];
              return (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 1 }}>
                    Daily averages ({weeklyAvg.daysTracked} day{weeklyAvg.daysTracked !== 1 ? 's' : ''} tracked)
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start' }}>
                    {gauges.map((g) => {
                      const pct = g.goal > 0 ? Math.round((g.value / g.goal) * 100) : 0;
                      const isOver = pct > 100;
                      const displayColor = isOver ? '#FF1744' : g.color;
                      return (
                        <Box key={g.label} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 64 }}>
                          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                            <CircularProgress
                              variant="determinate"
                              value={100}
                              size={56}
                              thickness={4}
                              sx={{ color: '#2A2A2A', position: 'absolute' }}
                            />
                            <CircularProgress
                              variant="determinate"
                              value={Math.min(pct, 100)}
                              size={56}
                              thickness={4}
                              sx={{ color: displayColor, filter: `drop-shadow(0 0 4px ${displayColor})` }}
                            />
                            <Box sx={{
                              position: 'absolute',
                              top: 0, left: 0, bottom: 0, right: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              <Typography variant="caption" fontWeight="bold" sx={{ fontSize: 11, color: displayColor }}>
                                {pct}%
                              </Typography>
                            </Box>
                          </Box>
                          <Typography variant="caption" sx={{ mt: 0.5, fontWeight: 500, fontSize: 11 }}>
                            {g.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                            {g.value.toFixed(g.decimals)} {g.unit}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              );
            })()}

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 0.5 }}>
              Calories
            </Typography>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, Math.ceil(Math.max(calorieGoal, ...weeklyData.map(d => d.calories)) * 1.15)]} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine
                  y={calorieGoal}
                  stroke="#FF1744"
                  strokeDasharray="4 4"
                  label={{ value: `Goal ${calorieGoal}`, position: 'insideTopRight', fontSize: 11, fill: '#FF1744' }}
                />
                {weeklyAvg && weeklyAvg.daysTracked > 0 && (
                  <ReferenceLine
                    y={weeklyAvg.calories}
                    stroke="#39FF14"
                    strokeDasharray="6 3"
                    label={{ value: `Avg ${weeklyAvg.calories}`, position: 'insideBottomRight', fontSize: 11, fill: '#39FF14' }}
                  />
                )}
                <Bar dataKey="calories" name="Calories" fill="#00E5FF" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(data: { name: string }) => {
                  if (!weeklyReport) return;
                  const day = weeklyReport.days.find(d => {
                    const dd = new Date(d.date + 'T00:00:00');
                    const idx = (dd.getDay() + 6) % 7;
                    return DAY_LABELS[idx] === data.name;
                  });
                  if (day) router.push(`/log?date=${day.date}`);
                }} />
                <Bar dataKey="ghost" fill="#00E5FF" opacity={0.15} radius={[4, 4, 0, 0]} legendType="none" name="" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2, mb: 0.5 }}>
              Macros (g)
            </Typography>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, Math.ceil(Math.max(proteinGoal, carbsGoal, fatGoal, ...weeklyData.map(d => Math.max(d.protein, d.carbs, d.fat))) * 1.15)]} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={proteinGoal} stroke="#39FF14" strokeDasharray="4 4" label={{ value: `P ${proteinGoal}g`, position: 'insideTopRight', fontSize: 10, fill: '#39FF14' }} />
                <ReferenceLine y={carbsGoal} stroke="#FFD600" strokeDasharray="4 4" label={{ value: `C ${carbsGoal}g`, position: 'insideTopRight', fontSize: 10, fill: '#FFD600' }} />
                <ReferenceLine y={fatGoal} stroke="#FF6B35" strokeDasharray="4 4" label={{ value: `F ${fatGoal}g`, position: 'insideTopRight', fontSize: 10, fill: '#FF6B35' }} />
                <Bar dataKey="protein" name="Protein" fill="#39FF14" radius={[4, 4, 0, 0]} />
                <Bar dataKey="carbs" name="Carbs" fill="#FFD600" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fat" name="Fat" fill="#FF6B35" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 5. Recent Entries */}
      {recentLogs.length > 0 && (
        <>
          <Typography variant="subtitle1" gutterBottom>Recent Entries</Typography>
          {recentLogs.map(entry => (
            <FoodLogEntry key={entry.id} entry={entry} onDelete={handleDeleteLog} />
          ))}
        </>
      )}

      {recentLogs.length === 0 && totals?.entry_count === 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">No entries yet today.</Typography>
            <Typography variant="body2" color="text.secondary">Tap + to log your first meal!</Typography>
          </CardContent>
        </Card>
      )}

    </Box>
  );
}
