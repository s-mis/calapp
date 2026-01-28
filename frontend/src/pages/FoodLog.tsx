import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { logsApi, foodsApi } from '../services/api';
import type { MealType, FoodLogCreate } from '../types';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function FoodLog() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealType>('breakfast');
  const queryClient = useQueryClient();

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['logs', dateStr],
    queryFn: () => logsApi.list(dateStr),
  });

  const { data: foods } = useQuery({
    queryKey: ['foods'],
    queryFn: () => foodsApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: logsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs', dateStr] });
      queryClient.invalidateQueries({ queryKey: ['summary', dateStr] });
    },
  });

  const addMutation = useMutation({
    mutationFn: logsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs', dateStr] });
      queryClient.invalidateQueries({ queryKey: ['summary', dateStr] });
      setShowAddModal(false);
    },
  });

  const handleAddFood = (foodId: number) => {
    const log: FoodLogCreate = {
      log_date: dateStr,
      meal_type: selectedMeal,
      food_id: foodId,
      amount: 100,
      amount_unit: 'g',
    };
    addMutation.mutate(log);
  };

  const logsByMeal = MEAL_TYPES.reduce((acc, meal) => {
    acc[meal] = logs?.filter((log) => log.meal_type === meal) || [];
    return acc;
  }, {} as Record<MealType, typeof logs>);

  return (
    <div className="space-y-6">
      {/* Date Picker */}
      <div className="flex items-center justify-between">
        <button
          onClick={() =>
            setSelectedDate((d) => new Date(d.getTime() - 86400000))
          }
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="text-center">
          <h1 className="text-xl font-bold">
            {format(selectedDate, 'EEEE')}
          </h1>
          <p className="text-gray-500">{format(selectedDate, 'MMM d, yyyy')}</p>
        </div>
        <button
          onClick={() =>
            setSelectedDate((d) => new Date(d.getTime() + 86400000))
          }
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Meals */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : (
        MEAL_TYPES.map((meal) => (
          <div key={meal} className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold capitalize">{meal}</h2>
              <button
                onClick={() => {
                  setSelectedMeal(meal);
                  setShowAddModal(true);
                }}
                className="p-1 text-primary-500 hover:bg-primary-50 rounded"
              >
                <Plus size={20} />
              </button>
            </div>
            {logsByMeal[meal]?.length === 0 ? (
              <p className="text-gray-400 text-sm">No foods logged</p>
            ) : (
              <div className="space-y-2">
                {logsByMeal[meal]?.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="font-medium">
                        {log.food?.name || log.recipe?.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {log.amount}
                        {log.amount_unit} - {Math.round(log.calories || 0)} kcal
                      </p>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(log.id)}
                      className="p-2 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}

      {/* Add Food Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[70vh] overflow-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                Add to {selectedMeal}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500"
              >
                Cancel
              </button>
            </div>
            {foods?.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No foods in database. Add some foods first!
              </p>
            ) : (
              <div className="space-y-2">
                {foods?.map((food) => (
                  <button
                    key={food.id}
                    onClick={() => handleAddFood(food.id)}
                    className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border"
                  >
                    <p className="font-medium">{food.name}</p>
                    <p className="text-sm text-gray-500">
                      {food.calories} kcal / {food.serving_size}
                      {food.serving_unit}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
