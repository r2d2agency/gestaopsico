import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Plus, ClipboardList, Edit, Trash2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { casaisApi, type Casal } from "@/lib/api";
import { usePatients } from "@/hooks/usePatients";

export default function CasaisPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCouple, setEditCouple] = useState<Casal | null>(null);
  const [deleteCouple, setDeleteCouple] = useState<Casal | null>(null);
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [coupleName, setCoupleName] = useState("");

  const { data: couples = [], isLoading } = useQuery<Casal[]>({
    queryKey: ["couples"],
    queryFn: () => casaisApi.list(),
  });

  const { data: patients = [] } = usePatients();

  const createMutation = useMutation({
    mutationFn: () => casaisApi.create({ patient1_id: p1, patient2_id: p2, name: coupleName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["couples"] });
      toast({ title: "Casal cadastrado!" });
      closeDialog();
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: () => casaisApi.update(editCouple!.id, { patient1_id: p1, patient2_id: p2, name: coupleName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["couples"] });
      toast({ title: "Casal atualizado!" });
      closeDialog();
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => casaisApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["couples"] });
      toast({ title: "Casal removido!" });
      setDeleteCouple(null);
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const patientList = Array.isArray(patients) ? patients : (patients as any)?.data || [];
  const coupleList = Array.isArray(couples) ? couples : [];

  const closeDialog = () => {
    setDialogOpen(false);
    setEditCouple(null);
    setP1(""); setP2(""); setCoupleName("");
  };

  const openEdit = (c: Casal) => {
    setEditCouple(c);
    setP1(c.patient1?.id || "");
    setP2(c.patient2?.id || "");
    setCoupleName(c.name || "");
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditCouple(null);
    setP1(""); setP2(""); setCoupleName("");
    setDialogOpen(true);
  };

  const handleOpenRecords = (c: Casal) => {
    const name = c.name || `${c.patient1?.name} & ${c.patient2?.name}`;
    navigate(`/prontuarios?coupleId=${c.id}&coupleName=${encodeURIComponent(name)}`);
  };

  const isEditing = !!editCouple;
  const isPending = isEditing ? updateMutation.isPending : createMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Casais</h1>
          <p className="text-muted-foreground mt-1">Gerencie casais e prontuários de terapia de casal</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />Novo Casal
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [1, 2, 3].map(i => <Skeleton key={i} className="h-44 rounded-xl" />)
        ) : coupleList.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Heart className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Nenhum casal cadastrado</p>
            <p className="text-sm mt-1">Vincule dois pacientes para criar um casal</p>
            <Button className="mt-3" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />Cadastrar Casal
            </Button>
          </div>
        ) : coupleList.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2 cursor-pointer" onClick={() => handleOpenRecords(c)}>
                    <Heart className="w-4 h-4 text-primary" />
                    {c.name || "Casal"}
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenRecords(c)}>
                        <ClipboardList className="w-4 h-4 mr-2" />Prontuários
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(c)}>
                        <Edit className="w-4 h-4 mr-2" />Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteCouple(c)}>
                        <Trash2 className="w-4 h-4 mr-2" />Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-xs">{c.patient1?.name}</Badge>
                  <span className="text-xs text-muted-foreground">&</span>
                  <Badge variant="outline" className="text-xs">{c.patient2?.name}</Badge>
                </div>
                <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => handleOpenRecords(c)}>
                  <ClipboardList className="w-3.5 h-3.5" />Prontuários do Casal
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Casal" : "Cadastrar Casal"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Atualize os dados do casal" : "Selecione os dois pacientes para vincular como casal"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome do Casal (opcional)</Label>
              <Input value={coupleName} onChange={e => setCoupleName(e.target.value)} placeholder="Ex: João & Maria" />
            </div>
            <div>
              <Label>Paciente 1 *</Label>
              <Select value={p1} onValueChange={setP1}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {patientList.filter((p: any) => p.id !== p2).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Paciente 2 *</Label>
              <Select value={p2} onValueChange={setP2}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {patientList.filter((p: any) => p.id !== p1).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={() => isEditing ? updateMutation.mutate() : createMutation.mutate()} disabled={isPending || !p1 || !p2}>
              {isPending ? "Salvando..." : isEditing ? "Salvar Alterações" : "Cadastrar Casal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCouple} onOpenChange={(open) => { if (!open) setDeleteCouple(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Casal</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o casal "{deleteCouple?.name || `${deleteCouple?.patient1?.name} & ${deleteCouple?.patient2?.name}`}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteCouple && deleteMutation.mutate(deleteCouple.id)}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
