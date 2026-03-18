'use client';

import { useState, useEffect, useRef } from 'react';
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
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
  LineChart, Line, PieChart, Pie, Cell, TooltipProps,
} from 'recharts';
import { getDailyReport, getWeeklyReport, getMonthlyReport, getSettings } from '@/services/api';
import { DailyTotals } from '@/types';

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
            {typeof p.value === 'number' ? (p.dataKey === 'calories' ? `${Math.round(p.value)} kcal` : `${p.value.toFixed(1)}g`) : p.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

type ViewMode = 'daily' | 'weekly' | 'monthly';

const today = () => new Date().toISOString().split('T')[0];
const currentMonth = () => new Date().toISOString().slice(0, 7);

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

  useEffect(() => {
    setFabAction(() => router.push('/log?openDialog=true'));
    return () => setFabAction(null);
  }, []);

  useEffect(() => {
    getSettings().then(s => {
      if (s.calorie_goal) setCalorieGoal(Number(s.calorie_goal) || null);
    });
  }, []);

  useEffect(() => {
    if (view === 'daily') {
      getDailyReport(date).then(setDailyData);
    } else if (view === 'weekly') {
      getWeeklyReport(date).then(r => setChartData(r.days));
      // Load previous week for comparison
      const prev = new Date(date + 'T00:00:00');
      prev.setDate(prev.getDate() - 7);
      const prevStr = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`;
      getWeeklyReport(prevStr).then(r => setPrevWeekData(r.days));
    } else {
      getMonthlyReport(month).then(r => setChartData(r.days));
    }
  }, [view, date, month]);

  // Swipe navigation
  const swipeRef = useRef<{ startX: number; startY: number } | null>(null);
  const isToday = date === today();
  const dateDisplay = (() => {
    const d = new Date(date + 'T00:00:00');
    if (view === 'daily') return d.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' });
    // Weekly: show week range
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

  return (
    <Box sx={{ p: 2 }} onTouchStart={handleSwipeStart} onTouchEnd={handleSwipeEnd}>
      <Typography variant="h5" gutterBottom>Reports</Typography>

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
        </ToggleButtonGroup>
      </Box>

      {view !== 'monthly' ? (
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
            {/* Calorie headline + goal bar */}
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

            {/* Macro donut + breakdown */}
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

            {/* Fiber & Sugar */}
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

        // Merge current + previous week data by weekday index for comparison
        const mergedData = chartData.map((day, i) => ({
          ...day,
          prevCalories: prevWeekData[i]?.calories ?? 0,
          prevProtein: prevWeekData[i]?.protein ?? 0,
          prevCarbs: prevWeekData[i]?.carbs ?? 0,
          prevFat: prevWeekData[i]?.fat ?? 0,
        }));

        return (
        <>
          {/* Weekly insights */}
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
            <ResponsiveContainer width="100%" height={200}>
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
                <Bar dataKey="calories" fill="#00E5FF" name="Calories" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card sx={{ p: 1 }}>
            <Typography variant="subtitle2" sx={{ ml: 1, mb: 1 }}>Macros</Typography>
            <ResponsiveContainer width="100%" height={200}>
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
          <Card sx={{ mb: 2, p: 1 }}>
            <Typography variant="subtitle2" sx={{ ml: 1, mb: 1 }}>Calories</Typography>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDay} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="calories" stroke="#00E5FF" name="Calories" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
          <Card sx={{ p: 1 }}>
            <Typography variant="subtitle2" sx={{ ml: 1, mb: 1 }}>Macros</Typography>
            <ResponsiveContainer width="100%" height={200}>
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
        </>
      )}
    </Box>
  );
}
