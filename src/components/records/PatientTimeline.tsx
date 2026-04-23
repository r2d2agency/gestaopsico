import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { recordsApi, type PatientTimeline as TimelineData, type PatientAnalysis } from "@/lib/recordsApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Brain, TrendingUp, AlertTriangle, Tag, Calendar, FileText, Sparkles, User, Clock, Video, CheckCircle2, XCircle } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  patients: any[];
  selectedPatientId: string;
  onSelectPatient: (id: string) => void;
  appointments?: any[];
}

export default function PatientTimeline({ patients, selectedPatientId, onSelectPatient, appointments = [] }: Props) {
  const [analysis, setAnalysis] = useState<PatientAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [selectedForBilling, setSelectedForBilling] = useState<string[]>([]);

  const { data: timeline, isLoading } = useQuery({
    queryKey: ["patient-timeline", selectedPatientId],
    queryFn: () => recordsApi.patientTimeline(selectedPatientId),
    enabled: !!selectedPatientId,
  });

  const handleAnalysis = async () => {
    if (!selectedPatientId) return;
    setAnalysisLoading(true);
    try {
      const result = await recordsApi.patientAnalysis(selectedPatientId);
      setAnalysis(result);
      toast.success("Análise evolutiva gerada!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar análise");
    } finally { setAnalysisLoading(false); }
  };

  const upcomingApts = appointments.filter(a => {
    const aptDate = new Date(a.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return aptDate >= today && a.status !== "cancelled" && a.status !== "completed";
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const billableSessions = appointments.filter(a => 
    (a.status === "completed" || a.attended === true) && a.payment_status === "pending"
  );

  const totalBilling = billableSessions
    .filter(s => selectedForBilling.includes(s.id))
    .reduce((acc, s) => acc + (s.value || 0), 0);

  const handleCloseBilling = () => {
    if (selectedForBilling.length === 0) {
      toast.error("Selecione pelo menos uma sessão para faturar");
      return;
    }
    const dates = billableSessions
      .filter(s => selectedForBilling.includes(s.id))
      .map(s => format(new Date(s.date), "dd/MM"))
      .join(", ");
    
    toast.success(`Faturamento de R$ ${(totalBilling / 100).toFixed(2)} gerado para as sessões: ${dates}`);
    // Here we would call an API to generate the invoice
    setSelectedForBilling([]);
  };

  return (
    <div className="space-y-4">
      {/* Patient selector */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Select value={selectedPatientId || "_none"} onValueChange={(v) => { onSelectPatient(v === "_none" ? "" : v); setAnalysis(null); }}>
            <SelectTrigger><SelectValue placeholder="Selecione um paciente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Selecione um paciente</SelectItem>
              {patients.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {selectedPatientId && timeline && timeline.totalSessions >= 2 && (
          <Button variant="outline" className="text-primary border-primary/30" onClick={handleAnalysis} disabled={analysisLoading}>
            <Brain className="w-4 h-4 mr-1" /> {analysisLoading ? "Analisando..." : "Análise Evolutiva IA"}
          </Button>
        )}
      </div>

      {!selectedPatientId && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <User className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-foreground">Selecione um paciente</h3>
            <p className="text-muted-foreground text-sm mt-1">Escolha um paciente para ver sua linha do tempo e evolução.</p>
          </CardContent>
        </Card>
      )}

      {selectedPatientId && isLoading && (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}</div>
      )}

      {timeline && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-primary">{timeline.totalSessions}</p>
                <p className="text-xs text-muted-foreground">Sessões registradas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-primary">{timeline.themes.length}</p>
                <p className="text-xs text-muted-foreground">Temas identificados</p>
              </CardContent>
            </Card>
            {timeline.records.length > 0 && (
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-sm font-medium text-primary">
                    {format(new Date(timeline.records[0].date), "MMM yyyy", { locale: ptBR })} →{" "}
                    {format(new Date(timeline.records[timeline.records.length - 1].date), "MMM yyyy", { locale: ptBR })}
                  </p>
                  <p className="text-xs text-muted-foreground">Período</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Themes Map */}
          {timeline.themes.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5"><Tag className="w-4 h-4 text-primary" /> Mapa de Temas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {timeline.themes.map(({ name, count }) => (
                    <Badge key={name} variant="secondary" className="text-xs">
                      {name} <span className="ml-1 text-primary font-bold">{count}</span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Analysis */}
          {analysis && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary" /> Análise Evolutiva IA
                  </CardTitle>
                  <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3 h-3" /> {analysis.disclaimer}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {analysis.analysis.overallProgress && (
                    <div><Label className="text-xs text-muted-foreground">Progresso Geral</Label><p>{analysis.analysis.overallProgress}</p></div>
                  )}
                  {analysis.analysis.emotionalEvolution && (
                    <div><Label className="text-xs text-muted-foreground">Evolução Emocional</Label><p>{analysis.analysis.emotionalEvolution}</p></div>
                  )}
                  {analysis.analysis.identifiedPatterns && analysis.analysis.identifiedPatterns.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Padrões Identificados</Label>
                      <ul className="list-disc pl-4 space-y-1">{analysis.analysis.identifiedPatterns.map((p, i) => <li key={i}>{p}</li>)}</ul>
                    </div>
                  )}
                  {analysis.analysis.attentionPoints && analysis.analysis.attentionPoints.length > 0 && (
                    <div>
                      <Label className="text-xs text-amber-600">⚠️ Pontos de Atenção</Label>
                      <ul className="list-disc pl-4 space-y-1">{analysis.analysis.attentionPoints.map((p, i) => <li key={i}>{p}</li>)}</ul>
                    </div>
                  )}
                  {analysis.analysis.rawText && <div className="whitespace-pre-wrap">{analysis.analysis.rawText}</div>}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Timeline */}
          <div className="space-y-6">
            <h3 className="font-semibold text-foreground flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Evolução e Agendamentos</h3>
            <div className="relative pl-6 border-l-2 border-primary/20 space-y-6">
              {/* Combine records and possibly future appointments if we had them here */}
              {timeline.records.map((record, i) => (
                <motion.div key={record.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="relative"
                >
                  <div className={`absolute -left-[calc(1.5rem+6px)] w-3 h-3 rounded-full border-2 border-background ${
                    record.appointment?.id ? "bg-success" : "bg-primary"
                  }`} />
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-primary">
                            {format(new Date(record.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </span>
                          {record.appointment?.time && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {record.appointment.time}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {record.appointment?.mode === "video" && (
                            <Badge variant="secondary" className="text-[10px] py-0 gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">
                              <Video className="w-3 h-3" /> Online
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] py-0">
                            {record.type === "couple" ? "Casal" : "Individual"}
                          </Badge>
                        </div>
                      </div>
                      
                      {record.appointment?.id && (
                        <div className="mb-2 p-2 bg-muted/30 rounded-lg border border-border/50">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Sessão Realizada</span>
                            <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/20 py-0">Compareceu</Badge>
                          </div>
                        </div>
                      )}

                      {record.complaint && <p className="text-sm font-semibold text-foreground">{record.complaint}</p>}
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        {record.keyPoints || record.content || "Nenhum detalhe registrado."}
                      </p>
                      
                      {record.evolution && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <p className="text-[11px] font-medium text-primary uppercase flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> Evolução:
                          </p>
                          <p className="text-xs text-muted-foreground italic">{record.evolution}</p>
                        </div>
                      )}

                      {record.themes && record.themes.length > 0 && (
                        <div className="flex gap-1 mt-2.5 flex-wrap">
                          {record.themes.map(t => <Badge key={t} variant="secondary" className="text-[10px] py-0">{t}</Badge>)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
