import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { clinicApi } from "@/lib/clinicApi";
import { setActiveDataScope } from "@/lib/api";

export type DataScope = "private" | "clinic";

interface ScopeContextType {
  scope: DataScope;
  canUseClinic: boolean;
  setScope: (scope: DataScope) => void;
}

const STORAGE_KEY = "active_data_scope";

const ScopeContext = createContext<ScopeContextType | null>(null);

/**
 * Mantém o contexto de dados ativo (particular ou clínica) sincronizado com o
 * cliente de API e com as consultas do React Query.
 */
export function ScopeProvider({ children }: { children: ReactNode }) {
  const [scope, setScopeState] = useState<DataScope>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "clinic"
        ? "clinic"
        : "private";
    } catch {
      return "private";
    }
  });
  const [canUseClinic, setCanUseClinic] = useState(false);

  useEffect(() => {
    let active = true;
    clinicApi
      .status()
      .then((status) => {
        if (!active) return;
        setCanUseClinic(
          status.organization?.mode !== "individual" &&
            Boolean(status.membership),
        );
      })
      .catch(() => {
        if (active) setCanUseClinic(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!canUseClinic && scope === "clinic") {
      setScopeState("private");
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Nada a fazer se o armazenamento estiver indisponível.
      }
    }
  }, [canUseClinic, scope]);

  const setScope = useCallback(
    (next: DataScope) => {
      if (next === "clinic" && !canUseClinic) return;
      setScopeState(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Armazenamento local pode estar indisponível; o escopo segue ativo na sessão.
      }
    },
    [canUseClinic],
  );

  useEffect(() => {
    setActiveDataScope(scope);
  }, [scope]);

  const value = useMemo(
    () => ({ scope, canUseClinic, setScope }),
    [scope, canUseClinic, setScope],
  );

  return (
    <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>
  );
}

export function useScope() {
  const ctx = useContext(ScopeContext);
  if (!ctx) throw new Error("useScope must be used within ScopeProvider");
  return ctx;
}
