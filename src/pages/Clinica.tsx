import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { clinicApi } from "@/lib/clinicApi";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  professional: "Psicólogo(a)",
  secretary: "Secretária",
  financial: "Financeiro",
  supervisor: "Supervisor(a)",
};

export default function Clinica() {
  const qc = useQueryClient();
  const { data: status } = useQuery({ queryKey: ["clinic-status"], queryFn: () => clinicApi.status() });
  const { data: members } = useQuery({
    queryKey: ["clinic-members"],
    queryFn: () => clinicApi.listMembers(),
    enabled: Boolean(
      status?.membership &&
      status?.organization &&
      status.organization.mode !== "individual"
    ),
  });
  const [form, setForm] = useState({ userId: "", role: "professional", supervisorId: "", permissions: [] as string[] });
  const { data: teamData } = useQuery<{ data: any[]; total: number }>({
    queryKey: ["team"],
    queryFn: () => apiRequest("/team"),
  });

  const activate = useMutation({
    mutationFn: (mode: "clinic" | "hybrid") => clinicApi.activate(mode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clinic-status"] });
      qc.invalidateQueries({ queryKey: ["clinic-members"] });
      toast({ title: "Modo Clínica atualizado!" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const createMembership = useMutation({
    mutationFn: () => clinicApi.createMyMembership(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clinic-status"] });
      qc.invalidateQueries({ queryKey: ["clinic-members"] });
      toast({ title: "Vínculo clínico criado!" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const saveMember = useMutation({
    mutationFn: () => clinicApi.saveMember({
      userId: form.userId,
      role: form.role,
      supervisorId: form.supervisorId || null,
      permissions: form.permissions,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clinic-members"] });
      setForm({ userId: "", role: "professional", supervisorId: "", permissions: [] });
      toast({ title: "Vínculo salvo!" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, memberStatus }: { id: string; memberStatus: "active" | "suspended" | "ended" }) =>
      clinicApi.updateMemberStatus(id, memberStatus),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clinic-members"] }),
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Clínica</h1>
        <p className="text-sm text-muted-foreground">Operação clínica isolada dos atendimentos particulares</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Modo de operação</CardTitle>
          <CardDescription>Ativação explícita; dados particulares permanecem separados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge variant="outline">Atual: {status?.organization?.mode || "individual"}</Badge>
            <Badge variant={status?.canActivateClinic ? "default" : "secondary"}>
              Plano: {status?.canActivateClinic ? "habilita clínica" : "sem modo clínica"}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={() => activate.mutate("clinic")} disabled={!status || !status.canActivateClinic}>Clínica</Button>
            <Button size="sm" variant="outline" onClick={() => activate.mutate("hybrid")} disabled={!status || !status.canActivateClinic}>Híbrido</Button>
            {status?.organization && status.organization.mode !== "individual" && !status?.membership ? (
              <Button size="sm" onClick={() => createMembership.mutate()} disabled={createMembership.isPending}>
                Criar meu vínculo clínico
              </Button>
            ) : null}
            {!status?.canActivateClinic && (
              <span className="text-xs text-muted-foreground">Plano sem modo clínica</span>
            )}
          </div>
        </CardContent>
      </Card>

      {status?.organization && status.organization.mode !== "individual" ? (
        <Card>
          <CardHeader>
            <CardTitle>Vínculos clínicos</CardTitle>
            <CardDescription>Papel, supervisor e situação por profissional</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <Label>Usuário</Label>
                <Select value={form.userId} onValueChange={(value) => setForm({ ...form, userId: value })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o profissional" /></SelectTrigger>
                  <SelectContent>
                    {(teamData?.data || [])
                      .filter((user) => user.status === "active")
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} · {user.email}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Papel</Label>
                <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Psicólogo(a)</SelectItem>
                    <SelectItem value="secretary">Secretária</SelectItem>
                    <SelectItem value="financial">Financeiro</SelectItem>
                    <SelectItem value="supervisor">Supervisor(a)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Supervisor</Label>
                <Select
                  value={form.supervisorId || "none"}
                  onValueChange={(value) => setForm({ ...form, supervisorId: value === "none" ? "" : value })}
                >
                  <SelectTrigger><SelectValue placeholder="Sem supervisor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem supervisor</SelectItem>
                    {(members || [])
                      .filter((m) => m.status === "active" && ["supervisor", "admin"].includes(m.role))
                      .map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {m.user?.name || m.userId} · {m.user?.email || ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={() => saveMember.mutate()} disabled={saveMember.isPending || !form.userId}>Salvar vínculo</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Funções adicionais</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { value: "clinic:manage", label: "Administrar clínica" },
                  { value: "team:manage", label: "Gerenciar equipe" },
                  { value: "agenda:manage", label: "Gerenciar agenda" },
                  { value: "finance:manage", label: "Gerenciar financeiro" },
                  { value: "payout:manage", label: "Gerenciar repasses" },
                  { value: "audit:read", label: "Ver auditoria" },
                ].map((permission) => (
                  <label key={permission.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={form.permissions.includes(permission.value)}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        permissions: e.target.checked
                          ? [...prev.permissions, permission.value]
                          : prev.permissions.filter((p) => p !== permission.value),
                      }))}
                    />
                    {permission.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {members?.map((member) => (
                <div key={member.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{member.user?.name || member.userId}</p>
                      <Badge variant="outline">{roleLabels[member.role] || member.role}</Badge>
                      <Badge variant={member.status === "active" ? "default" : "secondary"}>{member.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{member.user?.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: member.id, memberStatus: member.status === "active" ? "suspended" : "active" })}>
                      {member.status === "active" ? "Suspender" : "Reativar"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: member.id, memberStatus: "ended" })}>
                      Encerrar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
