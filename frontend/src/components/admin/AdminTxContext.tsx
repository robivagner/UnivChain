"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type AdminTxContextValue = {
  txBusy: boolean;
  runAdminTx: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
};

const AdminTxContext = createContext<AdminTxContextValue | null>(null);

export function AdminTxProvider({ children }: { children: React.ReactNode }) {
  const [txBusy, setTxBusy] = useState(false);
  const lockRef = useRef(false);

  const runAdminTx = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (lockRef.current) return undefined;
    lockRef.current = true;
    setTxBusy(true);
    try {
      return await fn();
    } finally {
      lockRef.current = false;
      setTxBusy(false);
    }
  }, []);

  return (
    <AdminTxContext.Provider value={{ txBusy, runAdminTx }}>{children}</AdminTxContext.Provider>
  );
}

export function useAdminTx() {
  const ctx = useContext(AdminTxContext);
  if (!ctx) {
    throw new Error("useAdminTx must be used within AdminTxProvider");
  }
  return ctx;
}
