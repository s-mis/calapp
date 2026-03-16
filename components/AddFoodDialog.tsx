'use client';

import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid2';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import Box from '@mui/material/Box';
import { Food, ServingSize } from '@/types';

interface ServingSizeRow {
  id?: number;
  name: string;
  grams: string;
  is_default: boolean;
}

export type FoodSaveData = Omit<Partial<Food>, 'serving_sizes'> & {
  serving_sizes?: Array<{ id?: number; name: string; grams: number; sort_order: number; is_default: number }>;
  barcode?: string | null;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (food: FoodSaveData) => void;
  food?: Food | null;
  initialName?: string;
  prefill?: FoodSaveData | null;
}

const emptyForm = {
  name: '',
  brand: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  fiber: '',
  sugar: '',
  saturated_fat: '',
  trans_fat: '',
  cholesterol: '',
  sodium: '',
  potassium: '',
  calcium: '',
  iron: '',
  vitamin_a: '',
  vitamin_c: '',
  vitamin_d: '',
  vitamin_e: '',
  vitamin_k: '',
  vitamin_b6: '',
  vitamin_b12: '',
  folate: '',
  magnesium: '',
  zinc: '',
  phosphorus: '',
};

type FormState = typeof emptyForm;

function toNum(val: string): number | null {
  if (val === '' || val === null || val === undefined) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

export default function AddFoodDialog({ open, onClose, onSave, food, initialName, prefill }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [unit, setUnit] = useState<'g' | 'ml'>('g');
  const [servingSizes, setServingSizes] = useState<ServingSizeRow[]>([]);

  useEffect(() => {
    if (food?.id) {
      setForm({
        name: food.name,
        brand: food.brand ?? '',
        calories: food.calories?.toString() ?? '',
        protein: food.protein?.toString() ?? '',
        carbs: food.carbs?.toString() ?? '',
        fat: food.fat?.toString() ?? '',
        fiber: food.fiber?.toString() ?? '',
        sugar: food.sugar?.toString() ?? '',
        saturated_fat: food.saturated_fat?.toString() ?? '',
        trans_fat: food.trans_fat?.toString() ?? '',
        cholesterol: food.cholesterol?.toString() ?? '',
        sodium: food.sodium?.toString() ?? '',
        potassium: food.potassium?.toString() ?? '',
        calcium: food.calcium?.toString() ?? '',
        iron: food.iron?.toString() ?? '',
        vitamin_a: food.vitamin_a?.toString() ?? '',
        vitamin_c: food.vitamin_c?.toString() ?? '',
        vitamin_d: food.vitamin_d?.toString() ?? '',
        vitamin_e: food.vitamin_e?.toString() ?? '',
        vitamin_k: food.vitamin_k?.toString() ?? '',
        vitamin_b6: food.vitamin_b6?.toString() ?? '',
        vitamin_b12: food.vitamin_b12?.toString() ?? '',
        folate: food.folate?.toString() ?? '',
        magnesium: food.magnesium?.toString() ?? '',
        zinc: food.zinc?.toString() ?? '',
        phosphorus: food.phosphorus?.toString() ?? '',
      });
      setUnit(food.unit || 'g');
      const sizes = (food.serving_sizes || []).map((ss: ServingSize) => ({
        id: ss.id,
        name: ss.name,
        grams: ss.grams.toString(),
        is_default: !!ss.is_default,
      }));
      setServingSizes(sizes);
    } else {
      setForm({
        ...emptyForm,
        name: prefill?.name ?? initialName ?? '',
        brand: (prefill?.brand as string | null | undefined) ?? '',
        calories: prefill?.calories?.toString() ?? '',
        protein: prefill?.protein?.toString() ?? '',
        carbs: prefill?.carbs?.toString() ?? '',
        fat: prefill?.fat?.toString() ?? '',
        fiber: prefill?.fiber?.toString() ?? '',
        sugar: prefill?.sugar?.toString() ?? '',
        saturated_fat: prefill?.saturated_fat?.toString() ?? '',
        trans_fat: prefill?.trans_fat?.toString() ?? '',
        cholesterol: prefill?.cholesterol?.toString() ?? '',
        sodium: prefill?.sodium?.toString() ?? '',
        potassium: prefill?.potassium?.toString() ?? '',
        calcium: prefill?.calcium?.toString() ?? '',
        iron: prefill?.iron?.toString() ?? '',
        vitamin_a: prefill?.vitamin_a?.toString() ?? '',
        vitamin_c: prefill?.vitamin_c?.toString() ?? '',
        vitamin_d: prefill?.vitamin_d?.toString() ?? '',
        vitamin_e: prefill?.vitamin_e?.toString() ?? '',
        vitamin_k: prefill?.vitamin_k?.toString() ?? '',
        vitamin_b6: prefill?.vitamin_b6?.toString() ?? '',
        vitamin_b12: prefill?.vitamin_b12?.toString() ?? '',
        folate: prefill?.folate?.toString() ?? '',
        magnesium: prefill?.magnesium?.toString() ?? '',
        zinc: prefill?.zinc?.toString() ?? '',
        phosphorus: prefill?.phosphorus?.toString() ?? '',
      });
      setUnit((prefill?.unit as 'g' | 'ml' | undefined) ?? 'g');
      setServingSizes(
        prefill?.serving_sizes?.length
          ? prefill.serving_sizes.map(ss => ({ id: ss.id, name: ss.name, grams: ss.grams.toString(), is_default: !!ss.is_default }))
          : [{ name: '100g', grams: '100', is_default: true }]
      );
    }
  }, [food, open, initialName, prefill]);

  const handleChange = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleUnitChange = (_: React.MouseEvent<HTMLElement>, newUnit: 'g' | 'ml' | null) => {
    if (!newUnit) return;
    setUnit(newUnit);
    setServingSizes(prev => prev.map(ss =>
      ss.is_default ? { ...ss, name: `100${newUnit}` } : ss
    ));
  };

  const handleServingSizeChange = (index: number, field: 'name' | 'grams', value: string) => {
    setServingSizes(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addServingSize = () => {
    setServingSizes(prev => [...prev, { name: '', grams: '', is_default: false }]);
  };

  const removeServingSize = (index: number) => {
    setServingSizes(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const sizes = servingSizes
      .filter(ss => ss.name.trim() && ss.grams)
      .map((ss, i) => ({
        id: ss.id,
        name: ss.name.trim(),
        grams: parseFloat(ss.grams) || 0,
        sort_order: i,
        is_default: ss.is_default ? 1 as const : 0 as const,
      }));

    onSave({
      name: form.name,
      brand: form.brand || null,
      unit,
      barcode: prefill?.barcode ?? (food as Food & { barcode?: string | null } | null)?.barcode ?? null,
      calories: toNum(form.calories),
      protein: toNum(form.protein),
      carbs: toNum(form.carbs),
      fat: toNum(form.fat),
      fiber: toNum(form.fiber),
      sugar: toNum(form.sugar),
      saturated_fat: toNum(form.saturated_fat),
      trans_fat: toNum(form.trans_fat),
      cholesterol: toNum(form.cholesterol),
      sodium: toNum(form.sodium),
      potassium: toNum(form.potassium),
      calcium: toNum(form.calcium),
      iron: toNum(form.iron),
      vitamin_a: toNum(form.vitamin_a),
      vitamin_c: toNum(form.vitamin_c),
      vitamin_d: toNum(form.vitamin_d),
      vitamin_e: toNum(form.vitamin_e),
      vitamin_k: toNum(form.vitamin_k),
      vitamin_b6: toNum(form.vitamin_b6),
      vitamin_b12: toNum(form.vitamin_b12),
      folate: toNum(form.folate),
      magnesium: toNum(form.magnesium),
      zinc: toNum(form.zinc),
      phosphorus: toNum(form.phosphorus),
      serving_sizes: sizes,
    });
  };

  const numField = (label: string, field: keyof FormState, fieldUnit?: string) => (
    <Grid size={{ xs: 6, sm: 4 }}>
      <TextField
        fullWidth
        size="small"
        label={fieldUnit ? `${label} (${fieldUnit})` : label}
        type="number"
        value={form[field]}
        onChange={handleChange(field)}
        slotProps={{ htmlInput: { step: 'any', min: 0 } }}
      />
    </Grid>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{food ? 'Edit Food' : 'Add Food'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              required
              label="Name"
              value={form.name}
              onChange={handleChange('name')}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth
              label="Brand"
              value={form.brand}
              onChange={handleChange('brand')}
            />
          </Grid>
          <Grid size={{ xs: 6 }} sx={{ display: 'flex', alignItems: 'center' }}>
            <ToggleButtonGroup
              value={unit}
              exclusive
              onChange={handleUnitChange}
              size="small"
            >
              <ToggleButton value="g">Grams (g)</ToggleButton>
              <ToggleButton value="ml">Milliliters (ml)</ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant="caption" color="text.secondary">
              All nutritional values are per 100{unit}
            </Typography>
          </Grid>

          {numField('Calories', 'calories', 'kcal')}
          {numField('Protein', 'protein', 'g')}
          {numField('Carbs', 'carbs', 'g')}
          {numField('Fat', 'fat', 'g')}
          {numField('Fiber', 'fiber', 'g')}
          {numField('Sugar', 'sugar', 'g')}
        </Grid>

        <Accordion sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Additional Macros</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {numField('Saturated Fat', 'saturated_fat', 'g')}
              {numField('Trans Fat', 'trans_fat', 'g')}
              {numField('Cholesterol', 'cholesterol', 'mg')}
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Micronutrients</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {numField('Sodium', 'sodium', 'mg')}
              {numField('Potassium', 'potassium', 'mg')}
              {numField('Calcium', 'calcium', 'mg')}
              {numField('Iron', 'iron', 'mg')}
              {numField('Vitamin A', 'vitamin_a', 'mcg')}
              {numField('Vitamin C', 'vitamin_c', 'mg')}
              {numField('Vitamin D', 'vitamin_d', 'mcg')}
              {numField('Vitamin E', 'vitamin_e', 'mg')}
              {numField('Vitamin K', 'vitamin_k', 'mcg')}
              {numField('Vitamin B6', 'vitamin_b6', 'mg')}
              {numField('Vitamin B12', 'vitamin_b12', 'mcg')}
              {numField('Folate', 'folate', 'mcg')}
              {numField('Magnesium', 'magnesium', 'mg')}
              {numField('Zinc', 'zinc', 'mg')}
              {numField('Phosphorus', 'phosphorus', 'mg')}
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Serving Sizes</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {servingSizes.map((ss, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                <TextField
                  size="small"
                  label="Name"
                  placeholder='e.g. "1 cookie"'
                  value={ss.name}
                  onChange={e => handleServingSizeChange(i, 'name', e.target.value)}
                  disabled={ss.is_default}
                  sx={{ flex: 2 }}
                />
                <TextField
                  size="small"
                  label={`Weight (${unit})`}
                  type="number"
                  value={ss.grams}
                  onChange={e => handleServingSizeChange(i, 'grams', e.target.value)}
                  disabled={ss.is_default}
                  slotProps={{ htmlInput: { step: 'any', min: 0 } }}
                  sx={{ flex: 1 }}
                />
                {!ss.is_default && (
                  <IconButton size="small" onClick={() => removeServingSize(i)} color="error">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
                {ss.is_default && <Box sx={{ width: 34 }} />}
              </Box>
            ))}
            <Button size="small" startIcon={<AddIcon />} onClick={addServingSize}>
              Add Serving Size
            </Button>
          </AccordionDetails>
        </Accordion>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!form.name.trim()}>
          {food ? 'Update' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
