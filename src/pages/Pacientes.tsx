import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Filter, MoreHorizontal, Phone, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatients, useCreatePatient, useDeletePatient } from "@/hooks/usePatients";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Patient } from "@/lib/api";

const emptyForm: Partial<Patient> = {
  name: "", cpf: "", phone: "", email: "", gender: "",
  birth_date: "", address: "", emergency_contact: "",
  clinical_notes: "", health_history: "", medications: "", allergies: "",
  status: "active",
};

export default function Pacientes() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Patient>>({ ...emptyForm });

  const { data: patients = [], isLoading } = usePatients(search || undefined);
  const createPatient = useCreatePatient();
  const deletePatient = useDeletePatient();

  const set = (field: keyof Patient, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = () => {
    if (!form.name?.trim()) return;
    createPatient.mutate(form, {
      onSuccess: () => {
        setForm({ ...emptyForm });
        setDialogOpen(false);
      },
    });
  };

  const handleDelete = () => {
    if (deleteId) {
      deletePatient.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Pacientes</h1>
          <p className="text-muted-foreground mt-1">{patients.length} pacientes cadastrados</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Novo Paciente</Button>
          </DialogTrigger>
           <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Paciente</DialogTitle>
              <p className="text-sm text-muted-foreground">Preencha os dados do paciente abaixo</p>
            </DialogHeader>

            <Tabs defaultValue="pessoal" className="mt-2">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pessoal">Dados Pessoais</TabsTrigger>
                <TabsTrigger value="contato">Contato</TabsTrigger>
                <TabsTrigger value="clinico">Clínico</TabsTrigger>
              </TabsList>

              <TabsContent value="pessoal" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Nome Completo *</Label>
                    <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Nome do paciente" />
                  </div>
                  <div>
                    <Label>CPF</Label>
                    <Input value={form.cpf} onChange={e => set("cpf", e.target.value)} placeholder="000.000.000-00" />
                  </div>
                  <div>
                    <Label>Data de Nascimento</Label>
                    <Input type="date" value={form.birth_date} onChange={e => set("birth_date", e.target.value)} />
                  </div>
                  <div>
                    <Label>Gênero</Label>
                    <Select value={form.gender || ""} onValueChange={v => set("gender", v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="feminino">Feminino</SelectItem>
                        <SelectItem value="nao-binario">Não-binário</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                        <SelectItem value="prefiro-nao-informar">Prefiro não informar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={form.status || "active"} onValueChange={v => set("status", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contato" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Telefone</Label>
                    <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <Label>E-mail</Label>
                    <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@exemplo.com" />
                  </div>
                  <div className="col-span-2">
                    <Label>Endereço</Label>
                    <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Endereço completo" />
                  </div>
                  <div className="col-span-2">
                    <Label>Contato de Emergência</Label>
                    <Input value={form.emergency_contact} onChange={e => set("emergency_contact", e.target.value)} placeholder="Nome e telefone" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="clinico" className="space-y-4 mt-4">
                <div>
                  <Label>Histórico de Saúde</Label>
                  <Textarea value={form.health_history} onChange={e => set("health_history", e.target.value)} placeholder="Histórico médico relevante..." rows={3} />
                </div>
                <div>
                  <Label>Medicações em Uso</Label>
                  <Textarea value={form.medications} onChange={e => set("medications", e.target.value)} placeholder="Medicações atuais..." rows={2} />
                </div>
                <div>
                  <Label>Alergias</Label>
                  <Textarea value={form.allergies} onChange={e => set("allergies", e.target.value)} placeholder="Alergias conhecidas..." rows={2} />
                </div>
                <div>
                  <Label>Notas Clínicas</Label>
                  <Textarea value={form.clinical_notes} onChange={e => set("clinical_notes", e.target.value)} placeholder="Observações clínicas iniciais..." rows={3} />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={createPatient.isPending || !form.name?.trim()}>
                {createPatient.isPending ? "Salvando..." : "Cadastrar Paciente"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, CPF ou e-mail..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" size="icon"><Filter className="w-4 h-4" /></Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : patients.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">Nenhum paciente encontrado</p>
          <p className="text-sm mt-1">Cadastre seu primeiro paciente clicando no botão acima.</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Paciente</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Contato</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Nascimento</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Gênero</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {patients.map((p, i) => (
                <motion.tr key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="hover:bg-muted/30 transition-colors cursor-pointer">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-secondary-foreground">{p.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.cpf || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{p.phone || "—"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">
                    {p.birth_date ? new Date(p.birth_date).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{p.gender || "—"}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${p.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {p.status === "active" ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded hover:bg-muted transition-colors">
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Edit className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(p.id)}>
                          <Trash2 className="w-4 h-4 mr-2" />Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletePatient.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
