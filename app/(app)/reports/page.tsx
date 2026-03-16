'use client';

import { useState, useEffect } from 'react';
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
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line,
} from 'recharts';
import { getDailyReport, getWeeklyReport, getMonthlyReport } from '@/services/api';
import { DailyTotals } from '@/types';

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

  useEffect(() => {
    setFabAction(() => router.push('/log?openDialog=true'));
    return () => setFabAction(null);
  }, []);

  useEffect(() => {
    if (view === 'daily') {
      getDailyReport(date).then(setDailyData);
    } else if (view === 'weekly') {
      getWeeklyReport(date).then(r => setChartData(r.days));
    } else {
      getMonthlyReport(month).then(r => setChartData(r.days));
    }
  }, [view, date, month]);

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
    <Box sx={{ p: 2 }}>
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, gap: 1 }}>
          <IconButton onClick={() => changeDate(view === 'weekly' ? -7 : -1)}>
            <ChevronLeftIcon />
          </IconButton>
          <TextField
            type="date"
            size="small"
            value={date}
            onChange={e => setDate(e.target.value)}
            sx={{ width: 160 }}
          />
          <IconButton onClick={() => changeDate(view === 'weekly' ? 7 : 1)}>
            <ChevronRightIcon />
          </IconButton>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, gap: 1 }}>
          <IconButton onClick={() => changeMonth(-1)}>
            <ChevronLeftIcon />
          </IconButton>
          <TextField
            type="month"
            size="small"
            value={month}
            onChange={e => setMonth(e.target.value)}
            sx={{ width: 160 }}
          />
          <IconButton onClick={() => changeMonth(1)}>
            <ChevronRightIcon />
          </IconButton>
        </Box>
      )}

      {view === 'daily' && dailyData && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h4" gutterBottom>{dailyData.calories.toFixed(0)} kcal</Typography>
            <Typography>Protein: {dailyData.protein.toFixed(1)}g</Typography>
            <Typography>Carbs: {dailyData.carbs.toFixed(1)}g</Typography>
            <Typography>Fat: {dailyData.fat.toFixed(1)}g</Typography>
            <Typography>Fiber: {dailyData.fiber.toFixed(1)}g</Typography>
            <Typography>Sugar: {dailyData.sugar.toFixed(1)}g</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {dailyData.entry_count} entries
            </Typography>
          </CardContent>
        </Card>
      )}

      {view === 'weekly' && chartData.length > 0 && (
        <>
          <Card sx={{ mb: 2, p: 1 }}>
            <Typography variant="subtitle2" sx={{ ml: 1, mb: 1 }}>Calories</Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDay} />
                <YAxis />
                <Tooltip labelFormatter={(v) => new Date(v + 'T00:00:00').toLocaleDateString()} />
                <Bar dataKey="calories" fill="#1976d2" name="Calories" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card sx={{ p: 1 }}>
            <Typography variant="subtitle2" sx={{ ml: 1, mb: 1 }}>Macros</Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDay} />
                <YAxis />
                <Tooltip labelFormatter={(v) => new Date(v + 'T00:00:00').toLocaleDateString()} formatter={(val: number) => `${val.toFixed(1)}g`} />
                <Legend />
                <Bar dataKey="protein" fill="#4caf50" name="Protein" />
                <Bar dataKey="carbs" fill="#ff9800" name="Carbs" />
                <Bar dataKey="fat" fill="#f44336" name="Fat" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {view === 'monthly' && chartData.length > 0 && (
        <>
          <Card sx={{ mb: 2, p: 1 }}>
            <Typography variant="subtitle2" sx={{ ml: 1, mb: 1 }}>Calories</Typography>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDay} />
                <YAxis />
                <Tooltip labelFormatter={(v) => new Date(v + 'T00:00:00').toLocaleDateString()} />
                <Line type="monotone" dataKey="calories" stroke="#1976d2" name="Calories" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
          <Card sx={{ p: 1 }}>
            <Typography variant="subtitle2" sx={{ ml: 1, mb: 1 }}>Macros</Typography>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDay} />
                <YAxis />
                <Tooltip labelFormatter={(v) => new Date(v + 'T00:00:00').toLocaleDateString()} formatter={(val: number) => `${val.toFixed(1)}g`} />
                <Legend />
                <Line type="monotone" dataKey="protein" stroke="#4caf50" name="Protein" dot={false} />
                <Line type="monotone" dataKey="carbs" stroke="#ff9800" name="Carbs" dot={false} />
                <Line type="monotone" dataKey="fat" stroke="#f44336" name="Fat" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </Box>
  );
}
