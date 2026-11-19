import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    enabled: Boolean(status?.organization && status.organization.mode !== "individual"),
  });
  const [form, setForm] = useState({ userId: "", role: "professional", supervisorId: "" });

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
    mutationFn: () => clinicApi.saveMember({ userId: form.userId, role: form.role, supervisorId: form.supervisorId || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clinic-members"] });
      setForm({ userId: "", role: "professional", supervisorId: "" });
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
            <Button size="sm" variant="outline" onClick={() => activate.mutate("clinic")} disabled={!status?.canActivateClinic}>Clínica</Button>
            <Button size="sm" variant="outline" onClick={() => activate.mutate("hybrid")} disabled={!status?.canActivateClinic}>Híbrido</Button>
            {status?.organization && status.organization.mode !== "individual" && !status?.membership ? (
              <Button size="sm" onClick={() => createMembership.mutate()} disabled={createMembership.isPending || !status?.canActivateClinic}>
                Criar meu vínculo clínico
              </Button>
            ) : null}
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
                <Label>ID do usuário</Label>
                <Input value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} />
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
                <Label>Supervisor (ID)</Label>
                <Input value={form.supervisorId} onChange={(e) => setForm({ ...form, supervisorId: e.target.value })} />
              </div>
              <div className="flex items-end">
                <Button onClick={() => saveMember.mutate()} disabled={saveMember.isPending || !form.userId}>Salvar vínculo</Button>
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
