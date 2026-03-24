'use client';

import { useRef, useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import ReplayIcon from '@mui/icons-material/Replay';
import EditIcon from '@mui/icons-material/Edit';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import { FoodLogWithFood, ServingSize, QUICK_ADD_BRAND } from '@/types';

interface Props {
  entry: FoodLogWithFood;
  onDelete: (id: number) => void;
  onLogAgain?: (entry: FoodLogWithFood) => void;
  onUpdate?: (id: number, updates: { serving_size_id?: number | null; quantity?: number; custom_grams?: number | null }) => void;
}

const SWIPE_THRESHOLD = 80;
const LONG_PRESS_MS = 500;
const CUSTOM_OPTION = 'custom';

export default function FoodLogEntry({ entry, onDelete, onLogAgain, onUpdate }: Props) {
  const isQuickAdd = entry.food.brand === QUICK_ADD_BRAND;
  const hasOverrides = entry.cal_override != null;

  const gramsPerServing = entry.serving_size?.grams ?? entry.custom_grams ?? 0;
  const effectiveGrams = gramsPerServing * entry.quantity;
  const multiplier = effectiveGrams / 100;

  const cals = hasOverrides ? (entry.cal_override!).toFixed(0) : ((entry.food.calories ?? 0) * multiplier).toFixed(0);
  const protein = hasOverrides ? (entry.protein_override ?? 0).toFixed(1) : ((entry.food.protein ?? 0) * multiplier).toFixed(1);
  const carbs = hasOverrides ? (entry.carbs_override ?? 0).toFixed(1) : ((entry.food.carbs ?? 0) * multiplier).toFixed(1);
  const fat = hasOverrides ? (entry.fat_override ?? 0).toFixed(1) : ((entry.food.fat ?? 0) * multiplier).toFixed(1);

  const servingLabel = isQuickAdd
    ? 'Manual entry'
    : entry.serving_size
      ? (entry.quantity !== 1 ? `${entry.quantity} x ${entry.serving_size.name}` : entry.serving_size.name)
      : `${effectiveGrams}${entry.food.unit}`;

  // Swipe state (touch devices)
  const [offsetX, setOffsetX] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const touchRef = useRef<{ startX: number; startY: number; swiping: boolean } | null>(null);

  // Long-press state
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editQty, setEditQty] = useState('');
  const [editServingSizeId, setEditServingSizeId] = useState('');
  const [editCustomGrams, setEditCustomGrams] = useState('');

  const openEditDialog = () => {
    if (!onUpdate) return;
    setEditQty(String(entry.quantity));
    setEditServingSizeId(entry.serving_size_id ? String(entry.serving_size_id) : CUSTOM_OPTION);
    setEditCustomGrams(entry.custom_grams ? String(entry.custom_grams) : '');
    setEditOpen(true);
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
  };

  const handleEditSave = () => {
    if (!onUpdate) return;
    const isCustom = editServingSizeId === CUSTOM_OPTION;
    onUpdate(entry.id, {
      serving_size_id: isCustom ? null : Number(editServingSizeId),
      quantity: parseFloat(editQty) || 1,
      custom_grams: isCustom ? (parseFloat(editCustomGrams) || null) : null,
    });
    setEditOpen(false);
  };

  // Preview for edit dialog
  const editIsCustom = editServingSizeId === CUSTOM_OPTION;
  const editSs = entry.food.serving_sizes?.find((ss: ServingSize) => ss.id.toString() === editServingSizeId);
  const editEffGrams = editIsCustom ? (parseFloat(editCustomGrams) || 0) : (editSs?.grams ?? 0);
  const editMult = editEffGrams * (parseFloat(editQty) || 0) / 100;
  const editPreviewCals = ((entry.food.calories ?? 0) * editMult).toFixed(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, swiping: false };
    // Start long-press timer (not for quick-add entries)
    if (onUpdate && !isQuickAdd) {
      longPressTimer.current = setTimeout(() => {
        openEditDialog();
        touchRef.current = null;
      }, LONG_PRESS_MS);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Cancel long-press on any movement
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }

    if (!touchRef.current) return;
    const dx = e.touches[0].clientX - touchRef.current.startX;
    const dy = e.touches[0].clientY - touchRef.current.startY;

    if (!touchRef.current.swiping && Math.abs(dy) > Math.abs(dx)) {
      touchRef.current = null;
      return;
    }
    touchRef.current.swiping = true;
    e.stopPropagation();

    const clamped = Math.max(Math.min(dx, revealed ? 0 : 0), -140);
    setOffsetX(clamped);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }

    if (!touchRef.current) return;
    if (touchRef.current.swiping) {
      e.stopPropagation();
    }
    if (offsetX < -SWIPE_THRESHOLD) {
      setRevealed(true);
      setOffsetX(-140);
    } else {
      setRevealed(false);
      setOffsetX(0);
    }
    touchRef.current = null;
  };

  const closeReveal = () => {
    setRevealed(false);
    setOffsetX(0);
  };

  return (
    <>
      <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: 2, mb: 1 }}>
        {/* Action panel behind card (swipe reveal for touch) */}
        <Box sx={{
          position: 'absolute',
          top: 0, right: 0, bottom: 0,
          width: 140,
          display: 'flex',
          alignItems: 'stretch',
        }}>
          {onLogAgain && (
            <Box
              onClick={() => { closeReveal(); onLogAgain(entry); }}
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#00E5FF',
                color: '#0D0D0D',
                cursor: 'pointer',
                gap: 0.25,
              }}
            >
              <ReplayIcon fontSize="small" />
              <Typography variant="caption" fontWeight={600}>Again</Typography>
            </Box>
          )}
          <Box
            onClick={() => { closeReveal(); onDelete(entry.id); }}
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#FF1744',
              color: 'white',
              cursor: 'pointer',
              gap: 0.25,
            }}
          >
            <DeleteIcon fontSize="small" />
            <Typography variant="caption" fontWeight={600}>Delete</Typography>
          </Box>
        </Box>

        {/* Sliding card */}
        <Card
          sx={{
            position: 'relative',
            transform: `translateX(${offsetX}px)`,
            transition: touchRef.current?.swiping ? 'none' : 'transform 0.25s ease',
            zIndex: 1,
            '&:hover .entry-actions': { opacity: 1 },
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', alignItems: 'center' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap>
                {entry.food.name}
                {!isQuickAdd && entry.food.brand && (
                  <Typography component="span" variant="body2" color="text.secondary"> - {entry.food.brand}</Typography>
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {servingLabel}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                <Chip label={`${cals} kcal`} size="small" color="primary" />
                <Chip label={`P: ${protein}g`} size="small" variant="outlined" />
                <Chip label={`C: ${carbs}g`} size="small" variant="outlined" />
                <Chip label={`F: ${fat}g`} size="small" variant="outlined" />
              </Box>
            </Box>
            {/* Desktop action buttons - visible on hover */}
            <Box
              className="entry-actions"
              sx={{
                display: 'flex',
                gap: 0.5,
                ml: 1,
                opacity: 0,
                transition: 'opacity 0.15s',
                '@media (pointer: coarse)': { display: 'none' },
              }}
            >
              {onLogAgain && (
                <IconButton size="small" onClick={() => onLogAgain(entry)} title="Log again" sx={{ color: '#00E5FF' }}>
                  <ReplayIcon fontSize="small" />
                </IconButton>
              )}
              {onUpdate && !isQuickAdd && (
                <IconButton size="small" onClick={openEditDialog} title="Edit quantity" sx={{ color: '#FFD600' }}>
                  <EditIcon fontSize="small" />
                </IconButton>
              )}
              <IconButton size="small" onClick={() => onDelete(entry.id)} title="Delete" color="error">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Long-press edit dialog */}
      {onUpdate && (
        <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Edit Entry</DialogTitle>
          <DialogContent>
            <Typography variant="subtitle2" sx={{ mb: 2, color: '#00E5FF' }}>{entry.food.name}</Typography>
            {entry.food.serving_sizes && entry.food.serving_sizes.length > 0 && (
              <TextField
                select
                fullWidth
                label="Serving Size"
                value={editServingSizeId}
                onChange={e => setEditServingSizeId(e.target.value)}
                sx={{ mb: 2 }}
              >
                {entry.food.serving_sizes.map((ss: ServingSize) => (
                  <MenuItem key={ss.id} value={ss.id.toString()}>
                    {ss.name} ({ss.grams}{entry.food.unit})
                  </MenuItem>
                ))}
                <MenuItem value={CUSTOM_OPTION}>Custom</MenuItem>
              </TextField>
            )}
            {editIsCustom && (
              <TextField
                fullWidth
                label={`Grams (${entry.food.unit})`}
                type="number"
                value={editCustomGrams}
                onChange={e => setEditCustomGrams(e.target.value)}
                sx={{ mb: 2 }}
                slotProps={{ htmlInput: { step: 'any', min: '0' } }}
              />
            )}
            <TextField
              fullWidth
              label="Quantity"
              type="number"
              value={editQty}
              onChange={e => setEditQty(e.target.value)}
              slotProps={{ htmlInput: { step: '0.25', min: '0.25' } }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {editPreviewCals} kcal
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleEditSave}>Save</Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}
