import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type BudgetEnvelope = { id: string; name: string; icon: string; fundedMinor: number; spentMinor: number };
export type BudgetCategoryCap = { category: string; capMinor: number };

export type BudgetConfig = {
  capMinor: number | null; // monthly recurring cap; null = not set yet
  incomeMinor: number | null; // optional monthly income
  envelopes: BudgetEnvelope[];
  categoryCaps: BudgetCategoryCap[];
};

const STORAGE_KEY = "zeno.budget.config.v1";
const defaultConfig: BudgetConfig = { capMinor: null, incomeMinor: null, envelopes: [], categoryCaps: [] };

type BudgetStore = {
  config: BudgetConfig;
  hydrated: boolean;
  setCap: (capMinor: number | null) => void;
  setIncome: (incomeMinor: number | null) => void;
  addEnvelope: (name: string, fundedMinor: number, icon?: string) => void;
  logEnvelope: (id: string, amountMinor: number) => void;
  removeEnvelope: (id: string) => void;
  setCategoryCap: (category: string, capMinor: number) => void;
};

const BudgetContext = createContext<BudgetStore | null>(null);

export function BudgetStoreProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<BudgetConfig>(defaultConfig);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        if (raw) {
          try {
            setConfig({ ...defaultConfig, ...(JSON.parse(raw) as Partial<BudgetConfig>) });
          } catch (error) {
            console.warn("Corrupt budget config; using defaults.", error);
          }
        }
        setHydrated(true);
      })
      .catch(() => setHydrated(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<BudgetStore>(() => {
    const persist = (next: BudgetConfig) => {
      setConfig(next);
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
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
