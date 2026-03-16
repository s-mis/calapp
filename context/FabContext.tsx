'use client';

import { createContext, useContext, useRef, ReactNode } from 'react';

interface FabContextType {
  setFabAction: (fn: (() => void) | null) => void;
  triggerFab: () => void;
}

const FabContext = createContext<FabContextType>({
  setFabAction: () => {},
  triggerFab: () => {},
});

export function FabProvider({ children }: { children: ReactNode }) {
  const actionRef = useRef<(() => void) | null>(null);

  const setFabAction = (fn: (() => void) | null) => {
    actionRef.current = fn;
  };

  const triggerFab = () => {
    actionRef.current?.();
  };

  return (
    <FabContext.Provider value={{ setFabAction, triggerFab }}>
      {children}
    </FabContext.Provider>
  );
}

export const useFab = () => useContext(FabContext);
