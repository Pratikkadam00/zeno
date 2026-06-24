import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import { openZenoDatabase, readAppMeta, writeAppMeta, type ZenoDatabase } from "../storage/database";

export type BudgetEnvelope = { id: string; name: string; icon: string; fundedMinor: number; spentMinor: number };
export type BudgetCategoryCap = { category: string; capMinor: number };

export type BudgetConfig = {
  capMinor: number | null; // monthly recurring cap; null = not set yet
  incomeMinor: number | null; // optional monthly income (sensitive PII)
  envelopes: BudgetEnvelope[];
  categoryCaps: BudgetCategoryCap[];
};

// Stored in the SQLCipher-encrypted app_meta table (NOT plaintext AsyncStorage) —
// the budget config holds the user's stated monthly income, which is sensitive PII.
const META_KEY = "budget.config.v1";
const defaultConfig: BudgetConfig = { capMinor: null, incomeMinor: null, envelopes: [], categoryCaps: [] };

// expo-sqlite is not configured for web; web sessions stay in-memory.
const persistenceEnabled = Platform.OS !== "web";

type BudgetStore = {
  config: BudgetConfig;
  hydrated: boolean;
  setCap: (capMinor: number | null) => void;
  setIncome: (incomeMinor: number | null) => void;
  addEnvelope: (name: string, fundedMinor: number, icon?: string) => void;
  logEnvelope: (id: string, amountMinor: number) => void;
  removeEnvelope: (id: string) => void;
  setCategoryCap: (category: string, capMinor: number) => void;
  reset: () => void;
};

const BudgetContext = createContext<BudgetStore | null>(null);

export function BudgetStoreProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<BudgetConfig>(defaultConfig);
  const [hydrated, setHydrated] = useState(!persistenceEnabled);
  const dbRef = useRef<ZenoDatabase | null>(null);

  useEffect(() => {
    if (!persistenceEnabled) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const db = await openZenoDatabase();
        if (cancelled) {
          return;
        }
        dbRef.current = db;
        const raw = await readAppMeta(db, META_KEY);
        if (raw && !cancelled) {
          try {
            setConfig({ ...defaultConfig, ...(JSON.parse(raw) as Partial<BudgetConfig>) });
          } catch (error) {
            console.warn("Corrupt budget config; using defaults.", error);
          }
        }
      } catch (error) {
        console.warn("Budget store database unavailable; using in-memory config.", error);
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<BudgetStore>(() => {
    const persist = (next: BudgetConfig) => {
      setConfig(next);
      const db = dbRef.current;
      if (db) {
        void writeAppMeta(db, META_KEY, JSON.stringify(next)).catch((error) => {
          console.warn("Failed to persist budget config.", error);
        });
      }
    };
    return {
      config,
      hydrated,
      setCap(capMinor) {
        persist({ ...config, capMinor });
      },
      setIncome(incomeMinor) {
        persist({ ...config, incomeMinor });
      },
      addEnvelope(name, fundedMinor, icon = "wallet") {
        const id = `env_${config.envelopes.length}_${name.replace(/\s+/g, "").slice(0, 8).toLowerCase()}`;
        persist({ ...config, envelopes: [...config.envelopes, { id, name, icon, fundedMinor, spentMinor: 0 }] });
      },
      logEnvelope(id, amountMinor) {
        persist({
          ...config,
          envelopes: config.envelopes.map((envelope) =>
            envelope.id === id ? { ...envelope, spentMinor: envelope.spentMinor + amountMinor } : envelope
          )
        });
      },
      removeEnvelope(id) {
        persist({ ...config, envelopes: config.envelopes.filter((envelope) => envelope.id !== id) });
      },
      setCategoryCap(category, capMinor) {
        const others = config.categoryCaps.filter((cap) => cap.category !== category);
        persist({ ...config, categoryCaps: [...others, { category, capMinor }] });
      },
      reset() {
        persist(defaultConfig);
      }
    };
  }, [config, hydrated]);

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudgetStore(): BudgetStore {
  const value = useContext(BudgetContext);
  if (!value) {
    throw new Error("useBudgetStore must be used inside BudgetStoreProvider");
  }
  return value;
}
