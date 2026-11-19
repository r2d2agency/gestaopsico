import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, type Organization, type AdminUser } from "@/lib/adminApi";
import { toast } from "@/hooks/use-toast";

export function useAdminMetrics() {
  return useQuery({
    queryKey: ["admin", "metrics"],
    queryFn: () => adminApi.getMetrics(),
    retry: false,
  });
}

export function useOrganizations(params?: Record<string, string>) {
  return useQuery({
    queryKey: ["admin", "organizations", params],
    queryFn: () => adminApi.listOrganizations(params),
    retry: false,
  });
}

export function useAdminUsers(params?: Record<string, string>) {
  return useQuery({
    queryKey: ["admin", "users", params],
    queryFn: () => adminApi.listUsers(params),
    retry: false,
  });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Organization>) => adminApi.createOrganization(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "Organização criada com sucesso" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });
}

export function useToggleOrgStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => adminApi.toggleOrgStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "Status atualizado" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });
}

export function useUpdateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof adminApi.updateOrganization>[1] }) =>
      adminApi.updateOrganization(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "Organização atualizada" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => adminApi.resetUserPassword(id, password),
    onSuccess: () => toast({ title: "Senha redefinida" }),
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });
}

export function useAssistedAccess() {
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.assistedAccess(id, reason),
    onSuccess: ({ token }) => {
      sessionStorage.setItem("assisted_access_token", token);
      window.open(`/?assisted_access=1`, "_blank");
      toast({ title: "Acesso assistido gerado", description: "Use o token temporário na nova aba (15 minutos)." });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; email: string; password: string; role: string; organizationId?: string }) =>
      adminApi.createUser(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "Usuário criado com sucesso" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });
}

export function useToggleUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => adminApi.toggleUserStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "Status do usuário atualizado" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });
}

export function useChangeUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminApi.changeUserRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "Perfil do usuário atualizado" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });
}
