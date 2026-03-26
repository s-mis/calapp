'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MenuItem from '@mui/material/MenuItem';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useFab } from '@/context/FabContext';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { useSearchParams } from 'next/navigation';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import MonitorWeightIcon from '@mui/icons-material/MonitorWeight';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Checkbox from '@mui/material/Checkbox';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { getLogs, getFoods, createLog, deleteLog, updateLog, createFood, getRecentFoods, getWeightLogs, createWeightLog, getSettings } from '@/services/api';
import { FoodLogWithFood, Food, MealType, ServingSize, QUICK_ADD_BRAND, WeightLog } from '@/types';
import FoodLogEntry from '@/components/FoodLogEntry';
import AddFoodDialog, { FoodSaveData } from '@/components/AddFoodDialog';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import { fetchByBarcode } from '@/utils/openFoodFacts';
import OFFSearchDialog from '@/components/OFFSearchDialog';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import TodayIcon from '@mui/icons-material/Today';

type FoodOrCreate = (Food & { _group?: string }) | { _create: true; inputValue: string; name: string } | { _offSearch: true; inputValue: string; name: string };

const foodFilter = createFilterOptions<FoodOrCreate>();

function getLogCalories(entry: FoodLogWithFood): number {
  if (entry.cal_override != null) return entry.cal_override;
  const gramsPerServing = entry.serving_size?.grams ?? entry.custom_grams ?? 0;
  const effectiveGrams = gramsPerServing * entry.quantity;
  return (entry.food.calories ?? 0) * effectiveGrams / 100;
}

const PAGE_SIZE = 50;

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const mealTypes: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

const CUSTOM_OPTION = 'custom';

export default function FoodLogPage() {
  const { setFabAction } = useFab();
  const searchParams = useSearchParams();
  const [date, setDate] = useState(today());
  const [logs, setLogs] = useState<FoodLogWithFood[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [foods, setFoods] = useState<Food[]>([]);
  const [recentFoods, setRecentFoods] = useState<Food[]>([]);
  const [foodsLoading, setFoodsLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [mealType, setMealType] = useState<MealType>(() => {
    const h = new Date().getHours();
    if (h < 10) return 'breakfast';
    if (h < 14) return 'lunch';
    if (h < 20) return 'dinner';
    return 'snack';
  });
  const [quantity, setQuantity] = useState('1');
  const [selectedServingSizeId, setSelectedServingSizeId] = useState<string>('');
  const [customGrams, setCustomGrams] = useState('');
  const [addFoodOpen, setAddFoodOpen] = useState(false);
  const [addFoodInitialName, setAddFoodInitialName] = useState('');
  const [addFoodPrefill, setAddFoodPrefill] = useState<FoodSaveData | null>(null);
  const [offSearchOpen, setOffSearchOpen] = useState(false);
  const [offSearchQuery, setOffSearchQuery] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [autocompleteInput, setAutocompleteInput] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Weight state
  const [todayWeight, setTodayWeight] = useState<WeightLog | null>(null);
  const [weightInput, setWeightInput] = useState('');
  const [weightNotes, setWeightNotes] = useState('');
  const [weightUnit, setWeightUnit] = useState<string>('kg');
  const [weightSaving, setWeightSaving] = useState(false);
  const [weightExpanded, setWeightExpanded] = useState(false);

  // Quick Add state
  const [dialogMode, setDialogMode] = useState<'select' | 'quick'>('select');
  const [quickCalories, setQuickCalories] = useState('');
  const [quickProtein, setQuickProtein] = useState('');
  const [quickCarbs, setQuickCarbs] = useState('');
  const [quickFat, setQuickFat] = useState('');

  // Copy from yesterday state
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [yesterdayLogs, setYesterdayLogs] = useState<FoodLogWithFood[]>([]);
  const [copyLoading, setCopyLoading] = useState(false);
  const [selectedCopyIds, setSelectedCopyIds] = useState<Set<number>>(new Set());
  const [copySaving, setCopySaving] = useState(false);

  // Swipe date navigation
  const swipeRef = useRef<{ startX: number; startY: number } | null>(null);
  const isToday = date === today();
  const dateDisplay = (() => {
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' });
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
      changeDate(dx < 0 ? 1 : -1);
    }
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const data = await getLogs(date);
      setLogs(data);
    } finally {
      setLogsLoading(false);
    }
  };

  // Load logs + weight in parallel on date change
  useEffect(() => {
    setLogs([]);
    setLogsLoading(true);
    Promise.all([
      getLogs(date),
      getWeightLogs({ date }),
    ]).then(([logsData, weightData]) => {
      setLogs(logsData);
      if (weightData.length > 0) {
        setTodayWeight(weightData[0]);
        setWeightInput(String(weightData[0].weight));
        setWeightNotes(weightData[0].notes || '');
      } else {
        setTodayWeight(null);
        setWeightInput('');
        setWeightNotes('');
      }
    }).catch(() => {}).finally(() => {
      setLogsLoading(false);
    });
  }, [date]);

  // Load weight unit preference once
  useEffect(() => {
    getSettings().then(s => {
      if (s.weight_unit) setWeightUnit(s.weight_unit);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setFabAction(openDialog);
    return () => setFabAction(null);
  }, []);

  useEffect(() => {
    if (searchParams.get('openDialog') === 'true') {
      window.history.replaceState({}, document.title, '/log');
      openDialog();
    }
  }, []);

  const loadFoodsForAutocomplete = useCallback(async (search?: string) => {
    setFoodsLoading(true);
    try {
      const { data } = await getFoods(search || undefined, undefined, PAGE_SIZE, 0);
      setFoods(data);
    } finally {
      setFoodsLoading(false);
    }
  }, []);

  const openDialog = async () => {
    setSelectedFood(null);
    setQuantity('1');
    setSelectedServingSizeId('');
    setCustomGrams('');
    setAutocompleteInput('');
    setDialogMode('select');
    setQuickCalories('');
    setQuickProtein('');
    setQuickCarbs('');
    setQuickFat('');
    setDialogOpen(true);
    loadFoodsForAutocomplete();
    getRecentFoods().then(setRecentFoods).catch(() => {});
  };

  // Debounced search as user types in autocomplete
  useEffect(() => {
    if (!dialogOpen) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadFoodsForAutocomplete(autocompleteInput || undefined);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [autocompleteInput, dialogOpen, loadFoodsForAutocomplete]);

  const handleFoodSelect = (food: Food | null) => {
    setSelectedFood(food);
    if (food && food.serving_sizes?.length > 0) {
      const defaultSs = food.serving_sizes.find((ss: ServingSize) => ss.is_default) || food.serving_sizes[0];
      setSelectedServingSizeId(defaultSs.id.toString());
    } else {
      setSelectedServingSizeId(CUSTOM_OPTION);
    }
    setCustomGrams('');
    setQuantity('1');
  };

  const isCustom = selectedServingSizeId === CUSTOM_OPTION;
  const selectedServingSize: ServingSize | null = selectedFood?.serving_sizes?.find(
    (ss: ServingSize) => ss.id.toString() === selectedServingSizeId
  ) ?? null;

  const effectiveGrams = isCustom
    ? (parseFloat(customGrams) || 0)
    : (selectedServingSize?.grams ?? 0);
  const previewMultiplier = effectiveGrams * (parseFloat(quantity) || 0) / 100;
  const previewCalories = ((selectedFood?.calories ?? 0) * previewMultiplier).toFixed(0);
  const previewProtein = ((selectedFood?.protein ?? 0) * previewMultiplier).toFixed(1);
  const previewCarbs = ((selectedFood?.carbs ?? 0) * previewMultiplier).toFixed(1);
  const previewFat = ((selectedFood?.fat ?? 0) * previewMultiplier).toFixed(1);

  const handleAdd = async () => {
    if (!selectedFood || saving) return;
    setSaving(true);
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
    try {
      await createLog({
        food_id: selectedFood.id,
        date,
        meal_type: mealType,
        serving_size_id: isCustom ? null : (selectedServingSize?.id ?? null),
        quantity: parseFloat(quantity) || 1,
        custom_grams: isCustom ? (parseFloat(customGrams) || null) : null,
      });
      setDialogOpen(false);
      loadLogs();
    } finally {
      setSaving(false);
    }
  };

  // Find or create a single sentinel food for quick-add entries
  const sentinelIdRef = useRef<number | null>(null);
  const getSentinelFoodId = async (): Promise<number> => {
    if (sentinelIdRef.current) return sentinelIdRef.current;
    const { data: existing } = await getFoods('Quick add', undefined, 1, 0);
    const sentinel = existing.find(f => f.brand === QUICK_ADD_BRAND);
    if (sentinel) {
      sentinelIdRef.current = sentinel.id;
      return sentinel.id;
    }
    const created = await createFood({
      name: 'Quick add',
      brand: QUICK_ADD_BRAND,
      unit: 'g',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      serving_sizes: [],
    });
    sentinelIdRef.current = created.id;
    return created.id;
  };

  const handleQuickAdd = async () => {
    if (!quickCalories || saving) return;
    setSaving(true);
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
    try {
      const foodId = await getSentinelFoodId();
      await createLog({
        food_id: foodId,
        date,
        meal_type: mealType,
        quantity: 1,
        cal_override: parseFloat(quickCalories) || 0,
        protein_override: parseFloat(quickProtein) || 0,
        carbs_override: parseFloat(quickCarbs) || 0,
        fat_override: parseFloat(quickFat) || 0,
      });
      setDialogOpen(false);
      loadLogs();
    } finally {
      setSaving(false);
    }
  };

  const actionBusy = useRef(false);
  const handleDelete = async (id: number) => {
    if (actionBusy.current) return;
    actionBusy.current = true;
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
    try { await deleteLog(id); loadLogs(); } finally { actionBusy.current = false; }
  };

  const handleUpdateLog = async (id: number, updates: { serving_size_id?: number | null; quantity?: number; custom_grams?: number | null }) => {
    if (actionBusy.current) return;
    actionBusy.current = true;
    try { await updateLog(id, updates); loadLogs(); } finally { actionBusy.current = false; }
  };

  const handleLogAgain = async (entry: FoodLogWithFood) => {
    if (actionBusy.current) return;
    actionBusy.current = true;
    try {
      await createLog({
        food_id: entry.food_id,
        date,
        meal_type: mealType,
        serving_size_id: entry.serving_size_id ?? null,
        quantity: entry.quantity,
        custom_grams: entry.custom_grams ?? null,
        cal_override: entry.cal_override ?? null,
        protein_override: entry.protein_override ?? null,
        carbs_override: entry.carbs_override ?? null,
        fat_override: entry.fat_override ?? null,
      });
      loadLogs();
    } finally { actionBusy.current = false; }
  };

  const handleNewFoodSave = async (foodData: FoodSaveData) => {
    const newFood = await createFood(foodData);
    setFoods(prev => [...prev, newFood]);
    handleFoodSelect(newFood);
    setAddFoodOpen(false);
    setAddFoodInitialName('');
    setAddFoodPrefill(null);
  };

  const handleOFFSelect = async (foodData: FoodSaveData) => {
    // Duplicate prevention: check if barcode already exists locally
    if (foodData.barcode) {
      const { data: localMatches } = await getFoods(undefined, foodData.barcode);
      if (localMatches.length > 0) {
        handleFoodSelect(localMatches[0]);
        setOffSearchOpen(false);
        return;
      }
    }
    const newFood = await createFood(foodData);
    setFoods(prev => [...prev, newFood]);
    handleFoodSelect(newFood);
    setOffSearchOpen(false);
  };

  const handleOFFManualAdd = (query: string) => {
    setOffSearchOpen(false);
    setAddFoodInitialName(query);
    setAddFoodPrefill(null);
    setAddFoodOpen(true);
  };

  const handleBarcodeDetected = async (barcode: string) => {
    setScanLoading(true);
    try {
      const { data: localMatches } = await getFoods(undefined, barcode);
      if (localMatches.length > 0) {
        handleFoodSelect(localMatches[0]);
        setScanLoading(false);
        return;
      }
      const ofoData = await fetchByBarcode(barcode);
      if (ofoData) {
        setAddFoodPrefill(ofoData);
        setAddFoodInitialName('');
        setAddFoodOpen(true);
      } else {
        setSnackbar('Product not found — add manually');
        setAddFoodInitialName('');
        setAddFoodPrefill(null);
        setAddFoodOpen(true);
      }
    } finally {
      setScanLoading(false);
    }
  };

  const changeDate = (days: number) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + days);
    setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  const getYesterdayDate = (fromDate: string) => {
    const d = new Date(fromDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const openCopyDialog = async () => {
    setCopyLoading(true);
    setCopyDialogOpen(true);
    try {
      const yDate = getYesterdayDate(date);
      const data = await getLogs(yDate);
      setYesterdayLogs(data);
      setSelectedCopyIds(new Set(data.map(l => l.id)));
    } finally {
      setCopyLoading(false);
    }
  };

  const handleCopyConfirm = async () => {
    if (copySaving) return;
    setCopySaving(true);
    try {
      const selected = yesterdayLogs.filter(l => selectedCopyIds.has(l.id));
      await Promise.all(selected.map(entry => createLog({
        food_id: entry.food_id,
        date,
        meal_type: entry.meal_type,
        serving_size_id: entry.serving_size_id ?? null,
        quantity: entry.quantity,
        custom_grams: entry.custom_grams ?? null,
        cal_override: entry.cal_override ?? null,
        protein_override: entry.protein_override ?? null,
        carbs_override: entry.carbs_override ?? null,
        fat_override: entry.fat_override ?? null,
      })));
      setCopyDialogOpen(false);
      loadLogs();
    } finally {
      setCopySaving(false);
    }
  };

  const grouped = mealTypes.map(mt => ({
    ...mt,
    entries: logs.filter(l => l.meal_type === mt.value),
  })).filter(g => g.entries.length > 0);

  // Build autocomplete options: recent foods (when no search) + all foods + optional "create" entry
  const autocompleteOptions: FoodOrCreate[] = (() => {
    const hasSearch = autocompleteInput.trim().length > 0;
    const recentIds = new Set(recentFoods.map(f => f.id));
    if (!hasSearch && recentFoods.length > 0) {
      return [
        ...recentFoods.map(f => ({ ...f, _group: 'Recent' })),
        ...foods.filter(f => !recentIds.has(f.id)).map(f => ({ ...f, _group: 'All Foods' })),
      ];
    }
    return [...foods];
  })();

  return (
    <Box sx={{ p: 2 }} onTouchStart={handleSwipeStart} onTouchEnd={handleSwipeEnd}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, gap: 0.5 }}>
        <IconButton onClick={() => changeDate(-1)}><ChevronLeftIcon /></IconButton>
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
        <IconButton onClick={() => changeDate(1)}><ChevronRightIcon /></IconButton>
        {!isToday && (
          <IconButton size="small" onClick={() => setDate(today())} title="Go to today" sx={{ color: '#00E5FF' }}>
            <TodayIcon fontSize="small" />
          </IconButton>
        )}
        <IconButton size="small" onClick={openCopyDialog} title="Copy from yesterday" sx={{ color: '#E040FB' }}>
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Weight Entry Card */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MonitorWeightIcon sx={{ color: '#E040FB', fontSize: 20 }} />
            <Typography variant="subtitle2" sx={{ flex: 1 }}>Weight</Typography>
            {todayWeight && !weightExpanded && (
              <Typography variant="body2" sx={{ color: '#E040FB', fontWeight: 600 }}>
                {todayWeight.weight} {weightUnit}
              </Typography>
            )}
            <IconButton size="small" onClick={() => setWeightExpanded(!weightExpanded)}>
              {weightExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Box>
          {weightExpanded && (
            <Box sx={{ mt: 1.5, display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <TextField
                label={`Weight (${weightUnit})`}
                type="number"
                size="small"
                value={weightInput}
                onChange={e => setWeightInput(e.target.value)}
                slotProps={{ htmlInput: { step: '0.1', min: '0' } }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Notes"
                size="small"
                value={weightNotes}
                onChange={e => setWeightNotes(e.target.value)}
                sx={{ flex: 1 }}
              />
              <Button
                variant="contained"
                size="small"
                disabled={!weightInput || weightSaving}
                onClick={async () => {
                  setWeightSaving(true);
                  try {
                    const saved = await createWeightLog({
                      date,
                      weight: parseFloat(weightInput),
                      notes: weightNotes || null,
                    });
                    setTodayWeight(saved);
                    setWeightExpanded(false);
                  } finally {
                    setWeightSaving(false);
                  }
                }}
              >
                {todayWeight ? 'Update' : 'Save'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {logsLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {logsLoading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} variant="rounded" height={80} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      )}

      {!logsLoading && grouped.length === 0 && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
          No entries for this day. Tap + to add one.
        </Typography>
      )}

      {grouped.map(group => (
        <Box key={group.value} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {group.label}
            </Typography>
            <Typography variant="body2" sx={{ color: '#00E5FF' }}>
              {Math.round(group.entries.reduce((sum, e) => sum + getLogCalories(e), 0))} kcal
            </Typography>
          </Box>
          {group.entries.map(entry => (
            <FoodLogEntry key={entry.id} entry={entry} onDelete={handleDelete} onLogAgain={handleLogAgain} onUpdate={handleUpdateLog} />
          ))}
        </Box>
      ))}

      <AddFoodDialog
        open={addFoodOpen}
        onClose={() => { setAddFoodOpen(false); setAddFoodInitialName(''); setAddFoodPrefill(null); }}
        onSave={handleNewFoodSave}
        food={null}
        initialName={addFoodInitialName}
        prefill={addFoodPrefill}
      />

      <OFFSearchDialog
        open={offSearchOpen}
        onClose={() => setOffSearchOpen(false)}
        onSelect={handleOFFSelect}
        onManualAdd={handleOFFManualAdd}
        initialQuery={offSearchQuery}
      />

      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleBarcodeDetected}
      />

      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        message={snackbar}
      />

      {/* Copy from Yesterday Dialog */}
      <Dialog open={copyDialogOpen} onClose={() => setCopyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Copy from Yesterday</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {copyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : yesterdayLogs.length === 0 ? (
            <Typography color="text.secondary" sx={{ px: 3, py: 3, textAlign: 'center' }}>
              No entries logged yesterday.
            </Typography>
          ) : (
            <>
              <Box sx={{ px: 2, pt: 1, pb: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  {selectedCopyIds.size} of {yesterdayLogs.length} selected
                </Typography>
                <Button size="small" onClick={() => {
                  if (selectedCopyIds.size === yesterdayLogs.length) {
                    setSelectedCopyIds(new Set());
                  } else {
                    setSelectedCopyIds(new Set(yesterdayLogs.map(l => l.id)));
                  }
                }}>
                  {selectedCopyIds.size === yesterdayLogs.length ? 'Deselect all' : 'Select all'}
                </Button>
              </Box>
              <List dense disablePadding>
                {yesterdayLogs.map(entry => {
                  const cal = entry.cal_override != null
                    ? entry.cal_override
                    : (() => {
                        const g = (entry.serving_size?.grams ?? entry.custom_grams ?? 0) * entry.quantity;
                        return (entry.food.calories ?? 0) * g / 100;
                      })();
                  return (
                    <ListItem key={entry.id} disablePadding sx={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <ListItemButton
                        onClick={() => setSelectedCopyIds(prev => {
                          const next = new Set(prev);
                          if (next.has(entry.id)) next.delete(entry.id);
                          else next.add(entry.id);
                          return next;
                        })}
                        dense
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Checkbox
                            edge="start"
                            checked={selectedCopyIds.has(entry.id)}
                            size="small"
                            disableRipple
                            sx={{ p: 0 }}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={entry.food.name + (entry.food.brand ? ` (${entry.food.brand})` : '')}
                          secondary={`${entry.meal_type} · ${Math.round(cal)} kcal`}
                          primaryTypographyProps={{ variant: 'body2' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCopyDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCopyConfirm}
            disabled={selectedCopyIds.size === 0 || copySaving || copyLoading}
          >
            {copySaving ? 'Copying…' : `Copy ${selectedCopyIds.size} item${selectedCopyIds.size !== 1 ? 's' : ''}`}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Log Food</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <ToggleButtonGroup
              value={dialogMode}
              exclusive
              onChange={(_, v) => { if (v) setDialogMode(v); }}
              size="small"
              fullWidth
            >
              <ToggleButton value="select">Select Food</ToggleButton>
              <ToggleButton value="quick">Quick Add</ToggleButton>
            </ToggleButtonGroup>

            {dialogMode === 'select' ? (
              <>
                <Autocomplete<FoodOrCreate>
                  options={autocompleteOptions}
                  loading={foodsLoading}
                  selectOnFocus
                  clearOnBlur
                  handleHomeEndKeys
                  getOptionLabel={(opt) => {
                    if ('_create' in opt) return opt.inputValue;
                    if ('_offSearch' in opt) return opt.inputValue;
                    return `${opt.name}${opt.brand ? ` (${opt.brand})` : ''}`;
                  }}
                  groupBy={(opt) => ('_create' in opt || '_offSearch' in opt ? '' : (opt as Food & { _group?: string })._group || '')}
                  renderGroup={(params) => params.group ? (
                    <li key={params.key}>
                      <Typography variant="caption" sx={{ px: 2, py: 0.5, color: '#00E5FF', fontWeight: 600, display: 'block', bgcolor: 'rgba(0,229,255,0.06)' }}>
                        {params.group}
                      </Typography>
                      <ul style={{ padding: 0 }}>{params.children}</ul>
                    </li>
                  ) : <li key={params.key}><ul style={{ padding: 0 }}>{params.children}</ul></li>}
                  filterOptions={(options, params) => {
                    const filtered = foodFilter(options, params);
                    const { inputValue } = params;
                    if (inputValue.trim()) {
                      filtered.push(
                        { _offSearch: true as const, inputValue: inputValue.trim(), name: `Search OpenFoodFacts for "${inputValue.trim()}"` },
                        { _create: true as const, inputValue: inputValue.trim(), name: `Add "${inputValue.trim()}"` },
                      );
                    }
                    return filtered;
                  }}
                  inputValue={autocompleteInput}
                  onInputChange={(_, value, reason) => {
                    if (reason !== 'reset') setAutocompleteInput(value);
                  }}
                  value={selectedFood}
                  onChange={(_, val) => {
                    if (!val) { handleFoodSelect(null); return; }
                    if ('_offSearch' in val) {
                      setOffSearchQuery(val.inputValue);
                      setOffSearchOpen(true);
                    } else if ('_create' in val) {
                      setAddFoodInitialName(val.inputValue);
                      setAddFoodOpen(true);
                    } else {
                      handleFoodSelect(val);
                    }
                  }}
                  isOptionEqualToValue={(opt, val) =>
                    !('_create' in opt) && !('_create' in val) && !('_offSearch' in opt) && !('_offSearch' in val) && opt.id === val.id
                  }
                  renderOption={(props, opt) => {
                    const { key, ...rest } = props;
                    if ('_offSearch' in opt) return (
                      <li key="__off__" {...rest}>
                        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#00E5FF' }}>
                          <TravelExploreIcon fontSize="small" /> Search OpenFoodFacts for &quot;{opt.inputValue}&quot;
                        </Box>
                      </li>
                    );
                    if ('_create' in opt) return (
                      <li key="__create__" {...rest}>
                        <Box component="span" sx={{ color: 'primary.main', fontStyle: 'italic' }}>+ Add &quot;{opt.inputValue}&quot;</Box>
                      </li>
                    );
                    return (
                      <li key={`${('_group' in opt ? opt._group : '')}-${opt.id}`} {...rest}>
                        {`${opt.name}${opt.brand ? ` (${opt.brand})` : ''}`}
                      </li>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Food"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {foodsLoading && <CircularProgress size={18} />}
                            {params.InputProps.endAdornment}
                            <IconButton size="small" onClick={() => setScannerOpen(true)} title="Scan barcode">
                              {scanLoading ? <CircularProgress size={18} /> : <QrCodeScannerIcon fontSize="small" />}
                            </IconButton>
                          </>
                        ),
                      }}
                    />
                  )}
                />


                {selectedFood && (
                  <TextField
                    select
                    label="Serving Size"
                    value={selectedServingSizeId}
                    onChange={e => setSelectedServingSizeId(e.target.value)}
                  >
                    {(selectedFood.serving_sizes || []).map((ss: ServingSize) => (
                      <MenuItem key={ss.id} value={ss.id.toString()}>
                        {ss.name} ({ss.grams}{selectedFood.unit})
                      </MenuItem>
                    ))}
                    <MenuItem value={CUSTOM_OPTION}>Custom</MenuItem>
                  </TextField>
                )}

                {selectedFood && isCustom && (
                  <TextField
                    label={`Grams (${selectedFood.unit})`}
                    type="number"
                    value={customGrams}
                    onChange={e => setCustomGrams(e.target.value)}
                    slotProps={{ htmlInput: { step: 'any', min: '0' } }}
                  />
                )}

                <TextField
                  label="Quantity"
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  slotProps={{ htmlInput: { step: '0.25', min: '0.25' } }}
                />

                {selectedFood && (
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      {previewCalories} kcal
                      {!isCustom && selectedServingSize
                        ? ` (${parseFloat(quantity) || 0} x ${selectedServingSize.name})`
                        : customGrams
                          ? ` (${(parseFloat(customGrams) || 0) * (parseFloat(quantity) || 0)}${selectedFood.unit})`
                          : ''}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <Box component="span" sx={{ color: '#39FF14' }}>P: {previewProtein}g</Box>
                      {' \u00B7 '}
                      <Box component="span" sx={{ color: '#FFD600' }}>C: {previewCarbs}g</Box>
                      {' \u00B7 '}
                      <Box component="span" sx={{ color: '#FF6B35' }}>F: {previewFat}g</Box>
                    </Typography>
                  </Box>
                )}
              </>
            ) : (
              <>
                <TextField
                  label="Calories"
                  type="number"
                  value={quickCalories}
                  onChange={e => setQuickCalories(e.target.value)}
                  required
                  slotProps={{ htmlInput: { step: 'any', min: '0' } }}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    label="Protein (g)"
                    type="number"
                    value={quickProtein}
                    onChange={e => setQuickProtein(e.target.value)}
                    slotProps={{ htmlInput: { step: 'any', min: '0' } }}
                    fullWidth
                  />
                  <TextField
                    label="Carbs (g)"
                    type="number"
                    value={quickCarbs}
                    onChange={e => setQuickCarbs(e.target.value)}
                    slotProps={{ htmlInput: { step: 'any', min: '0' } }}
                    fullWidth
                  />
                  <TextField
                    label="Fat (g)"
                    type="number"
                    value={quickFat}
                    onChange={e => setQuickFat(e.target.value)}
                    slotProps={{ htmlInput: { step: 'any', min: '0' } }}
                    fullWidth
                  />
                </Box>
                {quickCalories && (
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      {parseFloat(quickCalories) || 0} kcal
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <Box component="span" sx={{ color: '#39FF14' }}>P: {parseFloat(quickProtein) || 0}g</Box>
                      {' \u00B7 '}
                      <Box component="span" sx={{ color: '#FFD600' }}>C: {parseFloat(quickCarbs) || 0}g</Box>
                      {' \u00B7 '}
                      <Box component="span" sx={{ color: '#FF6B35' }}>F: {parseFloat(quickFat) || 0}g</Box>
                    </Typography>
                  </Box>
                )}
              </>
            )}

            <TextField
              select
              label="Meal"
              value={mealType}
              onChange={e => setMealType(e.target.value as MealType)}
            >
              {mealTypes.map(mt => (
                <MenuItem key={mt.value} value={mt.value}>{mt.label}</MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          {dialogMode === 'select' ? (
            <Button onClick={handleAdd} variant="contained" disabled={!selectedFood || saving}>Add</Button>
          ) : (
            <Button onClick={handleQuickAdd} variant="contained" disabled={!quickCalories || saving}>Add</Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
