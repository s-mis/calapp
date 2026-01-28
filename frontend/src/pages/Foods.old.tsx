import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X } from 'lucide-react';
import { foodsApi, nutritionApi } from '../services/api';
import type { FoodCreate, ExternalFood } from '../types';

export default function Foods() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [externalResults, setExternalResults] = useState<ExternalFood[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const queryClient = useQueryClient();

  const { data: foods, isLoading } = useQuery({
    queryKey: ['foods', searchQuery],
    queryFn: () => foodsApi.list({ search: searchQuery || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: foodsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods'] });
      setShowAddModal(false);
      setNewFood({
        name: '',
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      });
    },
  });

  const handleExternalSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const results = await nutritionApi.search(searchQuery);
      setExternalResults(results);
    } catch {
      console.error('Failed to search external foods');
    } finally {
      setIsSearching(false);
    }
  };

  const handleImportFood = (external: ExternalFood) => {
    const food: FoodCreate = {
      name: external.name,
      brand: external.brand,
      barcode: external.barcode,
      calories: external.calories,
      protein: external.protein,
      carbs: external.carbs,
      fat: external.fat,
      fiber: external.fiber,
      sugar: external.sugar,
      sodium: external.sodium,
      source: external.source,
      external_id: external.external_id,
      is_custom: false,
    };
    createMutation.mutate(food);
  };

  const [newFood, setNewFood] = useState<FoodCreate>({
    name: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Foods</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Add
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={20}
        />
        <input
          type="text"
          placeholder="Search foods..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Food List */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : foods?.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No foods found. Add your first food!
        </div>
      ) : (
        <div className="space-y-2">
          {foods?.map((food) => (
            <div key={food.id} className="card">
              <div className="flex justify-between">
                <div>
                  <h3 className="font-medium">{food.name}</h3>
                  {food.brand && (
                    <p className="text-sm text-gray-500">{food.brand}</p>
                  )}
                  {food.serving_size && food.serving_unit && (
                    <p className="text-xs text-gray-400">
                      1 {food.serving_unit} = {food.serving_size}g
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary-600">
                    {food.calories} kcal
                  </p>
                  <p className="text-xs text-gray-500">per 100g</p>
                </div>
              </div>
              <div className="flex gap-4 mt-2 text-sm text-gray-600">
                <span>P: {food.protein}g</span>
                <span>C: {food.carbs}g</span>
                <span>F: {food.fat}g</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Food Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Food</h2>
              <button onClick={() => setShowAddModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Search External */}
              <div>
                <label className="label">Search Food Database</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search Open Food Facts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input flex-1"
                  />
                  <button
                    onClick={handleExternalSearch}
                    disabled={isSearching}
                    className="btn btn-secondary"
                  >
                    {isSearching ? '...' : 'Search'}
                  </button>
                </div>
              </div>

              {/* External Results */}
              {externalResults.length > 0 && (
                <div className="max-h-48 overflow-auto border rounded-lg">
                  {externalResults.map((food, i) => (
                    <button
                      key={i}
                      onClick={() => handleImportFood(food)}
                      className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-0"
                    >
                      <p className="font-medium">{food.name}</p>
                      <p className="text-sm text-gray-500">
                        {food.calories} kcal/100g - {food.brand || food.source}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-4">
                  Or add manually (all values per 100g):
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="label">Name *</label>
                    <input
                      type="text"
                      value={newFood.name}
                      onChange={(e) =>
                        setNewFood({ ...newFood, name: e.target.value })
                      }
                      className="input"
                      placeholder="Food name"
                    />
                  </div>

                  <div>
                    <label className="label">Calories (per 100g) *</label>
                    <input
                      type="number"
                      value={newFood.calories}
                      onChange={(e) =>
                        setNewFood({
                          ...newFood,
                          calories: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="input"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="label">Protein (g)</label>
                      <input
                        type="number"
                        value={newFood.protein}
                        onChange={(e) =>
                          setNewFood({
                            ...newFood,
                            protein: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Carbs (g)</label>
                      <input
                        type="number"
                        value={newFood.carbs}
                        onChange={(e) =>
                          setNewFood({
                            ...newFood,
                            carbs: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Fat (g)</label>
                      <input
                        type="number"
                        value={newFood.fat}
                        onChange={(e) =>
                          setNewFood({
                            ...newFood,
                            fat: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="input"
                      />
                    </div>
                  </div>

                  {/* Optional serving size */}
                  <div className="border-t pt-3 mt-3">
                    <p className="text-sm text-gray-500 mb-2">
                      Optional: Portion size (for easier logging)
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Serving (g)</label>
                        <input
                          type="number"
                          value={newFood.serving_size || ''}
                          onChange={(e) =>
                            setNewFood({
                              ...newFood,
                              serving_size: parseFloat(e.target.value) || undefined,
                            })
                          }
                          className="input"
                          placeholder="e.g., 60"
                        />
                      </div>
                      <div>
                        <label className="label">Unit name</label>
                        <input
                          type="text"
                          value={newFood.serving_unit || ''}
                          onChange={(e) =>
                            setNewFood({
                              ...newFood,
                              serving_unit: e.target.value || undefined,
                            })
                          }
                          className="input"
                          placeholder="e.g., bar, egg"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => createMutation.mutate(newFood)}
                    disabled={!newFood.name || createMutation.isPending}
                    className="btn btn-primary w-full"
                  >
                    {createMutation.isPending ? 'Adding...' : 'Add Food'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
