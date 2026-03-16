import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import FoodLog from './pages/FoodLog';
import Foods from './pages/Foods';
import Reports from './pages/Reports';
import { FabProvider } from './context/FabContext';

export default function App() {
  return (
    <FabProvider>
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/log" element={<FoodLog />} />
        <Route path="/foods" element={<Foods />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
    </FabProvider>
  );
}
