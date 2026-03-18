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
import Autocomplete from '@mui/material/Autocomplete';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import { useFab } from '@/context/FabContext';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { useSearchParams } from 'next/navigation';
import { getLogs, getFoods, createLog, deleteLog, createFood, getRecentFoods } from '@/services/api';
import { FoodLogWithFood, Food, MealType, ServingSize } from '@/types';
import FoodLogEntry from '@/components/FoodLogEntry';
import AddFoodDialog, { FoodSaveData } from '@/components/AddFoodDialog';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import { fetchByBarcode } from '@/utils/openFoodFacts';
import TodayIcon from '@mui/icons-material/Today';

type FoodOrCreate = (Food & { _group?: string }) | { _create: true; inputValue: string };

function getLogCalories(entry: FoodLogWithFood): number {
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
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [autocompleteInput, setAutocompleteInput] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

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

  useEffect(() => { setLogs([]); loadLogs(); }, [date]);

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

  const actionBusy = useRef(false);
  const handleDelete = async (id: number) => {
    if (actionBusy.current) return;
    actionBusy.current = true;
    try { await deleteLog(id); loadLogs(); } finally { actionBusy.current = false; }
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
    return [
      ...foods,
      ...(hasSearch ? [{ _create: true as const, inputValue: autocompleteInput.trim() }] : []),
    ];
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
      </Box>

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
            <FoodLogEntry key={entry.id} entry={entry} onDelete={handleDelete} onLogAgain={handleLogAgain} />
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Log Food</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Autocomplete<FoodOrCreate>
              options={autocompleteOptions}
              loading={foodsLoading}
              getOptionLabel={(opt) =>
                '_create' in opt
                  ? `Add "${opt.inputValue}"`
                  : `${opt.name}${opt.brand ? ` (${opt.brand})` : ''}`
              }
              groupBy={(opt) => ('_create' in opt ? '' : (opt as Food & { _group?: string })._group || '')}
              renderGroup={(params) => params.group ? (
                <li key={params.key}>
                  <Typography variant="caption" sx={{ px: 2, py: 0.5, color: '#00E5FF', fontWeight: 600, display: 'block', bgcolor: 'rgba(0,229,255,0.06)' }}>
                    {params.group}
                  </Typography>
                  <ul style={{ padding: 0 }}>{params.children}</ul>
                </li>
              ) : <li key={params.key}><ul style={{ padding: 0 }}>{params.children}</ul></li>}
              filterOptions={(x) => x}
              inputValue={autocompleteInput}
              onInputChange={(_, value, reason) => {
                if (reason !== 'reset') setAutocompleteInput(value);
              }}
              value={selectedFood}
              onChange={(_, val) => {
                if (!val) { handleFoodSelect(null); return; }
                if ('_create' in val) {
                  setAddFoodInitialName(val.inputValue);
                  setAddFoodOpen(true);
                } else {
                  handleFoodSelect(val);
                }
              }}
              isOptionEqualToValue={(opt, val) =>
                !('_create' in opt) && !('_create' in val) && opt.id === val.id
              }
              renderOption={(props, opt) => (
                <li {...props} key={'_create' in opt ? '__create__' : `${('_group' in opt ? opt._group : '')}-${opt.id}`}>
                  {'_create' in opt
                    ? <Box component="span" sx={{ color: 'primary.main', fontStyle: 'italic' }}>+ Add &quot;{opt.inputValue}&quot;</Box>
                    : `${opt.name}${opt.brand ? ` (${opt.brand})` : ''}`
                  }
                </li>
              )}
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} variant="contained" disabled={!selectedFood || saving}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
