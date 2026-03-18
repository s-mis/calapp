'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import { useFab } from '@/context/FabContext';
import DeleteIcon from '@mui/icons-material/Delete';
import Card from '@mui/material/Card';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import Snackbar from '@mui/material/Snackbar';
import CircularProgress from '@mui/material/CircularProgress';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { getFoods, createFood, updateFood, deleteFood } from '@/services/api';
import { Food } from '@/types';
import AddFoodDialog, { FoodSaveData } from '@/components/AddFoodDialog';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import { fetchByBarcode } from '@/utils/openFoodFacts';

const PAGE_SIZE = 50;

export default function FoodsPage() {
  const { setFabAction } = useFab();
  const [foods, setFoods] = useState<Food[]>([]);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [prefill, setPrefill] = useState<FoodSaveData | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadFoods = async (offset: number, append: boolean) => {
    setLoading(true);
    try {
      const { data, total: t } = await getFoods(search || undefined, undefined, PAGE_SIZE, offset);
      setFoods(prev => append ? [...prev, ...data] : data);
      setTotal(t);
    } finally {
      setLoading(false);
    }
  };

  // Reset when search changes
  useEffect(() => {
    setFoods([]);
    setTotal(0);
    loadFoods(0, false);
  }, [search]);

  // Infinite scroll via IntersectionObserver
  const hasMore = foods.length < total;
  const observerCallback = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        loadFoods(foods.length, true);
      }
    },
    [hasMore, loading, foods.length, search],
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(observerCallback, { rootMargin: '200px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [observerCallback]);

  useEffect(() => {
    setFabAction(handleAdd);
    return () => setFabAction(null);
  }, []);

  const handleSave = async (food: FoodSaveData) => {
    if (editingFood) {
      await updateFood(editingFood.id, food);
    } else {
      await createFood(food);
    }
    setDialogOpen(false);
    setEditingFood(null);
    setPrefill(null);
    setFoods([]);
    loadFoods(0, false);
  };

  const handleEdit = (food: Food) => {
    setEditingFood(food);
    setPrefill(null);
    setDialogOpen(true);
  };

  const handleBarcodeDetected = async (barcode: string) => {
    const { data: localMatches } = await getFoods(undefined, barcode);
    if (localMatches.length > 0) {
      setSnackbar('Already in your library');
      return;
    }
    const ofoData = await fetchByBarcode(barcode);
    if (ofoData) {
      setPrefill(ofoData);
    } else {
      setPrefill(null);
      setSnackbar('Product not found — add manually');
    }
    setEditingFood(null);
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    await deleteFood(id);
    setFoods([]);
    loadFoods(0, false);
  };

  const handleAdd = () => {
    setEditingFood(null);
    setDialogOpen(true);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>Foods</Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search foods..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start"><SearchIcon /></InputAdornment>
              ),
            },
          }}
        />
        <IconButton onClick={() => setScannerOpen(true)} title="Scan barcode" size="small">
          <QrCodeScannerIcon />
        </IconButton>
      </Box>

      {foods.length === 0 && !loading && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
          {search ? 'No foods found.' : 'No foods yet. Add your first food!'}
        </Typography>
      )}

      <Card>
        <List disablePadding>
          {foods.map((food, i) => (
            <ListItem key={food.id} divider={i < foods.length - 1}>
              <ListItemText
                primary={food.name}
                secondary={
                  [
                    food.brand,
                    `per 100${food.unit}`,
                    food.calories != null ? `${food.calories} kcal` : null,
                    food.serving_sizes?.length > 1
                      ? `${food.serving_sizes.length - 1} serving size${food.serving_sizes.length - 1 > 1 ? 's' : ''}`
                      : null,
                  ].filter(Boolean).join(' | ')
                }
              />
              <ListItemSecondaryAction>
                <IconButton size="small" onClick={() => handleEdit(food)}><EditIcon fontSize="small" /></IconButton>
                <IconButton size="small" onClick={() => handleDelete(food.id)} color="error"><DeleteIcon fontSize="small" /></IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Card>

      {/* Scroll sentinel + loading spinner */}
      <div ref={sentinelRef} />
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={28} />
        </Box>
      )}

      <AddFoodDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingFood(null); setPrefill(null); }}
        onSave={handleSave}
        food={editingFood}
        prefill={prefill}
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
    </Box>
  );
}
