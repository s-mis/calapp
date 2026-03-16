import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import DeleteIcon from '@mui/icons-material/Delete';
import { FoodLogWithFood } from '../types';

interface Props {
  entry: FoodLogWithFood;
  onDelete: (id: number) => void;
}

export default function FoodLogEntry({ entry, onDelete }: Props) {
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

  return (
    <Card sx={{ mb: 1 }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', alignItems: 'center' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2">
            {entry.food.name}
            {entry.food.brand && (
              <Typography component="span" variant="body2" color="text.secondary"> - {entry.food.brand}</Typography>
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {servingLabel}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
            <Chip label={`${cals} kcal`} size="small" color="primary" />
            <Chip label={`P: ${protein}g`} size="small" variant="outlined" />
            <Chip label={`C: ${carbs}g`} size="small" variant="outlined" />
            <Chip label={`F: ${fat}g`} size="small" variant="outlined" />
          </Box>
        </Box>
        <IconButton size="small" onClick={() => onDelete(entry.id)} color="error">
          <DeleteIcon fontSize="small" />
        </IconButton>
      </CardContent>
    </Card>
  );
}
