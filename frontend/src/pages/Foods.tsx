import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X, Star, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { foodsApi, nutritionApi } from '../services/api';
import type { FoodCreate, FoodUpdate, ExternalFood, ServingSizeCreate } from '../types';

export default function Foods() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFood, setEditingFood] = useState<number | null>(null);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [externalResults, setExternalResults] = useState<ExternalFood[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showMicros, setShowMicros] = useState(false);
  const [showServingSizes, setShowServingSizes] = useState(false);
  const queryClient = useQueryClient();

  const { data: foods, isLoading } = useQuery({
    queryKey: ['foods', searchQuery, filterFavorites],
    queryFn: () => foodsApi.list({ 
      search: searchQuery || undefined,
      favorites_only: filterFavorites || undefined
    }),
  });

  const createMutation = useMutation({
    mutationFn: foodsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods'] });
      resetForm();
      setShowAddModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: FoodUpdate }) => 
      foodsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods'] });
      setEditingFood(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: foodsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods'] });
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, isFavorite }: { id: number; isFavorite: boolean }) =>
      foodsApi.update(id, { is_favorite: !isFavorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods'] });
    },
  });

  const [formData, setFormData] = useState<FoodCreate>({
    name: '',
    brand: '',
    barcode: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    potassium: 0,
    vitamin_a: 0,
    vitamin_c: 0,
    calcium: 0,
    iron: 0,
    vitamin_d: 0,
    vitamin_e: 0,
    vitamin_k: 0,
    vitamin_b1: 0,
    vitamin_b2: 0,
    vitamin_b3: 0,
    vitamin_b6: 0,
    vitamin_b12: 0,
    folate: 0,
    magnesium: 0,
    zinc: 0,
    phosphorus: 0,
    is_favorite: false,
    serving_sizes: [],
  });

  const resetForm = () => {
    setFormData({
      name: '',
      brand: '',
      barcode: '',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      potassium: 0,
      vitamin_a: 0,
      vitamin_c: 0,
      calcium: 0,
      iron: 0,
      vitamin_d: 0,
      vitamin_e: 0,
      vitamin_k: 0,
      vitamin_b1: 0,
      vitamin_b2: 0,
      vitamin_b3: 0,
      vitamin_b6: 0,
      vitamin_b12: 0,
      folate: 0,
      magnesium: 0,
      zinc: 0,
      phosphorus: 0,
      is_favorite: false,
      serving_sizes: [],
    });
    setShowMicros(false);
    setShowServingSizes(false);
  };

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
      fiber: external.fiber || 0,
      sugar: external.sugar || 0,
      sodium: external.sodium || 0,
      source: external.source,
      external_id: external.external_id,
      is_custom: false,
    };
    createMutation.mutate(food);
  };

  const handleSubmit = () => {
    if (editingFood) {
      updateMutation.mutate({ id: editingFood, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (food: any) => {
    setEditingFood(food.id);
    setFormData({
      name: food.name,
      brand: food.brand || '',
      barcode: food.barcode || '',
      serving_size: food.serving_size,
      serving_unit: food.serving_unit,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      fiber: food.fiber || 0,
      sugar: food.sugar || 0,
      sodium: food.sodium || 0,
      potassium: food.potassium || 0,
      vitamin_a: food.vitamin_a || 0,
      vitamin_c: food.vitamin_c || 0,
      calcium: food.calcium || 0,
      iron: food.iron || 0,
      vitamin_d: food.vitamin_d || 0,
      vitamin_e: food.vitamin_e || 0,
      vitamin_k: food.vitamin_k || 0,
      vitamin_b1: food.vitamin_b1 || 0,
      vitamin_b2: food.vitamin_b2 || 0,
      vitamin_b3: food.vitamin_b3 || 0,
      vitamin_b6: food.vitamin_b6 || 0,
      vitamin_b12: food.vitamin_b12 || 0,
      folate: food.folate || 0,
      magnesium: food.magnesium || 0,
      zinc: food.zinc || 0,
      phosphorus: food.phosphorus || 0,
      is_favorite: food.is_favorite || false,
      serving_sizes: [],
    });
    setShowAddModal(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this food?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Foods</h1>
        <button
          onClick={() => {
            resetForm();
            setEditingFood(null);
            setShowAddModal(true);
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Add Food
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search foods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        <button
          onClick={() => setFilterFavorites(!filterFavorites)}
          className={`btn ${filterFavorites ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
        >
          <Star size={18} fill={filterFavorites ? 'currentColor' : 'none'} />
          Favorites
        </button>
      </div>

      {/* Food List */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : foods?.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {filterFavorites ? 'No favorite foods yet' : 'No foods found. Add your first food!'}
        </div>
      ) : (
        <div className="space-y-2">
          {foods?.map((food) => (
            <div key={food.id} className="card group hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{food.name}</h3>
                    {food.is_favorite && (
                      <Star size={16} className="text-yellow-500" fill="currentColor" />
                    )}
                  </div>
                  {food.brand && (
                    <p className="text-sm text-gray-500">{food.brand}</p>
                  )}
                  {food.barcode && (
                    <p className="text-xs text-gray-400">Barcode: {food.barcode}</p>
                  )}
                  {food.serving_size && food.serving_unit && (
                    <p className="text-xs text-gray-400">
                      1 {food.serving_unit} = {food.serving_size}g
                    </p>
                  )}
                </div>

                <div className="flex items-start gap-4">
                  <div className="text-right">
                    <p className="font-semibold text-primary-600">
                      {food.calories} kcal
                    </p>
                    <p className="text-xs text-gray-500">per 100g</p>
                  </div>

                  {/* Action buttons - visible on hover */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => toggleFavoriteMutation.mutate({ 
                        id: food.id, 
                        isFavorite: food.is_favorite 
                      })}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title={food.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star 
                        size={18} 
                        className={food.is_favorite ? 'text-yellow-500' : 'text-gray-400'}
                        fill={food.is_favorite ? 'currentColor' : 'none'}
                      />
                    </button>
                    <button
                      onClick={() => handleEdit(food)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit food"
                    >
                      <Edit2 size={18} className="text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(food.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Delete food"
                    >
                      <Trash2 size={18} className="text-red-600" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Macros */}
              <div className="flex gap-4 mt-3 text-sm">
                <span className="text-gray-600">
                  <span className="font-medium">P:</span> {food.protein}g
                </span>
                <span className="text-gray-600">
                  <span className="font-medium">C:</span> {food.carbs}g
                </span>
                <span className="text-gray-600">
                  <span className="font-medium">F:</span> {food.fat}g
                </span>
                {food.fiber > 0 && (
                  <span className="text-gray-500">
                    <span className="font-medium">Fiber:</span> {food.fiber}g
                  </span>
                )}
                {food.sugar > 0 && (
                  <span className="text-gray-500">
                    <span className="font-medium">Sugar:</span> {food.sugar}g
                  </span>
                )}
              </div>

              {/* Additional info badges */}
              <div className="flex gap-2 mt-2">
                {!food.is_custom && food.source && (
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    {food.source}
                  </span>
                )}
                {food.is_custom && (
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                    Custom
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Food Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold">
                {editingFood ? 'Edit Food' : 'Add Food'}
              </h2>
              <button onClick={() => {
                setShowAddModal(false);
                setEditingFood(null);
                resetForm();
              }}>
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* External Search */}
              {!editingFood && (
                <div className="pb-6 border-b">
                  <label className="label">Search Food Database</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search Open Food Facts, USDA..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="input flex-1"
                      onKeyPress={(e) => e.key === 'Enter' && handleExternalSearch()}
                    />
                    <button
                      onClick={handleExternalSearch}
                      disabled={isSearching}
                      className="btn btn-secondary"
                    >
                      {isSearching ? 'Searching...' : 'Search'}
                    </button>
                  </div>

                  {/* External Results */}
                  {externalResults.length > 0 && (
                    <div className="mt-3 max-h-60 overflow-auto border rounded-lg">
                      {externalResults.map((food, i) => (
                        <button
                          key={i}
                          onClick={() => handleImportFood(food)}
                          className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-0"
                        >
                          <p className="font-medium">{food.name}</p>
                          <p className="text-sm text-gray-500">
                            {food.calories} kcal/100g | P: {food.protein}g C: {food.carbs}g F: {food.fat}g
                          </p>
                          {food.brand && (
                            <p className="text-xs text-gray-400">{food.brand}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Manual Entry Form */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-700">
                  {editingFood ? 'Update food details' : 'Or add manually (all values per 100g)'}
                </h3>

                {/* Basic Information */}
                <div className="space-y-3">
                  <div>
                    <label className="label">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input"
                      placeholder="Food name"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Brand</label>
                      <input
                        type="text"
                        value={formData.brand || ''}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        className="input"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="label">Barcode</label>
                      <input
                        type="text"
                        value={formData.barcode || ''}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                        className="input"
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="favorite"
                      checked={formData.is_favorite}
                      onChange={(e) => setFormData({ ...formData, is_favorite: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="favorite" className="text-sm font-medium cursor-pointer">
                      Add to favorites
                    </label>
                  </div>
                </div>

                {/* Macros - Core */}
                <div className="pt-4 border-t">
                  <h4 className="font-medium text-gray-700 mb-3">Macronutrients (per 100g)</h4>
                  
                  <div>
                    <label className="label">Calories (kcal) *</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.calories}
                      onChange={(e) =>
                        setFormData({ ...formData, calories: parseFloat(e.target.value) || 0 })
                      }
                      className="input"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div>
                      <label className="label">Protein (g) *</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.protein}
                        onChange={(e) =>
                          setFormData({ ...formData, protein: parseFloat(e.target.value) || 0 })
                        }
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Carbs (g) *</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.carbs}
                        onChange={(e) =>
                          setFormData({ ...formData, carbs: parseFloat(e.target.value) || 0 })
                        }
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Fat (g) *</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.fat}
                        onChange={(e) =>
                          setFormData({ ...formData, fat: parseFloat(e.target.value) || 0 })
                        }
                        className="input"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="label">Fiber (g)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.fiber}
                        onChange={(e) =>
                          setFormData({ ...formData, fiber: parseFloat(e.target.value) || 0 })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Sugar (g)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.sugar}
                        onChange={(e) =>
                          setFormData({ ...formData, sugar: parseFloat(e.target.value) || 0 })
                        }
                        className="input"
                      />
                    </div>
                  </div>
                </div>

                {/* Serving Sizes */}
                <div className="pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowServingSizes(!showServingSizes)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    {showServingSizes ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    Serving Sizes (Optional)
                  </button>
                  <p className="text-xs text-gray-500 mt-1">
                    Add serving size options (e.g., cup, tbsp, slice)
                  </p>

                    {showServingSizes && (
                      <div className="mt-3 space-y-3">
                        {formData.serving_sizes?.map((ss, index) => (
                          <div key={index} className="flex gap-2 items-end p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <label className="label">Name</label>
                              <input
                                type="text"
                                value={ss.name}
                                onChange={(e) => {
                                  const newSizes = [...(formData.serving_sizes || [])];
                                  newSizes[index] = { ...newSizes[index], name: e.target.value };
                                  setFormData({ ...formData, serving_sizes: newSizes });
                                }}
                                className="input"
                                placeholder="e.g., cup, slice"
                              />
                            </div>
                            <div className="w-24">
                              <label className="label">Grams</label>
                              <input
                                type="number"
                                step="0.1"
                                value={ss.grams}
                                onChange={(e) => {
                                  const newSizes = [...(formData.serving_sizes || [])];
                                  newSizes[index] = { ...newSizes[index], grams: parseFloat(e.target.value) || 0 };
                                  setFormData({ ...formData, serving_sizes: newSizes });
                                }}
                                className="input"
                                placeholder="240"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-1 text-xs">
                                <input
                                  type="radio"
                                  name="default_serving"
                                  checked={ss.is_default || false}
                                  onChange={() => {
                                    const newSizes = (formData.serving_sizes || []).map((s, i) => ({
                                      ...s,
                                      is_default: i === index,
                                    }));
                                    setFormData({ ...formData, serving_sizes: newSizes });
                                  }}
                                  className="w-3 h-3"
                                />
                                Default
                              </label>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const removedItem = formData.serving_sizes?.[index];
                                let newSizes = (formData.serving_sizes || []).filter((_, i) => i !== index);
                                // If we removed the default and there are still items, make the first one default
                                if (removedItem?.is_default && newSizes.length > 0 && !newSizes.some(s => s.is_default)) {
                                  newSizes = newSizes.map((s, i) => ({ ...s, is_default: i === 0 }));
                                }
                                setFormData({ ...formData, serving_sizes: newSizes });
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 rounded"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => {
                            const newSizes = [
                              ...(formData.serving_sizes || []),
                              { name: '', grams: 0, is_default: (formData.serving_sizes || []).length === 0 },
                            ];
                            setFormData({ ...formData, serving_sizes: newSizes });
                          }}
                          className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                        >
                          <Plus size={16} />
                          Add Serving Size
                        </button>
                      </div>
                    )}
                  </div>

                {/* Micronutrients */}
                <div className="pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowMicros(!showMicros)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    {showMicros ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    Micronutrients (Optional)
                  </button>

                  {showMicros && (
                    <div className="mt-3 space-y-3">
                      <p className="text-xs text-gray-500 mb-2">Minerals</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">Sodium (mg)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={formData.sodium}
                            onChange={(e) =>
                              setFormData({ ...formData, sodium: parseFloat(e.target.value) || 0 })
                            }
                            className="input"
                          />
                        </div>
                        <div>
                          <label className="label">Potassium (mg)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={formData.potassium}
                            onChange={(e) =>
                              setFormData({ ...formData, potassium: parseFloat(e.target.value) || 0 })
                            }
                            className="input"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">Calcium (mg)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={formData.calcium}
                            onChange={(e) =>
                              setFormData({ ...formData, calcium: parseFloat(e.target.value) || 0 })
                            }
                            className="input"
                          />
                        </div>
                        <div>
                          <label className="label">Iron (mg)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={formData.iron}
                            onChange={(e) =>
                              setFormData({ ...formData, iron: parseFloat(e.target.value) || 0 })
                            }
                            className="input"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">Magnesium (mg)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={formData.magnesium}
                            onChange={(e) =>
                              setFormData({ ...formData, magnesium: parseFloat(e.target.value) || 0 })
                            }
                            className="input"
                          />
                        </div>
                        <div>
                          <label className="label">Zinc (mg)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={formData.zinc}
                            onChange={(e) =>
                              setFormData({ ...formData, zinc: parseFloat(e.target.value) || 0 })
                            }
                            className="input"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="label">Phosphorus (mg)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.phosphorus}
                          onChange={(e) =>
                            setFormData({ ...formData, phosphorus: parseFloat(e.target.value) || 0 })
                          }
                          className="input"
                        />
                      </div>

                      <p className="text-xs text-gray-500 mt-4 mb-2">Vitamins</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">Vitamin A (mcg)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={formData.vitamin_a}
                            onChange={(e) =>
                              setFormData({ ...formData, vitamin_a: parseFloat(e.target.value) || 0 })
                            }
                            className="input"
                          />
                        </div>
                        <div>
                          <label className="label">Vitamin C (mg)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={formData.vitamin_c}
                            onChange={(e) =>
                              setFormData({ ...formData, vitamin_c: parseFloat(e.target.value) || 0 })
                            }
                            className="input"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">Vitamin D (mcg)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={formData.vitamin_d}
                            onChange={(e) =>
                              setFormData({ ...formData, vitamin_d: parseFloat(e.target.value) || 0 })
                            }
                            className="input"
                          />
                        </div>
                        <div>
                          <label className="label">Vitamin E (mg)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={formData.vitamin_e}
                            onChange={(e) =>
                              setFormData({ ...formData, vitamin_e: parseFloat(e.target.value) || 0 })
                            }
                            className="input"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="label">Vitamin K (mcg)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.vitamin_k}
                          onChange={(e) =>
                            setFormData({ ...formData, vitamin_k: parseFloat(e.target.value) || 0 })
                          }
                          className="input"
                        />
                      </div>

                      <p className="text-xs text-gray-500 mt-4 mb-2">B Vitamins</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">B1 Thiamin (mg)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.vitamin_b1}
                            onChange={(e) =>
                              setFormData({ ...formData, vitamin_b1: parseFloat(e.target.value) || 0 })
                            }
                            className="input"
                          />
                        </div>
                        <div>
                          <label className="label">B2 Riboflavin (mg)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.vitamin_b2}
                            onChange={(e) =>
                              setFormData({ ...formData, vitamin_b2: parseFloat(e.target.value) || 0 })
                            }
                            className="input"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">B3 Niacin (mg)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.vitamin_b3}
                            onChange={(e) =>
                              setFormData({ ...formData, vitamin_b3: parseFloat(e.target.value) || 0 })
                            }
                            className="input"
                          />
                        </div>
                        <div>
                          <label className="label">B6 (mg)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.vitamin_b6}
                            onChange={(e) =>
                              setFormData({ ...formData, vitamin_b6: parseFloat(e.target.value) || 0 })
                            }
                            className="input"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">B12 (mcg)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.vitamin_b12}
                            onChange={(e) =>
                              setFormData({ ...formData, vitamin_b12: parseFloat(e.target.value) || 0 })
                            }
                            className="input"
                          />
                        </div>
                        <div>
                          <label className="label">Folate (mcg)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={formData.folate}
                            onChange={(e) =>
                              setFormData({ ...formData, folate: parseFloat(e.target.value) || 0 })
                            }
                            className="input"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    onClick={handleSubmit}
                    disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
                    className="btn btn-primary w-full"
                  >
                    {editingFood
                      ? updateMutation.isPending ? 'Updating...' : 'Update Food'
                      : createMutation.isPending ? 'Adding...' : 'Add Food'}
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
