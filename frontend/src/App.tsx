import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Home, UtensilsCrossed, Apple, BookOpen, Settings } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import FoodLog from './pages/FoodLog';
import Foods from './pages/Foods';
import Recipes from './pages/Recipes';
import SettingsPage from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Main content */}
        <main className="max-w-lg mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/log" element={<FoodLog />} />
            <Route path="/foods" element={<Foods />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>

        {/* Bottom navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 safe-area-pb">
          <div className="max-w-lg mx-auto flex justify-around">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex flex-col items-center p-2 ${
                  isActive ? 'text-primary-500' : 'text-gray-500'
                }`
              }
            >
              <Home size={24} />
              <span className="text-xs mt-1">Home</span>
            </NavLink>
            <NavLink
              to="/log"
              className={({ isActive }) =>
                `flex flex-col items-center p-2 ${
                  isActive ? 'text-primary-500' : 'text-gray-500'
                }`
              }
            >
              <UtensilsCrossed size={24} />
              <span className="text-xs mt-1">Log</span>
            </NavLink>
            <NavLink
              to="/foods"
              className={({ isActive }) =>
                `flex flex-col items-center p-2 ${
                  isActive ? 'text-primary-500' : 'text-gray-500'
                }`
              }
            >
              <Apple size={24} />
              <span className="text-xs mt-1">Foods</span>
            </NavLink>
            <NavLink
              to="/recipes"
              className={({ isActive }) =>
                `flex flex-col items-center p-2 ${
                  isActive ? 'text-primary-500' : 'text-gray-500'
                }`
              }
            >
              <BookOpen size={24} />
              <span className="text-xs mt-1">Recipes</span>
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex flex-col items-center p-2 ${
                  isActive ? 'text-primary-500' : 'text-gray-500'
                }`
              }
            >
              <Settings size={24} />
              <span className="text-xs mt-1">Settings</span>
            </NavLink>
          </div>
        </nav>
      </div>
    </BrowserRouter>
  );
}

export default App;
