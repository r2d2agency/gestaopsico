import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Plus, Filter, CheckCircle, AlertCircle, Clock, Wallet, Download,
  MoreHorizontal, Edit, Trash2, CreditCard, PiggyBank
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import StatCard from "@/components/StatCard";
import { accountsApi, type Account, type AccountsSummary } from "@/lib/portalApi";

const statusConfig: Record<string, { label: string; class: string; icon: typeof CheckCircle }> = {
  pending: { label: "Pendente", class: "bg-warning/10 text-warning", icon: Clock },
  paid: { label: "Pago", class: "bg-success/10 text-success", icon: CheckCircle },
  overdue: { label: "Vencido", class: "bg-destructive/10 text-destructive", icon: AlertCircle },
  cancelled: { label: "Cancelado", class: "bg-muted text-muted-foreground", icon: AlertCircle },
};

const categories = [
  "Consulta", "Aluguel", "Materiais", "Software", "Marketing",
  "Salário", "Impostos", "Manutenção", "Outros"
];

export default function FinanceiroCompleto() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("receivable");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Account>>({
    type: "receivable", description: "", value: 0, dueDate: "",
    category: "", paymentMethod: "", notes: "", status: "pending"
  });

  const params: Record<string, string> = { type: tab };
  const { data: accountsData, isLoading } = useQuery({
    queryKey: ["accounts", tab],
    queryFn: () => accountsApi.list(params),
  });

  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ["accounts-summary"],
    queryFn: () => accountsApi.summary(),
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Account>) =>
      editId ? accountsApi.update(editId, data) : accountsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["accounts-summary"] });
      toast({ title: editId ? "Conta atualizada!" : "Conta criada!" });
      closeDialog();
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["accounts-summary"] });
      toast({ title: "Conta removida" });
    },
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => accountsApi.update(id, { status: "paid" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["accounts-summary"] });
      toast({ title: "Baixa realizada!" });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditId(null);
    setForm({ type: tab as "receivable" | "payable", description: "", value: 0, dueDate: "", category: "", paymentMethod: "", notes: "", status: "pending" });
  };

  const openNew = (type: "receivable" | "payable") => {
    setForm({ ...form, type });
    setEditId(null);
    setDialogOpen(true);
  };

  const openEdit = (acc: Account) => {
    setEditId(acc.id);
    setForm({ ...acc, dueDate: acc.dueDate?.split("T")[0] || "" });
    setDialogOpen(true);
  };

  const handleSave = () => saveMutation.mutate(form);
  const set = (field: keyof Account, value: unknown) => setForm(prev => ({ ...prev, [field]: value }));

  const fmt = (v: number) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const accounts = accountsData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground mt-1">Contas a receber, pagar e fluxo de caixa</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Exportar</Button>
          <Button onClick={() => openNew("receivable")} className="gap-2" size="sm">
            <Plus className="w-4 h-4" />Nova Conta
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {sumLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <StatCard icon={ArrowUpRight} label="A Receber" value={fmt(summary?.totalReceivable ?? 0)} change={`${fmt(summary?.receivedAmount ?? 0)} recebido`} changeType="positive" />
            <StatCard icon={ArrowDownRight} label="A Pagar" value={fmt(summary?.totalPayable ?? 0)} change={`${fmt(summary?.paidAmount ?? 0)} pago`} changeType="negative" />
            <StatCard icon={Wallet} label="Fluxo de Caixa" value={fmt(summary?.cashFlow ?? 0)} change="" changeType={(summary?.cashFlow ?? 0) >= 0 ? "positive" : "negative"} />
            <StatCard icon={AlertCircle} label="Vencido" value={fmt(summary?.overdueReceivable ?? 0)} change={`${fmt(summary?.pendingReceivable ?? 0)} pendente`} changeType="negative" />
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="receivable" className="gap-2">
            <ArrowUpRight className="w-4 h-4" />Contas a Receber
          </TabsTrigger>
          <TabsTrigger value="payable" className="gap-2">
            <ArrowDownRight className="w-4 h-4" />Contas a Pagar
          </TabsTrigger>
        </TabsList>

        {["receivable", "payable"].map(t => (
          <TabsContent key={t} value={t} className="mt-4">
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <PiggyBank className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Nenhuma conta {t === "receivable" ? "a receber" : "a pagar"}</p>
                <Button className="mt-3" variant="outline" onClick={() => openNew(t as "receivable" | "payable")}>
                  <Plus className="w-4 h-4 mr-2" />Adicionar
                </Button>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Descrição</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Paciente</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Vencimento</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Valor</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Categoria</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Status</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {accounts.map((acc) => {
                      const sc = statusConfig[acc.status] || statusConfig.pending;
                      return (
                        <tr key={acc.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-3.5 text-sm font-medium text-foreground">{acc.description}</td>
                          <td className="px-5 py-3.5 text-sm text-muted-foreground">{acc.patient?.name || "—"}</td>
                          <td className="px-5 py-3.5 text-sm text-muted-foreground">
                            {acc.dueDate ? new Date(acc.dueDate).toLocaleDateString("pt-BR") : "—"}
                          </td>
                          <td className="px-5 py-3.5 text-sm font-semibold text-foreground">{fmt(acc.value)}</td>
                          <td className="px-5 py-3.5 text-sm text-muted-foreground">{acc.category || "—"}</td>
                          <td className="px-5 py-3.5">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${sc.class}`}>{sc.label}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1 rounded hover:bg-muted"><MoreHorizontal className="w-4 h-4 text-muted-foreground" /></button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {acc.status === "pending" && (
                                  <DropdownMenuItem onClick={() => markPaid.mutate(acc.id)}>
                                    <CheckCircle className="w-4 h-4 mr-2" />Dar Baixa
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => openEdit(acc)}>
                                  <Edit className="w-4 h-4 mr-2" />Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(acc.id)}>
                                  <Trash2 className="w-4 h-4 mr-2" />Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </motion.div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Conta" : `Nova Conta a ${form.type === "receivable" ? "Receber" : "Pagar"}`}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {!editId && (
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={v => set("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receivable">A Receber</SelectItem>
                    <SelectItem value="payable">A Pagar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Descrição *</Label>
              <Input value={form.description} onChange={e => set("description", e.target.value)} placeholder="Consulta individual" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" value={form.value} onChange={e => set("value", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label>Vencimento *</Label>
                <Input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select value={form.category || ""} onValueChange={v => set("category", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={form.paymentMethod || ""} onValueChange={v => set("paymentMethod", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">Pix</SelectItem>
                    <SelectItem value="card">Cartão</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="transfer">Transferência</SelectItem>
                    <SelectItem value="insurance">Convênio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending || !form.description || !form.value || !form.dueDate}>
              {saveMutation.isPending ? "Salvando..." : editId ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
