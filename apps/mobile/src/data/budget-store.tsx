import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import * as Crypto from "expo-crypto";
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
  /** Resolves once the defaults are on disk; rejects if that write fails (an erase must not claim success). */
  reset: () => Promise<void>;
};

const BudgetContext = createContext<BudgetStore | null>(null);

export function BudgetStoreProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<BudgetConfig>(defaultConfig);
  const [hydrated, setHydrated] = useState(!persistenceEnabled);
  const dbRef = useRef<ZenoDatabase | null>(null);
  // Event-time mirror of `config` (finding F26), the same pattern as
  // subscription-store: every action derives its next state from THIS, not from
  // the `config` its render captured. Two actions before a re-render (a fast
  // double-tap, two edits in one event) otherwise both start from the same stale
  // state and the second write silently erases the first. Written only from the
  // hydration effect and from actions, never during render.
  const configRef = useRef(config);

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
            const stored = { ...defaultConfig, ...(JSON.parse(raw) as Partial<BudgetConfig>) };
            configRef.current = stored;
            setConfig(stored);
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
    // Derive from the latest state (configRef), never the render-captured
    // `config` — see configRef above (F26).
    const update = (mutate: (current: BudgetConfig) => BudgetConfig) => {
      const next = mutate(configRef.current);
      configRef.current = next;
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
        update((current) => ({ ...current, capMinor }));
      },
      setIncome(incomeMinor) {
        update((current) => ({ ...current, incomeMinor }));
      },
      addEnvelope(name, fundedMinor, icon = "wallet") {
        // A random id, not one derived from envelopes.length, so two envelopes
        // added in one event can never share an id.
        const id = `env_${Crypto.randomUUID()}`;
        update((current) => ({ ...current, envelopes: [...current.envelopes, { id, name, icon, fundedMinor, spentMinor: 0 }] }));
      },
      logEnvelope(id, amountMinor) {
        update((current) => ({
          ...current,
          envelopes: current.envelopes.map((envelope) =>
            envelope.id === id ? { ...envelope, spentMinor: envelope.spentMinor + amountMinor } : envelope
          )
        }));
      },
      removeEnvelope(id) {
        update((current) => ({ ...current, envelopes: current.envelopes.filter((envelope) => envelope.id !== id) }));
      },
      setCategoryCap(category, capMinor) {
        update((current) => ({
          ...current,
          categoryCaps: [...current.categoryCaps.filter((cap) => cap.category !== category), { category, capMinor }]
        }));
      },
      async reset() {
        configRef.current = defaultConfig;
        setConfig(defaultConfig);
        const db = dbRef.current;
        if (db) {
          await writeAppMeta(db, META_KEY, JSON.stringify(defaultConfig));
        }
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
