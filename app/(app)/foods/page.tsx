'use client';

import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useFab } from '@/context/FabContext';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import ListSubheader from '@mui/material/ListSubheader';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
import Snackbar from '@mui/material/Snackbar';
import CircularProgress from '@mui/material/CircularProgress';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import Collapse from '@mui/material/Collapse';
import { getFoods, getFood, createFood, updateFood, deleteFood } from '@/services/api';
import { Food, QUICK_ADD_BRAND } from '@/types';
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
      const nonQuickAdd = data.filter(f => f.brand !== QUICK_ADD_BRAND);
      const filtered = filter === 'all' ? nonQuickAdd
        : filter === 'high_protein' ? nonQuickAdd.filter(f => (f.protein ?? 0) >= 15)
        : nonQuickAdd.filter(f => (f.calories ?? Infinity) <= 100);
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

  const handleEdit = async (food: Food) => {
    // Fetch full food data (list view omits micronutrient columns)
    const full = await getFood(food.id);
    setEditingFood(full);
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
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Swipe-to-delete state (touch devices)
  const [swipedId, setSwipedId] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const swipeTouchRef = useRef<{ x: number; y: number; swiping: boolean; id: number } | null>(null);

  const handleRowTouchStart = (e: React.TouchEvent, foodId: number) => {
    // Close any other swiped row
    if (swipedId && swipedId !== foodId) { setSwipedId(null); setSwipeOffset(0); }
    swipeTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, swiping: false, id: foodId };
  };
  const handleRowTouchMove = (e: React.TouchEvent) => {
    if (!swipeTouchRef.current) return;
    const dx = e.touches[0].clientX - swipeTouchRef.current.x;
    const dy = e.touches[0].clientY - swipeTouchRef.current.y;
    if (!swipeTouchRef.current.swiping && Math.abs(dy) > Math.abs(dx)) { swipeTouchRef.current = null; return; }
    swipeTouchRef.current.swiping = true;
    setSwipedId(swipeTouchRef.current.id);
    setSwipeOffset(Math.max(Math.min(dx, 0), -100));
  };
  const handleRowTouchEnd = () => {
    if (!swipeTouchRef.current) return;
    if (swipeOffset < -50) {
      setSwipeOffset(-100);
    } else {
      setSwipedId(null);
      setSwipeOffset(0);
    }
    swipeTouchRef.current = null;
  };
  const handleSwipeDelete = async (id: number) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
    setSwipedId(null);
    setSwipeOffset(0);
    await deleteFood(id);
    setFoods([]);
    loadFoods(0, false);
  };

  const handleDelete = async (id: number) => {
    if (confirmDeleteId === id) {
      setConfirmDeleteId(null);
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
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
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')} edge="end">
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
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

      {foods.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Showing {foods.length} of {total} foods
        </Typography>
      )}

      <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
          {foods.map((food, i) => {
            const p = food.protein ?? 0;
            const c = food.carbs ?? 0;
            const f = food.fat ?? 0;
            const macroTotal = p + c + f;
            const hasMacros = food.protein != null && food.carbs != null && food.fat != null;
            const defaultSs = food.serving_sizes?.find(ss => ss.is_default) || food.serving_sizes?.[0];
            const showHeader = sort === 'name' && (i === 0 || food.name[0]?.toUpperCase() !== foods[i - 1].name[0]?.toUpperCase());
            const isSwiped = swipedId === food.id;
            const isExpanded = expandedId === food.id;
            return (
              <Fragment key={food.id}>
                {showHeader && (
                  <ListSubheader sx={{ bgcolor: 'rgba(0,229,255,0.05)', color: '#00E5FF', lineHeight: '32px' }}>
                    {food.name[0]?.toUpperCase()}
                  </ListSubheader>
                )}
                <Box sx={{ position: 'relative', overflow: 'hidden', borderBottom: i < foods.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                  {/* Swipe delete panel (touch devices) */}
                  <Box sx={{
                    position: 'absolute', right: 0, top: 0, bottom: 0, width: 100,
                    bgcolor: '#FF1744', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 0.25,
                    cursor: 'pointer', color: 'white',
                  }} onClick={() => handleSwipeDelete(food.id)}>
                    <DeleteIcon fontSize="small" />
                    <Typography variant="caption" fontWeight={600}>Delete</Typography>
                  </Box>
                  <ListItem
                    onTouchStart={(e) => handleRowTouchStart(e, food.id)}
                    onTouchMove={handleRowTouchMove}
                    onTouchEnd={handleRowTouchEnd}
                    onClick={() => { if (!swipeTouchRef.current?.swiping) setExpandedId(prev => prev === food.id ? null : food.id); }}
                    sx={{
                      alignItems: 'flex-start',
                      gap: 1.5,
                      cursor: 'pointer',
                      transform: `translateX(${isSwiped ? swipeOffset : 0}px)`,
                      transition: swipeTouchRef.current?.swiping ? 'none' : 'transform 0.25s ease',
                      bgcolor: 'background.paper',
                      position: 'relative',
                      zIndex: 1,
                      '@media (hover: hover)': {
                        '& .food-actions': { opacity: 0, transition: 'opacity 0.2s' },
                        '&:hover .food-actions': { opacity: 1 },
                      },
                    }}>
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
                    <Box className="food-actions" sx={{ display: 'flex', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <IconButton size="small" onClick={() => handleEdit(food)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(food.id)}
                        color="error"
                        sx={confirmDeleteId === food.id ? { bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' } } : {}}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </ListItem>
                  {/* Expandable nutrient detail */}
                  <Collapse in={isExpanded} sx={{ bgcolor: 'rgba(0,229,255,0.03)' }}>
                    <Box sx={{ px: 2, py: 1.5, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                      {[
                        { label: 'Calories', value: food.calories, unit: 'kcal', color: '#00E5FF' },
                        { label: 'Protein', value: food.protein, unit: 'g', color: '#39FF14' },
                        { label: 'Carbs', value: food.carbs, unit: 'g', color: '#FFD600' },
                        { label: 'Fat', value: food.fat, unit: 'g', color: '#FF6B35' },
                        { label: 'Fiber', value: food.fiber, unit: 'g', color: '#E040FB' },
                        { label: 'Sugar', value: food.sugar, unit: 'g', color: '#FFD600' },
                      ].map(n => (
                        <Box key={n.label}>
                          <Typography variant="caption" color="text.secondary">{n.label}</Typography>
                          <Typography variant="body2" sx={{ color: n.color, fontWeight: 600 }}>
                            {n.value != null ? `${n.value}${n.unit}` : '—'}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                    {food.serving_sizes && food.serving_sizes.length > 0 && (
                      <Box sx={{ px: 2, pb: 1.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Serving sizes</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {food.serving_sizes.map(ss => (
                            <Chip key={ss.id} label={`${ss.name} (${ss.grams}${food.unit})`} size="small" variant="outlined"
                              sx={{ color: ss.is_default ? '#00E5FF' : 'text.secondary', borderColor: ss.is_default ? '#00E5FF' : undefined }} />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Collapse>
                </Box>
              </Fragment>
            );
          })}
        </List>

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
