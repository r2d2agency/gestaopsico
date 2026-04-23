import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DollarSign, CheckCircle2, Clock, AlertCircle, FileText, Send, Receipt,
  Wallet, TrendingUp, CreditCard, CalendarClock, Calculator, ArrowDownToLine,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { accountsApi } from "@/lib/portalApi";
import { invoicesApi } from "@/lib/api";

interface Props {
  patientId: string;
  patientName: string;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusConfig: Record<string, { label: string; class: string }> = {
  paid: { label: "Pago", class: "bg-success/10 text-success border-success/20" },
  pending: { label: "Pendente", class: "bg-warning/10 text-warning border-warning/20" },
  overdue: { label: "Vencido", class: "bg-destructive/10 text-destructive border-destructive/20" },
  cancelled: { label: "Cancelado", class: "bg-muted text-muted-foreground" },
};

export default function PatientFinancial({ patientId, patientName }: Props) {
  const queryClient = useQueryClient();
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [invoiceForm, setInvoiceForm] = useState({ dueDate: new Date().toISOString().split("T")[0], description: "" });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["patient-financial-detail", patientId],
    queryFn: () => accountsApi.patientFinancial(patientId),
    enabled: !!patientId,
  });

  const generateInvoice = useMutation({
    mutationFn: (payload: { sessionIds: string[]; dueDate: string; description?: string; paymentMethod?: string }) =>
      invoicesApi.generate({ patientId, ...payload }),
    onSuccess: () => {
      toast.success("Fatura consolidada gerada!");
      queryClient.invalidateQueries({ queryKey: ["patient-financial-detail", patientId] });
      setInvoiceDialogOpen(false);
      setSelectedSessions(new Set());
    },
    onError: (e: any) => toast.error(e.message || "Erro ao gerar fatura"),
  });

  const bulkPay = useMutation({
    mutationFn: (ids: string[]) => accountsApi.bulkPay({ ids, paymentMethod }),
    onSuccess: (res) => {
      toast.success(`${res.count} pagamento(s) baixado(s)`);
      refetch();
      setSelectedAccounts(new Set());
      setPayDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao dar baixa"),
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => accountsApi.update(id, { status: "paid" }),
    onSuccess: () => {
      toast.success("Pagamento confirmado");
      refetch();
    },
    onError: (e: any) => toast.error(e.message || "Erro"),
  });

  const stats = data?.stats;
  const sessions = data?.sessions || [];
  const accounts = data?.accounts || [];

  const unbilledSessions = useMemo(() => sessions.filter(s => !s.billed), [sessions]);

  const selectedSessionsTotal = useMemo(() => {
    return unbilledSessions
      .filter(s => selectedSessions.has(s.id))
      .reduce((sum, s) => sum + Number(s.value || 0), 0);
  }, [unbilledSessions, selectedSessions]);

  const selectedAccountsTotal = useMemo(() => {
    return accounts
      .filter(a => selectedAccounts.has(a.id))
      .reduce((sum, a) => sum + Number(a.value || 0), 0);
  }, [accounts, selectedAccounts]);

  const toggleSession = (id: string) => {
    setSelectedSessions(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAccount = (id: string) => {
    setSelectedAccounts(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllUnbilled = () => {
    if (selectedSessions.size === unbilledSessions.length) setSelectedSessions(new Set());
    else setSelectedSessions(new Set(unbilledSessions.map(s => s.id)));
  };

  const selectAllOpen = () => {
    const open = accounts.filter(a => a.status !== "paid" && a.status !== "cancelled");
    if (selectedAccounts.size === open.length) setSelectedAccounts(new Set());
    else setSelectedAccounts(new Set(open.map(a => a.id)));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={Wallet}
          label="Saldo a Receber"
          value={fmt(stats?.balance || 0)}
          accent="warning"
          subtitle={`${(stats?.totalPending || 0) > 0 ? "pendente" : ""}`}
        />
        <KpiCard
          icon={CheckCircle2}
          label="Total Recebido"
          value={fmt(stats?.totalPaid || 0)}
          accent="success"
          subtitle="já confirmado"
        />
        <KpiCard
          icon={Receipt}
          label="Sessões Realizadas"
          value={String(stats?.totalSessions || 0)}
          accent="primary"
          subtitle={fmt(stats?.totalChargedSessions || 0)}
        />
        <KpiCard
          icon={Calculator}
          label="A Faturar"
          value={fmt(stats?.unbilledTotal || 0)}
          accent="info"
          subtitle={`${stats?.unbilledCount || 0} sessões`}
        />
      </div>

      {/* Sessões a faturar */}
      <Card className="border-border/60">
        <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              Sessões para Faturamento
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Selecione sessões para gerar uma cobrança consolidada
            </p>
          </div>
          {unbilledSessions.length > 0 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={selectAllUnbilled}>
                {selectedSessions.size === unbilledSessions.length ? "Limpar" : "Todas"}
              </Button>
              <Button
                size="sm"
                disabled={selectedSessions.size === 0}
                onClick={() => {
                  setInvoiceForm(f => ({
                    ...f,
                    description: `Atendimento ${patientName} — ${selectedSessions.size} sessão(ões)`,
                  }));
                  setInvoiceDialogOpen(true);
                }}
                className="gradient-primary border-0"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Fechar Faturamento ({fmt(selectedSessionsTotal)})
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {unbilledSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Todas as sessões realizadas já foram faturadas
            </div>
          ) : (
            <div className="space-y-2">
              {unbilledSessions.map((s, idx) => (
                <motion.label
                  key={s.id}
                  htmlFor={`s-${s.id}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedSessions.has(s.id) ? "bg-primary/5 border-primary/30" : "hover:bg-muted/40 border-border"
                  }`}
                >
                  <Checkbox
                    id={`s-${s.id}`}
                    checked={selectedSessions.has(s.id)}
                    onCheckedChange={() => toggleSession(s.id)}
                  />
                  <div className="flex-1 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {format(new Date(s.date), "dd 'de' MMM yyyy", { locale: ptBR })}
                        <span className="text-xs text-muted-foreground ml-2">{s.time}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {s.duration} min · {s.type === "couple" ? "Casal" : "Individual"}
                      </p>
                    </div>
                    <span className="font-semibold text-foreground text-sm">{fmt(s.value)}</span>
                  </div>
                </motion.label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Faturas / contas */}
      <Card className="border-border/60">
        <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Cobranças & Faturas
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Histórico de faturas — selecione para dar baixa em lote
            </p>
          </div>
          {accounts.some(a => a.status !== "paid" && a.status !== "cancelled") && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={selectAllOpen}>
                {selectedAccounts.size > 0 ? "Limpar" : "Em aberto"}
              </Button>
              <Button
                size="sm"
                disabled={selectedAccounts.size === 0}
                onClick={() => setPayDialogOpen(true)}
                className="bg-success hover:bg-success/90 text-success-foreground border-0"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 mr-1.5" />
                Dar Baixa ({fmt(selectedAccountsTotal)})
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Nenhuma fatura emitida ainda
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map((a, idx) => {
                const sc = statusConfig[a.status] || statusConfig.pending;
                const open = a.status !== "paid" && a.status !== "cancelled";
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      selectedAccounts.has(a.id) ? "bg-primary/5 border-primary/30" : "border-border"
                    }`}
                  >
                    {open ? (
                      <Checkbox
                        checked={selectedAccounts.has(a.id)}
                        onCheckedChange={() => toggleAccount(a.id)}
                      />
                    ) : (
                      <div className="w-4 h-4 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{a.description}</p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <CalendarClock className="w-3 h-3" />
                          Vence {format(new Date(a.dueDate), "dd/MM/yyyy")}
                        </span>
                        {a.paidAt && (
                          <span className="text-success">
                            Pago em {format(new Date(a.paidAt), "dd/MM/yyyy")}
                          </span>
                        )}
                        {a.paymentMethod && <span className="capitalize">{a.paymentMethod}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground text-sm">{fmt(a.value)}</p>
                      <Badge variant="outline" className={`text-[10px] mt-0.5 ${sc.class}`}>{sc.label}</Badge>
                    </div>
                    {open && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-success h-8"
                        onClick={() => markPaid.mutate(a.id)}
                        disabled={markPaid.isPending}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Gerar Fatura */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" /> Fechar Faturamento
            </DialogTitle>
            <DialogDescription>
              {selectedSessions.size} sessão(ões) selecionada(s) — Total: <strong className="text-foreground">{fmt(selectedSessionsTotal)}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={invoiceForm.description}
                onChange={e => setInvoiceForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Vencimento</Label>
                <Input
                  type="date"
                  value={invoiceForm.dueDate}
                  onChange={e => setInvoiceForm(f => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="card">Cartão</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="insurance">Convênio</SelectItem>
                    <SelectItem value="transfer">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInvoiceDialogOpen(false)}>Cancelar</Button>
            <Button
              className="gradient-primary border-0"
              onClick={() => generateInvoice.mutate({
                sessionIds: Array.from(selectedSessions),
                dueDate: invoiceForm.dueDate,
                description: invoiceForm.description,
                paymentMethod,
              })}
              disabled={generateInvoice.isPending}
            >
              <Send className="w-4 h-4 mr-2" />
              {generateInvoice.isPending ? "Gerando..." : "Gerar Cobrança"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Bulk Pay */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownToLine className="w-5 h-5 text-success" /> Confirmar Pagamentos
            </DialogTitle>
            <DialogDescription>
              {selectedAccounts.size} cobrança(s) — Total: <strong className="text-foreground">{fmt(selectedAccountsTotal)}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label>Forma de Pagamento Recebida</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="card">Cartão</SelectItem>
                <SelectItem value="cash">Dinheiro</SelectItem>
                <SelectItem value="insurance">Convênio</SelectItem>
                <SelectItem value="transfer">Transferência</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayDialogOpen(false)}>Cancelar</Button>
            <Button
              className="bg-success hover:bg-success/90 text-success-foreground border-0"
              onClick={() => bulkPay.mutate(Array.from(selectedAccounts))}
              disabled={bulkPay.isPending}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {bulkPay.isPending ? "Salvando..." : "Confirmar Recebimento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, accent = "primary", subtitle,
}: {
  icon: any; label: string; value: string; accent?: "primary" | "success" | "warning" | "info" | "destructive"; subtitle?: string;
}) {
  const colors = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    info: "text-info bg-info/10",
    destructive: "text-destructive bg-destructive/10",
  };
  return (
    <Card className="border-border/60">
      <CardContent className="pt-4 pb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${colors[accent]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-foreground leading-tight mt-0.5">{value}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
