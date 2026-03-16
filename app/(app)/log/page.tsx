'use client';

import { useState, useEffect } from 'react';
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
import { useFab } from '@/context/FabContext';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { useSearchParams } from 'next/navigation';
import { getLogs, getFoods, createLog, deleteLog, createFood } from '@/services/api';
import { FoodLogWithFood, Food, MealType, ServingSize } from '@/types';
import FoodLogEntry from '@/components/FoodLogEntry';
import AddFoodDialog, { FoodSaveData } from '@/components/AddFoodDialog';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import { fetchByBarcode } from '@/utils/openFoodFacts';

type FoodOrCreate = Food | { _create: true; inputValue: string };
const foodFilter = createFilterOptions<FoodOrCreate>();

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [foods, setFoods] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [quantity, setQuantity] = useState('1');
  const [selectedServingSizeId, setSelectedServingSizeId] = useState<string>('');
  const [customGrams, setCustomGrams] = useState('');
  const [addFoodOpen, setAddFoodOpen] = useState(false);
  const [addFoodInitialName, setAddFoodInitialName] = useState('');
  const [addFoodPrefill, setAddFoodPrefill] = useState<FoodSaveData | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const loadLogs = async () => {
    const data = await getLogs(date);
    setLogs(data);
  };

  useEffect(() => { loadLogs(); }, [date]);

  useEffect(() => {
    setFabAction(openDialog);
    return () => setFabAction(null);
  }, []);

  useEffect(() => {
    if (searchParams.get('openDialog') === 'true') {
      // Remove the query param from the URL without navigation
      window.history.replaceState({}, document.title, '/log');
      openDialog();
    }
  }, []);

  const openDialog = async () => {
    const allFoods = await getFoods();
    setFoods(allFoods);
    setSelectedFood(null);
    setQuantity('1');
    setSelectedServingSizeId('');
    setCustomGrams('');
    setDialogOpen(true);
  };

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
    if (!selectedFood) return;
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
  };

  const handleDelete = async (id: number) => {
    await deleteLog(id);
    loadLogs();
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
      const localMatches = await getFoods(undefined, barcode);
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

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, gap: 1 }}>
        <IconButton onClick={() => changeDate(-1)}><ChevronLeftIcon /></IconButton>
        <TextField
          type="date"
          size="small"
          value={date}
          onChange={e => setDate(e.target.value)}
          sx={{ width: 160 }}
        />
        <IconButton onClick={() => changeDate(1)}><ChevronRightIcon /></IconButton>
      </Box>

      {grouped.length === 0 && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
          No entries for this day. Tap + to add one.
        </Typography>
      )}

      {grouped.map(group => (
        <Box key={group.value} sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 0.5, fontWeight: 600 }}>
            {group.label}
          </Typography>
          {group.entries.map(entry => (
            <FoodLogEntry key={entry.id} entry={entry} onDelete={handleDelete} />
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
              options={foods}
              getOptionLabel={(opt) =>
                '_create' in opt
                  ? `Add "${opt.inputValue}"`
                  : `${opt.name}${opt.brand ? ` (${opt.brand})` : ''}`
              }
              filterOptions={(options, params) => {
                const filtered = foodFilter(options, params);
                if (params.inputValue.trim()) {
                  filtered.push({ _create: true, inputValue: params.inputValue.trim() });
                }
                return filtered;
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
                <li {...props} key={'_create' in opt ? '__create__' : opt.id}>
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
                  <Box component="span" sx={{ color: '#4caf50' }}>P: {previewProtein}g</Box>
                  {' \u00B7 '}
                  <Box component="span" sx={{ color: '#ff9800' }}>C: {previewCarbs}g</Box>
                  {' \u00B7 '}
                  <Box component="span" sx={{ color: '#f44336' }}>F: {previewFat}g</Box>
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} variant="contained" disabled={!selectedFood}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
