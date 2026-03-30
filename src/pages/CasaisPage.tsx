import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Plus, ClipboardList } from "lucide-react";
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { casaisApi, type Casal } from "@/lib/api";
import { usePatients } from "@/hooks/usePatients";

export default function CasaisPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [coupleName, setCoupleName] = useState("");

  const { data: couples = [], isLoading } = useQuery<Casal[]>({
    queryKey: ["couples"],
    queryFn: () => casaisApi.list(),
  });

  const { data: patients = [] } = usePatients();

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

  const patientList = Array.isArray(patients) ? patients : (patients as any)?.data || [];
  const coupleList = Array.isArray(couples) ? couples : [];

  const handleOpenRecords = (c: Casal) => {
    const name = c.name || `${c.patient1?.name} & ${c.patient2?.name}`;
    navigate(`/prontuario?coupleId=${c.id}&coupleName=${encodeURIComponent(name)}`);
  };

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
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleOpenRecords(c)}>
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
                <Button size="sm" variant="outline" className="w-full gap-2" onClick={(e) => { e.stopPropagation(); handleOpenRecords(c); }}>
                  <ClipboardList className="w-3.5 h-3.5" />Prontuários do Casal
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

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
    </div>
  );
}
