'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useFab } from '@/context/FabContext';
import DeleteIcon from '@mui/icons-material/Delete';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
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
  const [sort, setSort] = useState('name');
  const [filter, setFilter] = useState<'all' | 'high_protein' | 'low_cal'>('all');
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
      const { data, total: t } = await getFoods(search || undefined, undefined, PAGE_SIZE, offset, sort);
      const filtered = filter === 'all' ? data
        : filter === 'high_protein' ? data.filter(f => (f.protein ?? 0) >= 15)
        : data.filter(f => (f.calories ?? Infinity) <= 100);
      setFoods(prev => append ? [...prev, ...filtered] : filtered);
      setTotal(filter === 'all' ? t : filtered.length);
    } finally {
      setLoading(false);
    }
  };

  // Reset when search, sort, or filter changes
  useEffect(() => {
    setFoods([]);
    setTotal(0);
    loadFoods(0, false);
  }, [search, sort, filter]);

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

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    if (confirmDeleteId === id) {
      setConfirmDeleteId(null);
      await deleteFood(id);
      setFoods([]);
      loadFoods(0, false);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId((prev) => prev === id ? null : prev), 3000);
    }
  };

  const handleAdd = () => {
    setEditingFood(null);
    setDialogOpen(true);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>Foods</Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, bgcolor: '#0D0D0D', pb: 1, pt: 0.5 }}>
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

      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          select
          size="small"
          value={sort}
          onChange={e => setSort(e.target.value)}
          sx={{ minWidth: 140 }}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start"><SortIcon fontSize="small" /></InputAdornment>,
            },
          }}
        >
          <MenuItem value="name">Name A-Z</MenuItem>
          <MenuItem value="calories_asc">Calories Low</MenuItem>
          <MenuItem value="calories_desc">Calories High</MenuItem>
          <MenuItem value="protein_desc">Protein High</MenuItem>
          <MenuItem value="recent">Recently Added</MenuItem>
        </TextField>
        <Chip
          label="High Protein"
          size="small"
          onClick={() => setFilter(f => f === 'high_protein' ? 'all' : 'high_protein')}
          sx={{
            color: filter === 'high_protein' ? '#0D0D0D' : '#39FF14',
            bgcolor: filter === 'high_protein' ? '#39FF14' : 'transparent',
            borderColor: '#39FF14',
            cursor: 'pointer',
          }}
          variant={filter === 'high_protein' ? 'filled' : 'outlined'}
        />
        <Chip
          label="Low Calorie"
          size="small"
          onClick={() => setFilter(f => f === 'low_cal' ? 'all' : 'low_cal')}
          sx={{
            color: filter === 'low_cal' ? '#0D0D0D' : '#00E5FF',
            bgcolor: filter === 'low_cal' ? '#00E5FF' : 'transparent',
            borderColor: '#00E5FF',
            cursor: 'pointer',
          }}
          variant={filter === 'low_cal' ? 'filled' : 'outlined'}
        />
      </Box>

      {foods.length === 0 && !loading && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
          {search ? 'No foods found.' : 'No foods yet. Add your first food!'}
        </Typography>
      )}

      <Card>
        <List disablePadding>
          {foods.map((food, i) => {
            const p = food.protein ?? 0;
            const c = food.carbs ?? 0;
            const f = food.fat ?? 0;
            const macroTotal = p + c + f;
            const hasMacros = food.protein != null && food.carbs != null && food.fat != null;
            const defaultSs = food.serving_sizes?.find(ss => ss.is_default) || food.serving_sizes?.[0];
            return (
              <ListItem key={food.id} divider={i < foods.length - 1} sx={{ alignItems: 'flex-start', gap: 1.5 }}>
                <Box sx={{ flex: 1, minWidth: 0, py: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="subtitle2" noWrap sx={{ color: '#00E5FF' }}>
                      {food.name}
                    </Typography>
                    {!hasMacros && (
                      <WarningAmberIcon sx={{ fontSize: 14, color: '#FFD600' }} titleAccess="Missing macro data" />
                    )}
                  </Box>
                  {food.brand && (
                    <Typography variant="caption" color="text.secondary" noWrap>{food.brand}</Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 0.75, mt: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant="caption" sx={{ color: '#39FF14' }}>P: {p}g</Typography>
                    <Typography variant="caption" sx={{ color: '#FFD600' }}>C: {c}g</Typography>
                    <Typography variant="caption" sx={{ color: '#FF6B35' }}>F: {f}g</Typography>
                    {defaultSs && defaultSs.name !== `100${food.unit}` && (
                      <Typography variant="caption" color="text.secondary">
                        {defaultSs.name} ({defaultSs.grams}{food.unit})
                      </Typography>
                    )}
                  </Box>
                  {/* Mini macro-ratio bar */}
                  {macroTotal > 0 && (
                    <Box sx={{ display: 'flex', height: 3, borderRadius: 1.5, overflow: 'hidden', mt: 0.5, maxWidth: 120 }}>
                      <Box sx={{ width: `${(p / macroTotal) * 100}%`, bgcolor: '#39FF14' }} />
                      <Box sx={{ width: `${(c / macroTotal) * 100}%`, bgcolor: '#FFD600' }} />
                      <Box sx={{ width: `${(f / macroTotal) * 100}%`, bgcolor: '#FF6B35' }} />
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 48, pt: 0.5 }}>
                  <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1, color: '#00E5FF' }}>
                    {food.calories ?? '—'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">kcal</Typography>
                </Box>
                <ListItemSecondaryAction>
                  <IconButton size="small" onClick={() => handleEdit(food)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(food.id)}
                    color="error"
                    sx={confirmDeleteId === food.id ? { bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' } } : {}}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
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
