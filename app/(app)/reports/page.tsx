'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFab } from '@/context/FabContext';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import TextField from '@mui/material/TextField';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import DownloadIcon from '@mui/icons-material/Download';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, TooltipProps,
} from 'recharts';
import { getDailyReport, getWeeklyReport, getMonthlyReport, getSettings, getWeightLogs } from '@/services/api';
import { DailyTotals, WeightLog } from '@/types';

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const dateLabel = typeof label === 'string' && label.includes('-')
    ? new Date(label + 'T00:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })
    : label;
  return (
    <Box sx={{
      bgcolor: 'rgba(13,13,13,0.95)',
      border: '1px solid rgba(0,229,255,0.3)',
      borderRadius: 1,
      p: 1.5,
      minWidth: 120,
    }}>
      <Typography variant="caption" sx={{ color: '#00E5FF', display: 'block', mb: 0.5 }}>
        {dateLabel}
      </Typography>
      {payload.map((p) => (
        <Box key={p.dataKey} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant="body2" sx={{ color: p.color }}>{p.name}</Typography>
          <Typography variant="body2" fontWeight={600}>
            {typeof p.value === 'number' ? (p.dataKey === 'calories' || p.name === 'Calories' ? `${Math.round(p.value)} kcal` : `${p.value.toFixed(1)}g`) : p.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

type ViewMode = 'daily' | 'weekly' | 'monthly' | 'weight';

const today = () => new Date().toISOString().split('T')[0];
const currentMonth = () => new Date().toISOString().slice(0, 7);

function computeStreak(days: DailyTotals[]): { current: number; longest: number } {
  let current = 0;
  let longest = 0;
  let streak = 0;
  // Sort by date descending to compute current streak
  const sorted = [...days].sort((a, b) => b.date.localeCompare(a.date));
  for (const day of sorted) {
    if (day.entry_count > 0) {
      streak++;
      longest = Math.max(longest, streak);
    } else {
      if (streak > 0) {
        current = current || streak;
      }
      streak = 0;
    }
  }
  if (streak > 0) {
    current = current || streak;
    longest = Math.max(longest, streak);
  }
  // For current streak, count from most recent day backwards
  current = 0;
  for (const day of sorted) {
    if (day.entry_count > 0) current++;
    else break;
  }
  return { current, longest };
}

function downloadCSV(data: DailyTotals[], filename: string) {
  const headers = ['Date', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Fiber (g)', 'Sugar (g)', 'Entries'];
  const rows = data.map(d => [d.date, d.calories.toFixed(0), d.protein.toFixed(1), d.carbs.toFixed(1), d.fat.toFixed(1), d.fiber.toFixed(1), d.sugar.toFixed(1), d.entry_count]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const router = useRouter();
  const { setFabAction } = useFab();
  const [view, setView] = useState<ViewMode>('weekly');
  const [date, setDate] = useState(today());
  const [month, setMonth] = useState(currentMonth());
  const [dailyData, setDailyData] = useState<DailyTotals | null>(null);
  const [chartData, setChartData] = useState<DailyTotals[]>([]);
  const [prevWeekData, setPrevWeekData] = useState<DailyTotals[]>([]);
  const [compareWeek, setCompareWeek] = useState(false);
  const [calorieGoal, setCalorieGoal] = useState<number | null>(null);
  const [weightData, setWeightData] = useState<WeightLog[]>([]);
  const [weightRange, setWeightRange] = useState<'30' | '90' | '180' | '365'>('90');
  const [weightGoal, setWeightGoal] = useState<number | null>(null);
  const [weightUnit, setWeightUnit] = useState<string>('kg');

  useEffect(() => {
    setFabAction(() => router.push('/log?openDialog=true'));
    return () => setFabAction(null);
  }, []);

  useEffect(() => {
    getSettings().then(s => {
      if (s.calorie_goal) setCalorieGoal(Number(s.calorie_goal) || null);
      if (s.weight_goal) setWeightGoal(Number(s.weight_goal) || null);
      if (s.weight_unit) setWeightUnit(s.weight_unit);
    });
  }, []);

  const loadWeightData = useCallback(() => {
    const end = today();
    const d = new Date();
    d.setDate(d.getDate() - parseInt(weightRange));
    const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    getWeightLogs({ start, end }).then(setWeightData);
  }, [weightRange]);

  useEffect(() => {
    if (view === 'daily') {
      getDailyReport(date).then(setDailyData);
    } else if (view === 'weekly') {
      getWeeklyReport(date).then(r => setChartData(r.days));
      const prev = new Date(date + 'T00:00:00');
      prev.setDate(prev.getDate() - 7);
      const prevStr = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`;
      getWeeklyReport(prevStr).then(r => setPrevWeekData(r.days));
    } else if (view === 'monthly') {
      getMonthlyReport(month).then(r => setChartData(r.days));
    } else if (view === 'weight') {
      loadWeightData();
    }
  }, [view, date, month, loadWeightData]);

  // Streak calculation for monthly data
  const streak = useMemo(() => {
    if (view !== 'monthly' || chartData.length === 0) return null;
    return computeStreak(chartData);
  }, [view, chartData]);

  // Macro ratio data for monthly view
  const macroRatioData = useMemo(() => {
    if (view !== 'monthly') return [];
    return chartData.filter(d => d.entry_count > 0).map(d => {
      const pCals = d.protein * 4;
      const cCals = d.carbs * 4;
      const fCals = d.fat * 9;
      const total = pCals + cCals + fCals;
      return {
        date: d.date,
        proteinPct: total > 0 ? Math.round((pCals / total) * 100) : 0,
        carbsPct: total > 0 ? Math.round((cCals / total) * 100) : 0,
        fatPct: total > 0 ? Math.round((fCals / total) * 100) : 0,
      };
    });
  }, [view, chartData]);

  // Swipe navigation
  const swipeRef = useRef<{ startX: number; startY: number } | null>(null);
  const isToday = date === today();
  const dateDisplay = (() => {
    const d = new Date(date + 'T00:00:00');
    if (view === 'daily') return d.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' });
    const dayOfWeek = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return `${monday.toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`;
  })();
  const monthDisplay = (() => {
    const [y, m] = month.split('-').map(Number);
    return new Date(y, m - 1).toLocaleDateString('en', { month: 'long', year: 'numeric' });
  })();
  const handleSwipeStart = (e: React.TouchEvent) => {
    swipeRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY };
  };
  const handleSwipeEnd = (e: React.TouchEvent) => {
    if (!swipeRef.current) return;
    const dx = e.changedTouches[0].clientX - swipeRef.current.startX;
    const dy = e.changedTouches[0].clientY - swipeRef.current.startY;
    swipeRef.current = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (view === 'weight') return; // no swipe navigation for weight view
      if (view === 'monthly') changeMonth(dx < 0 ? 1 : -1);
      else changeDate(dx < 0 ? (view === 'weekly' ? 7 : 1) : (view === 'weekly' ? -7 : -1));
    }
  };

  const changeDate = (days: number) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + days);
    setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  const changeMonth = (dir: number) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const formatDay = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return view === 'weekly'
      ? d.toLocaleDateString('en', { weekday: 'short' })
      : String(d.getDate());
  };

  const handleBarClick = (data: { date?: string }) => {
    if (data?.date) router.push(`/log?date=${data.date}`);
  };

  const handleCSVExport = () => {
    if (view === 'weight' && weightData.length > 0) {
      const headers = ['Date', `Weight (${weightUnit})`, 'Notes'];
      const rows = weightData.map(d => [d.date, d.weight.toString(), d.notes || '']);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `calapp-weight-${weightRange}d.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (view === 'daily' && dailyData) {
      downloadCSV([dailyData], `calapp-daily-${date}.csv`);
    } else if (chartData.length > 0) {
      const prefix = view === 'weekly' ? `calapp-weekly-${date}` : `calapp-monthly-${month}`;
      downloadCSV(chartData, `${prefix}.csv`);
    }
  };

  return (
    <Box sx={{ p: 2 }} onTouchStart={handleSwipeStart} onTouchEnd={handleSwipeEnd}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h5">Reports</Typography>
        <IconButton size="small" onClick={handleCSVExport} title="Export CSV" sx={{ color: '#9E9E9E' }}>
          <DownloadIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={(_, v) => v && setView(v)}
          size="small"
        >
          <ToggleButton value="daily">Daily</ToggleButton>
          <ToggleButton value="weekly">Weekly</ToggleButton>
          <ToggleButton value="monthly">Monthly</ToggleButton>
          <ToggleButton value="weight">Weight</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {view === 'weight' ? null : view !== 'monthly' ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, gap: 0.5 }}>
          <IconButton onClick={() => changeDate(view === 'weekly' ? -7 : -1)}>
            <ChevronLeftIcon />
          </IconButton>
          <Typography
            variant="subtitle1"
            sx={{ minWidth: 180, textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'date';
              input.value = date;
              input.style.position = 'fixed';
              input.style.opacity = '0';
              input.addEventListener('change', () => { setDate(input.value); input.remove(); });
              input.addEventListener('blur', () => input.remove());
              document.body.appendChild(input);
              input.showPicker();
            }}
          >
            {dateDisplay}
          </Typography>
          <IconButton onClick={() => changeDate(view === 'weekly' ? 7 : 1)}>
            <ChevronRightIcon />
          </IconButton>
          {!isToday && (
            <IconButton size="small" onClick={() => setDate(today())} title="Go to today" sx={{ color: '#00E5FF' }}>
              <TodayIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, gap: 0.5 }}>
          <IconButton onClick={() => changeMonth(-1)}>
            <ChevronLeftIcon />
          </IconButton>
          <Typography
            variant="subtitle1"
            sx={{ minWidth: 160, textAlign: 'center', userSelect: 'none' }}
          >
            {monthDisplay}
          </Typography>
          <IconButton onClick={() => changeMonth(1)}>
            <ChevronRightIcon />
          </IconButton>
        </Box>
      )}

      {view === 'daily' && dailyData && (() => {
        const pCals = dailyData.protein * 4;
        const cCals = dailyData.carbs * 4;
        const fCals = dailyData.fat * 9;
        const macroPieData = [
          { name: 'Protein', value: Math.round(pCals), color: '#39FF14' },
          { name: 'Carbs', value: Math.round(cCals), color: '#FFD600' },
          { name: 'Fat', value: Math.round(fCals), color: '#FF6B35' },
        ].filter(d => d.value > 0);
        const goalPct = calorieGoal ? Math.min((dailyData.calories / calorieGoal) * 100, 100) : null;
        const isOver = calorieGoal ? dailyData.calories > calorieGoal : false;
        return (
          <>
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="h3" fontWeight="bold" sx={{ color: isOver ? '#FF1744' : '#00E5FF' }}>
                    {dailyData.calories.toFixed(0)}
                  </Typography>
                  <Typography variant="h6" color="text.secondary">kcal</Typography>
                </Box>
                {calorieGoal && (
                  <Box sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                      <Typography variant="caption" color="text.secondary">Goal: {calorieGoal} kcal</Typography>
                      <Typography variant="caption" sx={{ color: isOver ? '#FF1744' : '#39FF14' }}>
                        {isOver ? `${Math.round(dailyData.calories - calorieGoal)} over` : `${Math.round(calorieGoal - dailyData.calories)} left`}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={goalPct!}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: '#2A2A2A',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 4,
                          bgcolor: isOver ? '#FF1744' : '#00E5FF',
                          boxShadow: `0 0 8px ${isOver ? '#FF174466' : '#00E5FF66'}`,
                        },
                      }}
                    />
                  </Box>
                )}
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  {dailyData.entry_count} entries
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="subtitle2" textAlign="center" sx={{ mb: 1 }}>Macro Breakdown</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flex: '0 0 120px' }}>
                    {macroPieData.length > 0 ? (
                      <ResponsiveContainer width={120} height={120}>
                        <PieChart>
                          <Pie data={macroPieData} cx="50%" cy="50%" outerRadius={50} innerRadius={30} dataKey="value" stroke="none">
                            {macroPieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                          </Pie>
                          <Tooltip formatter={(val: number, name: string) => [`${val} kcal`, name]} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <Box sx={{ width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="caption" color="text.secondary">No data</Typography>
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {[
                      { label: 'Protein', value: dailyData.protein, cals: pCals, color: '#39FF14' },
                      { label: 'Carbs', value: dailyData.carbs, cals: cCals, color: '#FFD600' },
                      { label: 'Fat', value: dailyData.fat, cals: fCals, color: '#FF6B35' },
                    ].map(m => (
                      <Box key={m.label}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" sx={{ color: m.color, fontWeight: 500 }}>{m.label}</Typography>
                          <Typography variant="body2">{m.value.toFixed(1)}g <Typography component="span" variant="caption" color="text.secondary">({Math.round(m.cals)} kcal)</Typography></Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Chip label={`Fiber: ${dailyData.fiber.toFixed(1)}g`} size="small" sx={{ color: '#E040FB', borderColor: '#E040FB' }} variant="outlined" />
                  <Chip label={`Sugar: ${dailyData.sugar.toFixed(1)}g`} size="small" sx={{ color: '#FFD600', borderColor: '#FFD600' }} variant="outlined" />
                </Box>
              </CardContent>
            </Card>
          </>
        );
      })()}

      {view === 'weekly' && chartData.length > 0 && (() => {
        const activeDays = chartData.filter(d => d.entry_count > 0);
        const daysLogged = activeDays.length;
        const avgCals = daysLogged > 0 ? Math.round(activeDays.reduce((s, d) => s + d.calories, 0) / daysLogged) : 0;
        const goalDiff = calorieGoal && daysLogged > 0
          ? Math.round(((avgCals - calorieGoal) / calorieGoal) * 100)
          : null;
        const insight = daysLogged === 0
          ? 'No entries this week yet.'
          : goalDiff != null
            ? goalDiff > 5
              ? `You averaged ${goalDiff}% over goal — consider lighter meals.`
              : goalDiff < -10
                ? `You averaged ${Math.abs(goalDiff)}% under goal — make sure you're eating enough.`
                : `On track! Averaging within ${Math.abs(goalDiff)}% of your goal.`
            : daysLogged >= 5
              ? `Great consistency! ${daysLogged}/7 days logged.`
              : `${daysLogged}/7 days logged — try to log more consistently.`;

        const mergedData = chartData.map((day, i) => ({
          ...day,
          prevCalories: prevWeekData[i]?.calories ?? 0,
          prevProtein: prevWeekData[i]?.protein ?? 0,
          prevCarbs: prevWeekData[i]?.carbs ?? 0,
          prevFat: prevWeekData[i]?.fat ?? 0,
        }));

        return (
        <>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Chip label={`Avg ${avgCals.toLocaleString()} kcal`} size="small" sx={{ color: '#00E5FF', borderColor: '#00E5FF' }} variant="outlined" />
            <Chip label={`${daysLogged}/7 days`} size="small" sx={{ color: '#39FF14', borderColor: '#39FF14' }} variant="outlined" />
            {goalDiff != null && (
              <Chip
                label={`${goalDiff > 0 ? '+' : ''}${goalDiff}% vs goal`}
                size="small"
                sx={{ color: Math.abs(goalDiff) <= 5 ? '#39FF14' : '#FFD600', borderColor: Math.abs(goalDiff) <= 5 ? '#39FF14' : '#FFD600' }}
                variant="outlined"
              />
            )}
            <Chip
              label={compareWeek ? 'Hide last week' : 'Compare last week'}
              size="small"
              onClick={() => setCompareWeek(v => !v)}
              sx={{
                color: compareWeek ? '#0D0D0D' : '#9E9E9E',
                bgcolor: compareWeek ? '#00E5FF' : 'transparent',
                borderColor: '#9E9E9E',
                cursor: 'pointer',
              }}
              variant={compareWeek ? 'filled' : 'outlined'}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
            {insight}
          </Typography>

          <Card sx={{ mb: 2, p: 1 }}>
            <Typography variant="subtitle2" sx={{ ml: 1, mb: 1 }}>Calories</Typography>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={mergedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDay} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                {calorieGoal && (
                  <ReferenceLine
                    y={calorieGoal}
                    stroke="#FF1744"
                    strokeDasharray="4 4"
                    label={{ value: `Goal ${calorieGoal}`, position: 'insideTopRight', fontSize: 11, fill: '#FF1744' }}
                  />
                )}
                {compareWeek && <Bar dataKey="prevCalories" fill="#00E5FF" opacity={0.2} name="Last Week" radius={[4, 4, 0, 0]} />}
                <Bar dataKey="calories" fill="#00E5FF" name="Calories" radius={[4, 4, 0, 0]} cursor="pointer" onClick={handleBarClick} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card sx={{ p: 1 }}>
            <Typography variant="subtitle2" sx={{ ml: 1, mb: 1 }}>Macros</Typography>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={mergedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDay} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                {compareWeek && <Bar dataKey="prevProtein" fill="#39FF14" opacity={0.2} name="Prev Protein" radius={[4, 4, 0, 0]} />}
                {compareWeek && <Bar dataKey="prevCarbs" fill="#FFD600" opacity={0.2} name="Prev Carbs" radius={[4, 4, 0, 0]} />}
                {compareWeek && <Bar dataKey="prevFat" fill="#FF6B35" opacity={0.2} name="Prev Fat" radius={[4, 4, 0, 0]} />}
                <Bar dataKey="protein" fill="#39FF14" name="Protein" radius={[4, 4, 0, 0]} />
                <Bar dataKey="carbs" fill="#FFD600" name="Carbs" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fat" fill="#FF6B35" name="Fat" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
        );
      })()}

      {view === 'monthly' && chartData.length > 0 && (
        <>
          {/* Streak counter */}
          {streak && (streak.current > 0 || streak.longest > 0) && (
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LocalFireDepartmentIcon sx={{ color: streak.current >= 3 ? '#FF6B35' : '#9E9E9E', fontSize: 20 }} />
                    <Box>
                      <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1, color: streak.current >= 3 ? '#FF6B35' : 'text.primary' }}>
                        {streak.current}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">current</Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1, color: '#E040FB' }}>
                      {streak.longest}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">best streak</Typography>
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1 }}>
                      {chartData.filter(d => d.entry_count > 0).length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">days logged</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}

          <Card sx={{ mb: 2, p: 1 }}>
            <Typography variant="subtitle2" sx={{ ml: 1, mb: 1 }}>Calories</Typography>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDay} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="calories" stroke="#00E5FF" fill="#00E5FF" fillOpacity={0.15} name="Calories" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          <Card sx={{ mb: 2, p: 1 }}>
            <Typography variant="subtitle2" sx={{ ml: 1, mb: 1 }}>Macros</Typography>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDay} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="protein" stroke="#39FF14" name="Protein" dot={false} />
                <Line type="monotone" dataKey="carbs" stroke="#FFD600" name="Carbs" dot={false} />
                <Line type="monotone" dataKey="fat" stroke="#FF6B35" name="Fat" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Macro ratio trend (stacked percentage chart) */}
          {macroRatioData.length > 0 && (
            <Card sx={{ p: 1 }}>
              <Typography variant="subtitle2" sx={{ ml: 1, mb: 1 }}>Macro Ratio Trend (%)</Typography>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={macroRatioData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={d => String(new Date(d + 'T00:00:00').getDate())} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip formatter={(val: number, name: string) => [`${val}%`, name]} />
                  <Legend />
                  <Bar dataKey="proteinPct" stackId="macro" fill="#39FF14" name="Protein" />
                  <Bar dataKey="carbsPct" stackId="macro" fill="#FFD600" name="Carbs" />
                  <Bar dataKey="fatPct" stackId="macro" fill="#FF6B35" name="Fat" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </>
      )}

      {view === 'weight' && (
        <>
          {/* Range selector */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <ToggleButtonGroup
              value={weightRange}
              exclusive
              onChange={(_, v) => v && setWeightRange(v)}
              size="small"
            >
              <ToggleButton value="30">30d</ToggleButton>
              <ToggleButton value="90">90d</ToggleButton>
              <ToggleButton value="180">6mo</ToggleButton>
              <ToggleButton value="365">1yr</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Stats summary chips */}
          {weightData.length > 0 && (() => {
            const latest = weightData[weightData.length - 1];
            const first = weightData[0];
            const change = latest.weight - first.weight;
            const avg = weightData.reduce((s, d) => s + d.weight, 0) / weightData.length;
            return (
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Chip
                  label={`Current: ${latest.weight} ${weightUnit}`}
                  size="small"
                  sx={{ color: '#E040FB', borderColor: '#E040FB' }}
                  variant="outlined"
                />
                <Chip
                  label={`${change >= 0 ? '+' : ''}${change.toFixed(1)} ${weightUnit}`}
                  size="small"
                  sx={{
                    color: change < 0 ? '#39FF14' : change > 0 ? '#FF1744' : '#9E9E9E',
                    borderColor: change < 0 ? '#39FF14' : change > 0 ? '#FF1744' : '#9E9E9E',
                  }}
                  variant="outlined"
                />
                <Chip
                  label={`Avg: ${avg.toFixed(1)} ${weightUnit}`}
                  size="small"
                  sx={{ color: '#00E5FF', borderColor: '#00E5FF' }}
                  variant="outlined"
                />
              </Box>
            );
          })()}

          {/* Weight trend chart */}
          {weightData.length > 0 ? (
            <Card sx={{ mb: 2, p: 1 }}>
              <Typography variant="subtitle2" sx={{ ml: 1, mb: 1 }}>Weight Trend</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={weightData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={d => {
                      const dt = new Date(d + 'T00:00:00');
                      return dt.toLocaleDateString('en', { month: 'short', day: 'numeric' });
                    }}
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={40}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const dateLabel = typeof label === 'string'
                        ? new Date(label + 'T00:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })
                        : label;
                      return (
                        <Box sx={{
                          bgcolor: 'rgba(13,13,13,0.95)',
                          border: '1px solid rgba(224,64,251,0.3)',
                          borderRadius: 1,
                          p: 1.5,
                          minWidth: 120,
                        }}>
                          <Typography variant="caption" sx={{ color: '#E040FB', display: 'block', mb: 0.5 }}>
                            {dateLabel}
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {payload[0].value} {weightUnit}
                          </Typography>
                        </Box>
                      );
                    }}
                  />
                  {weightGoal && (
                    <ReferenceLine
                      y={weightGoal}
                      stroke="#39FF14"
                      strokeDasharray="4 4"
                      label={{
                        value: `Goal ${weightGoal}`,
                        position: 'insideTopRight',
                        fontSize: 11,
                        fill: '#39FF14',
                      }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#E040FB"
                    strokeWidth={2}
                    dot={{ fill: '#E040FB', r: 3 }}
                    name="Weight"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          ) : (
            <Typography color="text.secondary" textAlign="center" sx={{ mt: 4 }}>
              No weight entries yet. Log your weight from the Log page.
            </Typography>
          )}
        </>
      )}
    </Box>
  );
}
