import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Flame, Beef, Wheat, Droplet } from 'lucide-react';
import { logsApi } from '../services/api';

const DAILY_GOALS = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 65,
};

function MacroProgress({
  label,
  value,
  goal,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
  icon: React.ElementType;
}) {
  const percentage = Math.min((value / goal) * 100, 100);

  return (
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="flex-1">
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium">{label}</span>
          <span className="text-gray-500">
            {Math.round(value)} / {goal}g
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${color} transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: summary, isLoading } = useQuery({
    queryKey: ['summary', today],
    queryFn: () => logsApi.getSummary(today),
  });

  const caloriePercentage = summary
    ? Math.min((summary.total_calories / DAILY_GOALS.calories) * 100, 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Today</h1>
        <p className="text-gray-500">{format(new Date(), 'EEEE, MMMM d')}</p>
      </div>

      {/* Calorie Ring */}
      <div className="card flex flex-col items-center py-8">
        <div className="relative w-40 h-40">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="12"
            />
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="#10b981"
              strokeWidth="12"
              strokeDasharray={`${caloriePercentage * 4.4} 440`}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Flame className="text-primary-500 mb-1" size={24} />
            <span className="text-3xl font-bold">
              {isLoading ? '...' : Math.round(summary?.total_calories || 0)}
            </span>
            <span className="text-gray-500 text-sm">
              / {DAILY_GOALS.calories} kcal
            </span>
          </div>
        </div>
      </div>

      {/* Macros */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-900">Macros</h2>
        <MacroProgress
          label="Protein"
          value={summary?.total_protein || 0}
          goal={DAILY_GOALS.protein}
          color="bg-red-500"
          icon={Beef}
        />
        <MacroProgress
          label="Carbs"
          value={summary?.total_carbs || 0}
          goal={DAILY_GOALS.carbs}
          color="bg-amber-500"
          icon={Wheat}
        />
        <MacroProgress
          label="Fat"
          value={summary?.total_fat || 0}
          goal={DAILY_GOALS.fat}
          color="bg-blue-500"
          icon={Droplet}
        />
      </div>

      {/* Meal Breakdown */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Meals</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Breakfast', value: summary?.breakfast_calories || 0 },
            { label: 'Lunch', value: summary?.lunch_calories || 0 },
            { label: 'Dinner', value: summary?.dinner_calories || 0 },
            { label: 'Snacks', value: summary?.snack_calories || 0 },
          ].map((meal) => (
            <div
              key={meal.label}
              className="bg-gray-50 rounded-lg p-3 text-center"
            >
              <p className="text-sm text-gray-500">{meal.label}</p>
              <p className="text-lg font-semibold">{Math.round(meal.value)}</p>
              <p className="text-xs text-gray-400">kcal</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
