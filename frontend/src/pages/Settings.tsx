import { useState } from 'react';
import { Target, Download, Info } from 'lucide-react';

export default function SettingsPage() {
  const [goals, setGoals] = useState({
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 65,
  });

  const handleExport = () => {
    // TODO: Implement data export
    alert('Export feature coming soon!');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Daily Goals */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Target className="text-primary-600" size={20} />
          </div>
          <h2 className="font-semibold">Daily Goals</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Calories (kcal)</label>
            <input
              type="number"
              value={goals.calories}
              onChange={(e) =>
                setGoals({ ...goals, calories: parseInt(e.target.value) || 0 })
              }
              className="input"
            />
          </div>
          <div>
            <label className="label">Protein (g)</label>
            <input
              type="number"
              value={goals.protein}
              onChange={(e) =>
                setGoals({ ...goals, protein: parseInt(e.target.value) || 0 })
              }
              className="input"
            />
          </div>
          <div>
            <label className="label">Carbs (g)</label>
            <input
              type="number"
              value={goals.carbs}
              onChange={(e) =>
                setGoals({ ...goals, carbs: parseInt(e.target.value) || 0 })
              }
              className="input"
            />
          </div>
          <div>
            <label className="label">Fat (g)</label>
            <input
              type="number"
              value={goals.fat}
              onChange={(e) =>
                setGoals({ ...goals, fat: parseInt(e.target.value) || 0 })
              }
              className="input"
            />
          </div>
          <button className="btn btn-primary w-full">Save Goals</button>
        </div>
      </div>

      {/* Data Export */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Download className="text-blue-600" size={20} />
          </div>
          <h2 className="font-semibold">Export Data</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Export your food logs and recipes as JSON or CSV.
        </p>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn btn-secondary flex-1">
            Export JSON
          </button>
          <button onClick={handleExport} className="btn btn-secondary flex-1">
            Export CSV
          </button>
        </div>
      </div>

      {/* About */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Info className="text-gray-600" size={20} />
          </div>
          <h2 className="font-semibold">About</h2>
        </div>
        <p className="text-sm text-gray-600">
          Calorie AI v1.0.0
          <br />
          Track your calories, macros, and recipes with precision.
        </p>
      </div>
    </div>
  );
}
