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
import { FoodLogWithFood } from '@/types';

interface Props {
  entry: FoodLogWithFood;
  onDelete: (id: number) => void;
  onLogAgain?: (entry: FoodLogWithFood) => void;
}

const SWIPE_THRESHOLD = 80;

export default function FoodLogEntry({ entry, onDelete, onLogAgain }: Props) {
  const gramsPerServing = entry.serving_size?.grams ?? entry.custom_grams ?? 0;
  const effectiveGrams = gramsPerServing * entry.quantity;
  const multiplier = effectiveGrams / 100;

  const cals = ((entry.food.calories ?? 0) * multiplier).toFixed(0);
  const protein = ((entry.food.protein ?? 0) * multiplier).toFixed(1);
  const carbs = ((entry.food.carbs ?? 0) * multiplier).toFixed(1);
  const fat = ((entry.food.fat ?? 0) * multiplier).toFixed(1);

  const servingLabel = entry.serving_size
    ? (entry.quantity !== 1 ? `${entry.quantity} x ${entry.serving_size.name}` : entry.serving_size.name)
    : `${effectiveGrams}${entry.food.unit}`;

  // Swipe state (touch devices)
  const [offsetX, setOffsetX] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const touchRef = useRef<{ startX: number; startY: number; swiping: boolean } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, swiping: false };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const dx = e.touches[0].clientX - touchRef.current.startX;
    const dy = e.touches[0].clientY - touchRef.current.startY;

    if (!touchRef.current.swiping && Math.abs(dy) > Math.abs(dx)) {
      touchRef.current = null;
      return;
    }
    touchRef.current.swiping = true;

    const clamped = Math.max(Math.min(dx, revealed ? 0 : 0), -140);
    setOffsetX(clamped);
  };

  const handleTouchEnd = () => {
    if (!touchRef.current) return;
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
              {entry.food.brand && (
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
            <IconButton size="small" onClick={() => onDelete(entry.id)} title="Delete" color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
