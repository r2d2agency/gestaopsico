import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Heart, Plus, FileText, Trash2, Loader2, ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { casaisApi, prontuariosApi, type Casal } from "@/lib/api";
import { usePatients } from "@/hooks/usePatients";

export default function CasaisPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [selectedCouple, setSelectedCouple] = useState<Casal | null>(null);
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [coupleName, setCoupleName] = useState("");
  const [recordContent, setRecordContent] = useState("");
  const [recordType, setRecordType] = useState("couple_session");

  const { data: couples = [], isLoading } = useQuery<Casal[]>({
    queryKey: ["couples"],
    queryFn: () => casaisApi.list(),
  });

  const { data: patients = [] } = usePatients();

  const { data: coupleRecords = [] } = useQuery({
    queryKey: ["couple-records", selectedCouple?.id],
    queryFn: () => casaisApi.records(selectedCouple!.id),
    enabled: !!selectedCouple,
  });

  const createCoupleMutation = useMutation({
    mutationFn: () => casaisApi.create({ patient1_id: p1, patient2_id: p2, name: coupleName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["couples"] });
      toast({ title: "Casal cadastrado!" });
      setDialogOpen(false);
      setP1(""); setP2(""); setCoupleName("");
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const createRecordMutation = useMutation({
    mutationFn: () => prontuariosApi.create({
      coupleId: selectedCouple!.id,
      type: recordType,
      content: recordContent,
      date: new Date().toISOString().slice(0, 10),
    } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["couple-records"] });
      toast({ title: "Prontuário do casal criado!" });
      setRecordOpen(false);
      setRecordContent("");
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const patientList = Array.isArray(patients) ? patients : (patients as any)?.data || [];
  const coupleList = Array.isArray(couples) ? couples : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Casais</h1>
          <p className="text-muted-foreground mt-1">Gerencie casais e prontuários de terapia de casal</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
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
            <Button className="mt-3" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />Cadastrar Casal
            </Button>
          </div>
        ) : coupleList.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedCouple(c)}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Heart className="w-4 h-4 text-primary" />
                    {c.name || "Casal"}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-xs">{c.patient1?.name}</Badge>
                  <span className="text-xs text-muted-foreground">&</span>
                  <Badge variant="outline" className="text-xs">{c.patient2?.name}</Badge>
                </div>
                <Button size="sm" variant="outline" className="w-full gap-2" onClick={(e) => { e.stopPropagation(); setSelectedCouple(c); }}>
                  <ClipboardList className="w-3.5 h-3.5" />Prontuários do Casal
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Couple Records Panel */}
      {selectedCouple && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  Prontuário: {selectedCouple.name || `${selectedCouple.patient1?.name} & ${selectedCouple.patient2?.name}`}
                </CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelectedCouple(null)}>Fechar</Button>
                  <Button size="sm" onClick={() => { setRecordContent(""); setRecordOpen(true); }}>
                    <Plus className="w-4 h-4 mr-1" />Novo Registro
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Pacientes: {selectedCouple.patient1?.name} e {selectedCouple.patient2?.name}
              </p>
            </CardHeader>
            <CardContent>
              {(Array.isArray(coupleRecords) ? coupleRecords : []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhum registro encontrado para este casal</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(Array.isArray(coupleRecords) ? coupleRecords : []).map((r: any) => (
                    <div key={r.id} className="p-4 bg-muted/50 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs">{r.type === "couple_session" ? "Sessão de Casal" : r.type === "couple_note" ? "Nota do Casal" : r.type}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(r.date || r.createdAt).toLocaleDateString("pt-BR")}</span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{r.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* New Couple Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Casal</DialogTitle>
            <DialogDescription>Selecione os dois pacientes para vincular como casal</DialogDescription>
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => createCoupleMutation.mutate()} disabled={createCoupleMutation.isPending || !p1 || !p2}>
              {createCoupleMutation.isPending ? "Salvando..." : "Cadastrar Casal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Record Dialog */}
      <Dialog open={recordOpen} onOpenChange={setRecordOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Registro do Casal</DialogTitle>
            <DialogDescription>Adicione um registro ao prontuário do casal</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Tipo de Registro</Label>
              <Select value={recordType} onValueChange={setRecordType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="couple_session">Sessão de Casal</SelectItem>
                  <SelectItem value="couple_note">Nota Clínica do Casal</SelectItem>
                  <SelectItem value="couple_plan">Plano Terapêutico</SelectItem>
                  <SelectItem value="couple_evolution">Evolução</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conteúdo</Label>
              <Textarea
                value={recordContent}
                onChange={e => setRecordContent(e.target.value)}
                rows={8}
                placeholder="Descreva observações da sessão, dinâmicas do casal, intervenções realizadas..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordOpen(false)}>Cancelar</Button>
            <Button onClick={() => createRecordMutation.mutate()} disabled={createRecordMutation.isPending || !recordContent.trim()}>
              {createRecordMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salvar Registro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
