import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Fab from '@mui/material/Fab';
import Paper from '@mui/material/Paper';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ListAltIcon from '@mui/icons-material/ListAlt';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import BarChartIcon from '@mui/icons-material/BarChart';
import AddIcon from '@mui/icons-material/Add';
import { useFab } from '../context/FabContext';

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { label: 'Log', icon: <ListAltIcon />, path: '/log' },
  null, // center FAB placeholder
  { label: 'Foods', icon: <RestaurantIcon />, path: '/foods' },
  { label: 'Reports', icon: <BarChartIcon />, path: '/reports' },
];

export default function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { triggerFab } = useFab();

  const currentIndex = navItems.findIndex(item => item !== null && item.path === location.pathname);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            CalApp
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflow: 'auto', pb: 10 }}>
        {children}
      </Box>

      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100 }} elevation={8}>
        <Box sx={{ position: 'relative' }}>
          <BottomNavigation
            value={currentIndex === -1 ? 0 : currentIndex}
            onChange={(_, newValue) => {
              const item = navItems[newValue];
              if (item) navigate(item.path);
            }}
            showLabels
            sx={{ height: 64 }}
          >
            {navItems.map((item) =>
              item ? (
                <BottomNavigationAction key={item.path} label={item.label} icon={item.icon} />
              ) : (
                <BottomNavigationAction key="fab-slot" disabled sx={{ opacity: 0, pointerEvents: 'none', minWidth: 80 }} />
              )
            )}
          </BottomNavigation>

          {/* White seat ring behind the FAB */}
          <Box sx={{
            position: 'absolute',
            left: '50%',
            top: 0,
            transform: 'translate(-50%, -50%)',
            width: 76,
            height: 76,
            borderRadius: '50%',
            bgcolor: 'background.paper',
            zIndex: 1,
          }} />

          <Box sx={{ position: 'absolute', left: '50%', top: 0, transform: 'translate(-50%, -50%)', zIndex: 2 }}>
            <Fab
              color="primary"
              onClick={triggerFab}
              sx={{
                width: 64,
                height: 64,
                boxShadow: '0 4px 20px rgba(25, 118, 210, 0.55)',
                '& .MuiSvgIcon-root': { fontSize: 30 },
              }}
            >
              <AddIcon />
            </Fab>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
