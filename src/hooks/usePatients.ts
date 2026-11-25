import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pacientesApi, type Patient } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useScope } from "@/contexts/ScopeContext";

export function usePatients(search?: string) {
  const { scope } = useScope();
  return useQuery<Patient[]>({
    queryKey: ["patients", scope, search],
    queryFn: async () => {
      const res = await pacientesApi.list(search ? { search } : undefined);
      return Array.isArray(res) ? res : (res as any).data ?? [];
    },
    staleTime: 30_000,
  });
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Patient>) => pacientesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      qc.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: "Paciente cadastrado com sucesso!" });
    },
    onError: (err: Error) =>
      toast({ title: "Erro ao cadastrar", description: err.message, variant: "destructive" }),
  });
}

export function useUpdatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Patient> }) => pacientesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      toast({ title: "Paciente atualizado!" });
    },
    onError: (err: Error) =>
      toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" }),
  });
}

export function useDeletePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pacientesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      toast({ title: "Paciente removido" });
    },
    onError: (err: Error) =>
      toast({ title: "Erro ao remover", description: err.message, variant: "destructive" }),
  });
}
