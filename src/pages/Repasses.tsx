import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { payoutsApi } from "@/lib/clinicApi";
import { apiRequest } from "@/lib/api";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function Repasses() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(currentMonth());
  const [agreement, setAgreement] = useState({ professionalId: "", ruleType: "percent", fixedAmount: "", percentage: "60", effectiveFrom: currentMonth() + "-01" });
  const [adjustments, setAdjustments] = useState<Record<string, { netAmount: string; adjustmentReason: string }>>({});
  const { data: runs } = useQuery({ queryKey: ["payout-runs"], queryFn: () => payoutsApi.listRuns() });
  const { data: teamData } = useQuery<{ data: any[]; total: number }>({
    queryKey: ["team"],
    queryFn: () => apiRequest("/team"),
  });

  const generate = useMutation({
    mutationFn: () => payoutsApi.generateRun(month),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payout-runs"] });
      toast({ title: "Prévia gerada!" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const saveAgreement = useMutation({
    mutationFn: () => payoutsApi.createAgreement({
      professionalId: agreement.professionalId,
      ruleType: agreement.ruleType,
      fixedAmount: agreement.fixedAmount ? Number(agreement.fixedAmount) : null,
      percentage: agreement.percentage ? Number(agreement.percentage) : null,
      effectiveFrom: agreement.effectiveFrom,
    }),
    onSuccess: () => {
      setAgreement({ professionalId: "", ruleType: "percent", fixedAmount: "", percentage: "60", effectiveFrom: currentMonth() + "-01" });
      toast({ title: "Acordo salvo!" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const actOnRun = (id: string, action: "review" | "approve" | "pay") => {
    const call = action === "review" ? payoutsApi.reviewRun(id) : action === "approve" ? payoutsApi.approveRun(id) : payoutsApi.payRun(id);
    call.then(() => {
      qc.invalidateQueries({ queryKey: ["payout-runs"] });
      toast({ title: `Fechamento ${action === "review" ? "revisado" : action === "approve" ? "aprovado" : "pago"}!` });
    }).catch((err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }));
  };

  const adjustItem = (id: string) => {
    const values = adjustments[id];
    if (!values?.netAmount || !values?.adjustmentReason) {
      toast({ title: "Erro", description: "Informe valor e justificativa", variant: "destructive" });
      return;
    }
    payoutsApi.adjustItem(id, { netAmount: Number(values.netAmount), adjustmentReason: values.adjustmentReason })
      .then(() => {
        qc.invalidateQueries({ queryKey: ["payout-runs"] });
        toast({ title: "Ajuste registrado!" });
      })
      .catch((err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Repasses</h1>
        <p className="text-sm text-muted-foreground">Fechamento mensal somente com sessões clínicas pagas</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acordo de remuneração</CardTitle>
          <CardDescription>Valor fixo, percentual ou ambos, com vigência</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div>
            <Label>Profissional</Label>
            <Select
              value={agreement.professionalId}
              onValueChange={(value) => setAgreement({ ...agreement, professionalId: value })}
            >
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
            <Label>Regra</Label>
            <Select value={agreement.ruleType} onValueChange={(value) => setAgreement({ ...agreement, ruleType: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Valor fixo</SelectItem>
                <SelectItem value="percent">Percentual</SelectItem>
                <SelectItem value="both">Fixo + percentual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Valor fixo</Label>
            <Input value={agreement.fixedAmount} onChange={(e) => setAgreement({ ...agreement, fixedAmount: e.target.value })} />
          </div>
          <div>
            <Label>Percentual</Label>
            <Input value={agreement.percentage} onChange={(e) => setAgreement({ ...agreement, percentage: e.target.value })} />
          </div>
          <div className="flex items-end">
            <Button onClick={() => saveAgreement.mutate()} disabled={saveAgreement.isPending || !agreement.professionalId}>Salvar acordo</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gerar fechamento</CardTitle>
          <CardDescription>Prévia reproduzível por sessão elegível</CardDescription>
        </CardHeader>
        <CardContent className="flex items-end gap-3">
          <div>
            <Label>Mês (YYYY-MM)</Label>
            <Input value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <Button onClick={() => generate.mutate()} disabled={generate.isPending}>Gerar prévia</Button>
        </CardContent>
      </Card>

      {runs?.map((run) => (
        <Card key={run.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{String(run.month).slice(0, 7)}</CardTitle>
                <CardDescription>Líquido {Number(run.netTotal).toFixed(2)} · {run.items?.length || 0} sessões</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{run.status}</Badge>
                <Button size="sm" variant="outline" onClick={() => actOnRun(run.id, "review")}>Revisar</Button>
                <Button size="sm" variant="outline" onClick={() => actOnRun(run.id, "approve")}>Aprovar</Button>
                <Button size="sm" variant="outline" onClick={() => actOnRun(run.id, "pay")}>Pagar</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {run.items?.map((item) => (
              <div key={item.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{item.professional?.name || item.professionalId}</p>
                  <Badge variant="outline">{item.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Cobrado {Number(item.chargedAmount).toFixed(2)} · Líquido {Number(item.netAmount).toFixed(2)} · {item.ruleType}</p>
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  <Input
                    placeholder="Novo valor líquido"
                    value={adjustments[item.id]?.netAmount || ""}
                    onChange={(e) => setAdjustments({ ...adjustments, [item.id]: { netAmount: e.target.value, adjustmentReason: adjustments[item.id]?.adjustmentReason || "" } })}
                  />
                  <Input
                    placeholder="Justificativa"
                    value={adjustments[item.id]?.adjustmentReason || ""}
                    onChange={(e) => setAdjustments({ ...adjustments, [item.id]: { netAmount: adjustments[item.id]?.netAmount || "", adjustmentReason: e.target.value } })}
                  />
                  <Button size="sm" variant="outline" onClick={() => adjustItem(item.id)}>Registrar ajuste</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
