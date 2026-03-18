'use client';

import { useState } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#00E5FF' },
    secondary: { main: '#39FF14' },
    error: { main: '#FF1744' },
    warning: { main: '#FFD600' },
    background: { default: '#0D0D0D', paper: '#1A1A1A' },
    text: { primary: '#E0E0E0', secondary: '#9E9E9E' },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: '1px solid #2A2A2A' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundColor: '#0D0D0D', borderBottom: '1px solid #2A2A2A' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: { backgroundColor: '#0D0D0D', borderTop: '1px solid #2A2A2A' },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: { color: '#666', '&.Mui-selected': { color: '#00E5FF' } },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A' },
      },
    },
  },
});

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const [{ cache, flush }] = useState(() => {
    const cache = createCache({ key: 'mui' });
    cache.compat = true;
    const prevInsert = cache.insert;
    let inserted: string[] = [];
    cache.insert = (...args) => {
      const serialized = args[1];
      if (cache.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name);
      }
      return prevInsert(...args);
    };
    const flush = () => {
      const prevInserted = inserted;
      inserted = [];
      return prevInserted;
    };
    return { cache, flush };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) return null;
    let styles = '';
    for (const name of names) {
      styles += cache.inserted[name];
    }
    return (
      <style
        key={cache.key}
        data-emotion={`${cache.key} ${names.join(' ')}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
