import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { usePatients } from "@/hooks/usePatients";
import type { Patient } from "@/lib/api";

interface PatientSearchSelectProps {
  value: string;
  onValueChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function PatientSearchSelect({
  value,
  onValueChange,
  placeholder = "Buscar paciente...",
  disabled = false,
}: PatientSearchSelectProps) {
  const { data: patients = [] } = usePatients();
  const patientList: Patient[] = Array.isArray(patients) ? patients : (patients as any)?.data || [];

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return patientList;
    const q = search.toLowerCase();
    return patientList.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.cpf && p.cpf.includes(q)) ||
        (p.phone && p.phone.includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q))
    );
  }, [patientList, search]);

  const selectedPatient = patientList.find((p) => p.id === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (disabled) {
    return (
      <Input
        value={selectedPatient?.name || ""}
        disabled
        placeholder={placeholder}
      />
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      {value && selectedPatient ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background text-sm">
          <span className="flex-1 text-foreground font-medium">{selectedPatient.name}</span>
          <button
            onClick={() => { onValueChange(""); setSearch(""); }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="pl-9"
          />
        </div>
      )}

      {open && !value && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-[240px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground text-center">
              Nenhum paciente encontrado
            </div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => { onValueChange(p.id); setSearch(""); setOpen(false); }}
                className="w-full px-4 py-2.5 text-left hover:bg-accent transition-colors flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.phone || p.email || p.cpf || ""}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  p.status === "active" ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
                }`}>
                  {p.status === "active" ? "Ativo" : "Inativo"}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
