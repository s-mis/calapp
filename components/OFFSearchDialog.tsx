'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import type { FoodSaveData } from '@/components/AddFoodDialog';
import { searchByText, type OFFSearchResult } from '@/utils/openFoodFacts';
import Avatar from '@mui/material/Avatar';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (food: FoodSaveData) => void;
  onManualAdd: (query: string) => void;
  initialQuery: string;
}

export default function OFFSearchDialog({ open, onClose, onSelect, onManualAdd, initialQuery }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OFFSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await searchByText(q.trim());
      setResults(data);
      setSearched(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      const isServerError = msg.includes('OFF_5') || msg.includes('AbortError') || msg.includes('abort');
      setError(isServerError
        ? 'The OpenFoodFacts server is temporarily overloaded. This is normal — their API has limited capacity.'
        : 'Search failed. Please check your connection and try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-search on open with initialQuery
  useEffect(() => {
    if (open) {
      setQuery(initialQuery);
      setResults([]);
      setError(null);
      setSearched(false);
      if (initialQuery.trim()) doSearch(initialQuery);
    }
  }, [open, initialQuery, doSearch]);

  // Debounced search on query change
  useEffect(() => {
    if (!open || query === initialQuery) return; // skip initial (already handled)
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (query.trim()) doSearch(query);
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, open, doSearch, initialQuery]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Search OpenFoodFacts</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label="Search foods"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); doSearch(query); } }}
          sx={{ mt: 1, mb: 1 }}
        />

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        )}

        {error && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography color="error" variant="body2" sx={{ mb: 0.5 }}>{error}</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 1.5 }}>
              <Button size="small" variant="outlined" onClick={() => doSearch(query)}>Retry</Button>
              <Button size="small" onClick={() => onManualAdd(query)}>Add manually</Button>
            </Box>
          </Box>
        )}

        {!loading && !error && searched && results.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>No results found</Typography>
            <Button variant="outlined" onClick={() => onManualAdd(query)}>Add manually</Button>
          </Box>
        )}

        {!loading && results.length > 0 && (
          <List disablePadding>
            {results.map((food, i) => (
              <ListItemButton
                key={i}
                onClick={() => onSelect(food)}
                sx={{ borderRadius: 1, mb: 0.5, px: 1.5, py: 1, alignItems: 'flex-start' }}
              >
                <Avatar
                  variant="rounded"
                  src={food.image_url || undefined}
                  sx={{ width: 40, height: 40, mr: 1.5, mt: 0.25, bgcolor: 'action.hover', fontSize: '0.75rem' }}
                >
                  {!food.image_url ? '?' : null}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mr: 1 }}
                    >
                      {food.name}
                    </Typography>
                    <Typography variant="body2" sx={{ flexShrink: 0, color: '#00E5FF' }}>
                      {food.calories != null ? `${Math.round(food.calories)} kcal` : '—'}
                    </Typography>
                  </Box>
                  {food.brand && (
                    <Typography variant="caption" color="text.secondary">{food.brand}</Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                    <Chip label={`P ${food.protein != null ? Math.round(food.protein) : '?'}g`} size="small"
                      sx={{ bgcolor: 'rgba(57,255,20,0.15)', color: '#39FF14', height: 20, fontSize: '0.7rem' }} />
                    <Chip label={`C ${food.carbs != null ? Math.round(food.carbs) : '?'}g`} size="small"
                      sx={{ bgcolor: 'rgba(255,214,0,0.15)', color: '#FFD600', height: 20, fontSize: '0.7rem' }} />
                    <Chip label={`F ${food.fat != null ? Math.round(food.fat) : '?'}g`} size="small"
                      sx={{ bgcolor: 'rgba(255,107,53,0.15)', color: '#FF6B35', height: 20, fontSize: '0.7rem' }} />
                  </Box>
                </Box>
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={() => onManualAdd(query)}>Add manually</Button>
      </DialogActions>
    </Dialog>
  );
}
