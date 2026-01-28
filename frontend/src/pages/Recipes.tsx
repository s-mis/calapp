import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Trash2 } from 'lucide-react';
import { recipesApi, foodsApi } from '../services/api';
import type { RecipeCreate, RecipeIngredientCreate, Food } from '../types';

export default function Recipes() {
  const [showAddModal, setShowAddModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: recipes, isLoading } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => recipesApi.list(),
  });

  const { data: foods } = useQuery({
    queryKey: ['foods'],
    queryFn: () => foodsApi.list(),
  });

  const [newRecipe, setNewRecipe] = useState<RecipeCreate>({
    name: '',
    servings: 1,
    ingredients: [],
  });

  const [selectedFood, setSelectedFood] = useState<number | null>(null);
  const [ingredientAmount, setIngredientAmount] = useState(100);

  const createMutation = useMutation({
    mutationFn: recipesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      setShowAddModal(false);
      setNewRecipe({ name: '', servings: 1, ingredients: [] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: recipesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });

  const addIngredient = () => {
    if (!selectedFood) return;
    const ingredient: RecipeIngredientCreate = {
      food_id: selectedFood,
      amount: ingredientAmount,
      order_index: newRecipe.ingredients.length,
    };
    setNewRecipe({
      ...newRecipe,
      ingredients: [...newRecipe.ingredients, ingredient],
    });
    setSelectedFood(null);
    setIngredientAmount(100);
  };

  const removeIngredient = (index: number) => {
    setNewRecipe({
      ...newRecipe,
      ingredients: newRecipe.ingredients.filter((_, i) => i !== index),
    });
  };

  const getFoodById = (id: number): Food | undefined => {
    return foods?.find((f) => f.id === id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Recipes</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          New
        </button>
      </div>

      {/* Recipe List */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : recipes?.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No recipes yet. Create your first recipe!
        </div>
      ) : (
        <div className="space-y-4">
          {recipes?.map((recipe) => (
            <div key={recipe.id} className="card">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{recipe.name}</h3>
                  <p className="text-sm text-gray-500">
                    {recipe.servings} serving{recipe.servings > 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(recipe.id)}
                  className="p-2 text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {recipe.per_serving_nutrition && (
                <div className="mt-3 p-3 bg-primary-50 rounded-lg">
                  <p className="text-sm font-medium text-primary-800">
                    Per serving:
                  </p>
                  <div className="flex gap-4 text-sm text-primary-700 mt-1">
                    <span>{recipe.per_serving_nutrition.calories} kcal</span>
                    <span>P: {recipe.per_serving_nutrition.protein}g</span>
                    <span>C: {recipe.per_serving_nutrition.carbs}g</span>
                    <span>F: {recipe.per_serving_nutrition.fat}g</span>
                  </div>
                </div>
              )}

              <div className="mt-3">
                <p className="text-sm text-gray-500 mb-2">Ingredients:</p>
                <ul className="text-sm space-y-1">
                  {recipe.ingredients.map((ing) => (
                    <li key={ing.id}>
                      {ing.food.name} - {ing.amount}g
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Recipe Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">New Recipe</h2>
              <button onClick={() => setShowAddModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="label">Recipe Name *</label>
                <input
                  type="text"
                  value={newRecipe.name}
                  onChange={(e) =>
                    setNewRecipe({ ...newRecipe, name: e.target.value })
                  }
                  className="input"
                  placeholder="e.g., Chicken Stir Fry"
                />
              </div>

              <div>
                <label className="label">Servings</label>
                <input
                  type="number"
                  value={newRecipe.servings}
                  onChange={(e) =>
                    setNewRecipe({
                      ...newRecipe,
                      servings: parseInt(e.target.value) || 1,
                    })
                  }
                  className="input"
                  min={1}
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  value={newRecipe.description || ''}
                  onChange={(e) =>
                    setNewRecipe({ ...newRecipe, description: e.target.value })
                  }
                  className="input"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>

              {/* Ingredients */}
              <div>
                <label className="label">Ingredients</label>

                {newRecipe.ingredients.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {newRecipe.ingredients.map((ing, index) => {
                      const food = getFoodById(ing.food_id);
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <span>
                            {food?.name} - {ing.amount}g
                          </span>
                          <button
                            onClick={() => removeIngredient(index)}
                            className="text-red-500"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-2">
                  <select
                    value={selectedFood || ''}
                    onChange={(e) =>
                      setSelectedFood(parseInt(e.target.value) || null)
                    }
                    className="input flex-1"
                  >
                    <option value="">Select food...</option>
                    {foods?.map((food) => (
                      <option key={food.id} value={food.id}>
                        {food.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={ingredientAmount}
                    onChange={(e) =>
                      setIngredientAmount(parseFloat(e.target.value) || 0)
                    }
                    className="input w-20"
                    placeholder="g"
                  />
                  <button
                    onClick={addIngredient}
                    disabled={!selectedFood}
                    className="btn btn-secondary"
                  >
                    Add
                  </button>
                </div>

                {foods?.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Add foods first before creating recipes.
                  </p>
                )}
              </div>

              <button
                onClick={() => createMutation.mutate(newRecipe)}
                disabled={
                  !newRecipe.name ||
                  newRecipe.ingredients.length === 0 ||
                  createMutation.isPending
                }
                className="btn btn-primary w-full"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Recipe'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
