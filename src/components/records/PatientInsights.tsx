import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { recordsApi } from "@/lib/recordsApi";
import { useAiAgents, useAnalyzeText } from "@/hooks/useAi";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Sparkles, Brain, FileText, Tag, TrendingUp, AlertTriangle,
  Loader2, Copy, ClipboardCheck, CalendarPlus, Send, Lightbulb,
  Target, MessageSquare, RefreshCw, BarChart, History, Zap
} from "lucide-react";
import { toast } from "sonner";

interface PatientInsightsProps {
  patientId: string;
  patientName: string;
  onSendTest?: () => void;
  onScheduleSession?: () => void;
}

export default function PatientInsights({
  patientId,
  patientName,
  onSendTest,
  onScheduleSession,
}: PatientInsightsProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>("default");
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const { data: agents = [] } = useAiAgents();
  const analyzeMutation = useAnalyzeText();

  // Patient records (sessions)
  const { data: records = [], isLoading } = useQuery({
    queryKey: ["prontuarios", patientId],
    queryFn: () => recordsApi.listAll({ patientId }),
    enabled: !!patientId,
  });

  // Patient timeline (themes & frequency)
  const { data: timeline } = useQuery({
    queryKey: ["patient-timeline", patientId],
    queryFn: () => recordsApi.patientTimeline(patientId),
    enabled: !!patientId,
  });

  // Aggregated insights — patient-only
  const insights = useMemo(() => {
    const totalSessions = records.length;
    const withAi = records.filter((r: any) => r.aiContent || r.aiClinicalSupport).length;
    const themes = timeline?.themes || [];
    const topThemes = themes.slice(0, 6);

    const lastRecord = records[0];
    const sessionsWithEvolution = records.filter((r: any) => r.evolution).length;
    const sessionsWithNextSteps = records.filter((r: any) => r.nextSteps).length;
    const incomplete = records.filter((r: any) => !r.complaint && !r.keyPoints && !r.evolution).length;

    // Timeline of recent observations
    const recentEvolution = records
      .filter((r: any) => r.evolution || r.nextSteps)
      .slice(0, 3);

    return {
      totalSessions,
      withAi,
      topThemes,
      lastRecord,
      sessionsWithEvolution,
      sessionsWithNextSteps,
      incomplete,
      recentEvolution,
    };
  }, [records, timeline]);

  const generateFocusSummary = async () => {
    if (records.length === 0) {
      toast.error("Este paciente ainda não possui sessões para analisar");
      return;
    }

    // Build context from patient's records
    const sessionsContext = records.slice(0, 10).map((r: any, i: number) => {
      const date = format(new Date(r.date), "dd/MM/yyyy", { locale: ptBR });
      return `### Sessão ${i + 1} — ${date}
${r.complaint ? `Queixa: ${r.complaint}` : ""}
${r.keyPoints ? `Pontos-chave: ${r.keyPoints}` : ""}
${r.clinicalObservations ? `Observações: ${r.clinicalObservations}` : ""}
${r.evolution ? `Evolução: ${r.evolution}` : ""}
${r.nextSteps ? `Próximos passos: ${r.nextSteps}` : ""}
${r.themes?.length ? `Temas: ${r.themes.join(", ")}` : ""}`;
    }).join("\n\n");

    const prompt = `Paciente: ${patientName}
Total de sessões registradas: ${records.length}
Temas recorrentes: ${insights.topThemes.map((t: any) => t.name).join(", ") || "não identificados"}

Histórico das sessões recentes:
${sessionsContext}

Com base neste histórico, forneça um RESUMO CLÍNICO ESTRATÉGICO em português para apoiar o psicólogo:

1. **Estado atual** — onde o paciente está agora
2. **Padrões observados** — o que se repete nas sessões
3. **Evolução percebida** — sinais de melhora ou piora
4. **Pontos de atenção** — o que merece cuidado
5. **Foco sugerido para próxima sessão** — temas concretos para abordar
6. **Perguntas que o psicólogo poderia explorar**

Seja objetivo, clínico e prático. Lembre-se: este é apoio organizacional, não diagnóstico.`;

    try {
      const result = await analyzeMutation.mutateAsync({
        text: prompt,
        agentId: selectedAgentId === "default" ? undefined : selectedAgentId,
        type: "patient-focus",
      });
      setAiSummary(result.analysis);
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar resumo");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Patient context header */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                Inteligência Clínica
              </p>
              <h3 className="text-xl font-display font-bold text-foreground">
                Insights de {patientName}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                Visão consolidada das sessões, temas recorrentes e ações sugeridas para apoiar o atendimento.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {onScheduleSession && (
                <Button variant="outline" size="sm" onClick={onScheduleSession} className="gap-1.5">
                  <CalendarPlus className="w-4 h-4" /> Agendar Sessão
                </Button>
              )}
              {onSendTest && (
                <Button variant="outline" size="sm" onClick={onSendTest} className="gap-1.5">
                  <Send className="w-4 h-4" /> Enviar Teste
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick KPIs — patient only */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Sessões</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{insights.totalSessions}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Com IA</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{insights.withAi}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Evoluções</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{insights.sessionsWithEvolution}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span className="text-xs text-muted-foreground">Incompletas</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{insights.incomplete}</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Focus Summary */}
      <Card className="border-primary/30 shadow-glow/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Resumo Estratégico com IA
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Selecione um prompt especialista e gere um resumo clínico para preparar a próxima sessão.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Prompt Especialista</label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o prompt..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Padrão do Sistema (Resumo Clínico Geral)</SelectItem>
                  {agents.filter(a => a.isActive).map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={generateFocusSummary}
              disabled={analyzeMutation.isPending || records.length === 0}
              className="gradient-primary border-0"
            >
              {analyzeMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analisando...</>
              ) : aiSummary ? (
                <><RefreshCw className="w-4 h-4 mr-2" /> Gerar Novo Resumo</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Gerar Resumo</>
              )}
            </Button>
          </div>

          {selectedAgentId !== "default" && (
            <div className="text-[11px] italic text-muted-foreground p-2 rounded bg-muted/40 border border-border">
              {agents.find(a => a.id === selectedAgentId)?.description || "Análise personalizada selecionada."}
            </div>
          )}

          {aiSummary && (
            <div className="rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Resumo da IA</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5"
                  onClick={() => {
                    navigator.clipboard.writeText(aiSummary);
                    toast.success("Resumo copiado!");
                  }}
                >
                  <Copy className="w-3.5 h-3.5" /> Copiar
                </Button>
              </div>
              <ScrollArea className="max-h-[400px]">
                <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed prose prose-sm max-w-none">
                  {aiSummary}
                </div>
              </ScrollArea>
              <div className="flex items-start gap-1.5 pt-2 border-t border-primary/10">
                <AlertTriangle className="w-3 h-3 text-warning mt-0.5 shrink-0" />
                <p className="text-[10px] text-muted-foreground italic">
                  Esta análise é apoio organizacional. Não constitui diagnóstico — o psicólogo revisa e valida todas as informações.
                </p>
              </div>
            </div>
          )}

          {!aiSummary && records.length === 0 && (
            <div className="text-center py-6 text-sm text-muted-foreground">
              <ClipboardCheck className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              Registre pelo menos uma sessão para gerar um resumo.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recurring themes — patient-specific */}
      {insights.topThemes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Temas Recorrentes nas Sessões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights.topThemes.map((theme: any, i: number) => {
                const max = insights.topThemes[0].count;
                const pct = (theme.count / max) * 100;
                return (
                  <div key={theme.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground font-medium capitalize">{theme.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {theme.count} {theme.count === 1 ? "sessão" : "sessões"}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent evolution snippets */}
      {insights.recentEvolution.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Últimas Evoluções e Próximos Passos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.recentEvolution.map((r: any) => (
              <div key={r.id} className="border-l-2 border-primary/30 pl-3 py-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px]">
                    {format(new Date(r.date), "dd/MM/yyyy", { locale: ptBR })}
                  </Badge>
                </div>
                {r.evolution && (
                  <p className="text-sm text-foreground line-clamp-2 mb-1">
                    <span className="text-xs text-primary font-semibold">Evolução: </span>
                    {r.evolution}
                  </p>
                )}
                {r.nextSteps && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    <span className="text-xs text-primary font-semibold">Próximos passos: </span>
                    {r.nextSteps}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {records.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="w-10 h-10 text-muted-foreground mb-3" />
            <h3 className="font-semibold text-foreground">Nenhuma sessão registrada ainda</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Os insights aparecerão aqui assim que houver prontuários de {patientName}.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
