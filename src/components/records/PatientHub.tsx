import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { recordsApi } from "@/lib/recordsApi";
import { moodApi } from "@/lib/portalApi";
import { pacientesApi, consultasApi, type Patient, type Consulta } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Activity, AlertTriangle, Brain, Calendar, CheckCircle2, ChevronRight,
  Clock, FileText, Flame, Heart, Lightbulb, Medal, Smile, Sparkles,
  Target, TrendingUp, User, Video, XCircle, Zap, BookOpen, Frown, Meh
} from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  patientId: string;
  patientName: string;
  onNavigate?: (tab: string) => void;
}

const MOOD_LABELS = ["", "Muito ruim", "Ruim", "Neutro", "Bom", "Ótimo"];
const MOOD_ICONS = [null, Frown, Frown, Meh, Smile, Smile];
const MOOD_COLORS = ["", "text-destructive", "text-orange-500", "text-amber-500", "text-emerald-500", "text-emerald-600"];

export default function PatientHub({ patientId, patientName, onNavigate }: Props) {
  // Patient details
  const { data: patient } = useQuery<Patient>({
    queryKey: ["patient", patientId],
    queryFn: () => pacientesApi.get(patientId),
    enabled: !!patientId,
  });

  // Timeline (records + themes)
  const { data: timeline } = useQuery({
    queryKey: ["patient-timeline", patientId],
    queryFn: () => recordsApi.patientTimeline(patientId),
    enabled: !!patientId,
  });

  // Appointments
  const { data: allApts = [] } = useQuery<Consulta[]>({
    queryKey: ["patient-appointments-hub", patientId],
    queryFn: () => consultasApi.list({}),
    enabled: !!patientId,
  });

  // Mood
  const { data: moodData } = useQuery({
    queryKey: ["patient-mood-hub", patientId],
    queryFn: () => moodApi.patientMood(patientId, 30),
    enabled: !!patientId,
  });

  const apts = useMemo(
    () => allApts.filter((a: any) => a.patientId === patientId || a.patient?.id === patientId || a.patient_id === patientId),
    [allApts, patientId]
  );

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completed = apts.filter((a: any) => a.status === "completed" || a.attended === true);
    const cancelled = apts.filter((a: any) => a.status === "cancelled");
    const upcoming = apts
      .filter((a: any) => new Date(a.date) >= today && a.status !== "cancelled" && a.status !== "completed")
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const past = apts
      .filter((a: any) => new Date(a.date) < today || a.status === "completed")
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const lastApt = past[0];
    const nextApt = upcoming[0];
    const totalSessions = timeline?.totalSessions ?? completed.length;
    const adherenceRate = apts.length > 0 ? Math.round((completed.length / apts.length) * 100) : 0;

    // Frequency
    let avgDaysBetween = 0;
    if (completed.length >= 2) {
      const sorted = [...completed].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const first = new Date(sorted[0].date);
      const last = new Date(sorted[sorted.length - 1].date);
      avgDaysBetween = Math.round(differenceInDays(last, first) / (sorted.length - 1));
    }

    return {
      completed: completed.length,
      cancelled: cancelled.length,
      upcoming,
      past,
      lastApt,
      nextApt,
      totalSessions,
      adherenceRate,
      avgDaysBetween,
    };
  }, [apts, timeline]);

  // Calculate care level (based on adherence + last mood + missed sessions)
  const careLevel = useMemo(() => {
    let score = 0; // 0=normal, 1=attention, 2=critical
    if (stats.cancelled > 2) score++;
    if (stats.adherenceRate < 70 && apts.length >= 3) score++;
    if (moodData?.entries?.[0]?.mood && moodData.entries[0].mood <= 2) score++;
    return Math.min(2, score);
  }, [stats, moodData, apts]);

  // Latest record for current focus / phase
  const latestRecord = timeline?.records?.[0];
  const lastMood = moodData?.entries?.[0];
  const MoodIcon = lastMood?.mood ? MOOD_ICONS[lastMood.mood] : null;

  // Treatment frequency
  const frequencyText = stats.avgDaysBetween > 0
    ? stats.avgDaysBetween <= 8 ? "Semanal" 
    : stats.avgDaysBetween <= 16 ? "Quinzenal" 
    : stats.avgDaysBetween <= 35 ? "Mensal" 
    : `~${stats.avgDaysBetween} dias`
    : "Indefinida";

  // Top themes for focuses
  const topThemes = timeline?.themes?.slice(0, 6) ?? [];
  const primaryFocus = topThemes[0]?.name;

  // Build attention points heuristically
  const attentionPoints = useMemo(() => {
    const points: { label: string; severity: "low" | "med" | "high" }[] = [];
    if (stats.cancelled >= 2) points.push({ label: `${stats.cancelled} cancelamentos no histórico`, severity: "med" });
    if (stats.adherenceRate < 70 && apts.length >= 3) points.push({ label: `Adesão baixa (${stats.adherenceRate}%)`, severity: "high" });
    if (lastMood?.mood && lastMood.mood <= 2) points.push({ label: `Último humor: ${MOOD_LABELS[lastMood.mood]}`, severity: "high" });
    if (lastMood?.anxietyLevel && lastMood.anxietyLevel >= 4) points.push({ label: "Nível elevado de ansiedade", severity: "med" });
    if (stats.lastApt && differenceInDays(new Date(), new Date(stats.lastApt.date)) > 30) {
      points.push({ label: "Sem sessão há mais de 30 dias", severity: "med" });
    }
    if (topThemes.some(t => /ansied|panico|crise/i.test(t.name))) points.push({ label: "Tema recorrente: ansiedade", severity: "low" });
    return points;
  }, [stats, lastMood, topThemes, apts]);

  const startDate = patient?.created_at ? new Date(patient.created_at) : null;
  const monthsInTreatment = startDate ? Math.max(1, Math.round(differenceInDays(new Date(), startDate) / 30)) : 0;

  // Build chronological timeline events
  const timelineEvents = useMemo(() => {
    type Evt = { id: string; date: string; type: "session" | "mood" | "missed" | "ai" | "appointment"; title: string; subtitle?: string; icon: any; color: string };
    const evts: Evt[] = [];

    timeline?.records?.forEach(r => {
      evts.push({
        id: `r-${r.id}`,
        date: r.date,
        type: r.aiContent || r.aiClinicalSupport ? "ai" : "session",
        title: r.complaint || "Sessão registrada",
        subtitle: r.keyPoints?.slice(0, 100) || r.evolution?.slice(0, 100),
        icon: r.aiContent ? Brain : FileText,
        color: r.aiContent ? "text-primary" : "text-foreground",
      });
    });

    moodData?.entries?.slice(0, 10).forEach(m => {
      evts.push({
        id: `m-${m.id}`,
        date: m.date || m.createdAt,
        type: "mood",
        title: `Humor: ${MOOD_LABELS[m.mood] || "—"}`,
        subtitle: m.notes?.slice(0, 80),
        icon: Heart,
        color: MOOD_COLORS[m.mood] || "text-muted-foreground",
      });
    });

    apts.filter((a: any) => a.status === "cancelled").slice(0, 5).forEach((a: any) => {
      evts.push({
        id: `c-${a.id}`,
        date: a.date,
        type: "missed",
        title: "Sessão cancelada",
        subtitle: a.notes,
        icon: XCircle,
        color: "text-destructive",
      });
    });

    stats.upcoming.slice(0, 3).forEach((a: any) => {
      evts.push({
        id: `u-${a.id}`,
        date: a.date,
        type: "appointment",
        title: `Próxima sessão • ${a.time}`,
        subtitle: a.mode === "video" ? "Online" : "Presencial",
        icon: Calendar,
        color: "text-primary",
      });
    });

    return evts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 14);
  }, [timeline, moodData, apts, stats]);

  return (
    <div className="space-y-6">
      {/* ====== CABEÇALHO CLÍNICO ====== */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden border-border/60">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 border-b border-border/40">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-2xl font-display font-bold shadow-lg shadow-primary/20">
                    {patientName.split(" ").map(n => n[0]).slice(0, 2).join("")}
                  </div>
                  {careLevel === 2 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive border-2 border-background flex items-center justify-center">
                      <AlertTriangle className="w-3 h-3 text-destructive-foreground" />
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-display font-bold text-foreground">{patientName}</h2>
                    <Badge variant={patient?.status === "active" ? "default" : "secondary"} className="text-[10px]">
                      {patient?.status === "active" ? "Em acompanhamento" : "Inativo"}
                    </Badge>
                    {careLevel >= 1 && (
                      <Badge variant={careLevel === 2 ? "destructive" : "outline"} className="text-[10px] gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {careLevel === 2 ? "Atenção crítica" : "Requer atenção"}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> Atendimento individual</span>
                    {monthsInTreatment > 0 && (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {monthsInTreatment} {monthsInTreatment === 1 ? "mês" : "meses"} em acompanhamento</span>
                    )}
                    <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> Frequência {frequencyText.toLowerCase()}</span>
                  </div>
                </div>
              </div>

              {/* Última e próxima */}
              <div className="grid grid-cols-2 gap-3 lg:min-w-[320px]">
                <div className="p-3 rounded-xl bg-background/60 border border-border/40">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Última sessão</p>
                  <p className="text-sm font-semibold text-foreground">
                    {stats.lastApt ? format(new Date(stats.lastApt.date), "dd 'de' MMM", { locale: ptBR }) : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {stats.lastApt ? `há ${differenceInDays(new Date(), new Date(stats.lastApt.date))} dias` : "Sem registro"}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <p className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-1">Próxima sessão</p>
                  <p className="text-sm font-semibold text-foreground">
                    {stats.nextApt ? format(new Date(stats.nextApt.date), "dd 'de' MMM", { locale: ptBR }) : "Não agendada"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {stats.nextApt ? `${stats.nextApt.time} • ${stats.nextApt.mode === "video" ? "Online" : "Presencial"}` : "Agende uma nova"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ====== KPI CARDS ====== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={CheckCircle2} label="Sessões" value={stats.totalSessions} accent="primary" />
        <KpiCard icon={XCircle} label="Faltas/Cancel." value={stats.cancelled} accent={stats.cancelled > 2 ? "destructive" : "muted"} />
        <KpiCard
          icon={MoodIcon || Smile}
          label="Último humor"
          value={lastMood ? MOOD_LABELS[lastMood.mood] : "—"}
          accent={lastMood?.mood && lastMood.mood >= 4 ? "success" : lastMood?.mood && lastMood.mood <= 2 ? "destructive" : "muted"}
          isText
        />
        <KpiCard icon={Target} label="Foco principal" value={primaryFocus || "—"} accent="primary" isText />
        <KpiCard icon={Activity} label="Adesão" value={`${stats.adherenceRate}%`} accent={stats.adherenceRate >= 80 ? "success" : "muted"} isText />
        <KpiCard icon={Brain} label="Análises IA" value={timeline?.records?.filter(r => r.aiContent || r.aiClinicalSupport).length || 0} accent="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ====== RESUMO CLÍNICO ====== */}
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Resumo Clínico Atual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!latestRecord ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma sessão registrada ainda. Crie um prontuário para começar a acompanhar a evolução clínica.
              </div>
            ) : (
              <>
                <SummaryRow
                  label="Demanda principal"
                  value={latestRecord.complaint || "Não registrada"}
                  icon={Lightbulb}
                />
                <Separator />
                <SummaryRow
                  label="Fase atual do acompanhamento"
                  value={latestRecord.evolution || latestRecord.keyPoints || "Sem descrição registrada"}
                  icon={TrendingUp}
                />
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Humor predominante</p>
                    <div className="flex items-center gap-2">
                      {MoodIcon ? <MoodIcon className={`w-5 h-5 ${MOOD_COLORS[lastMood!.mood]}`} /> : <Meh className="w-5 h-5 text-muted-foreground" />}
                      <p className="text-sm font-semibold text-foreground">{lastMood ? MOOD_LABELS[lastMood.mood] : "Sem registros"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Próximos passos</p>
                    <p className="text-sm text-foreground line-clamp-2">{latestRecord.nextSteps || "A definir"}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ====== PONTOS DE ATENÇÃO ====== */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Pontos de Atenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attentionPoints.length === 0 ? (
              <div className="py-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum ponto de atenção identificado.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {attentionPoints.map((p, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex items-start gap-2 p-2 rounded-lg border ${
                      p.severity === "high"
                        ? "bg-destructive/5 border-destructive/20"
                        : p.severity === "med"
                        ? "bg-amber-500/5 border-amber-500/20"
                        : "bg-muted/40 border-border/40"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                      p.severity === "high" ? "bg-destructive" : p.severity === "med" ? "bg-amber-500" : "bg-muted-foreground"
                    }`} />
                    <span className="text-xs text-foreground">{p.label}</span>
                  </motion.li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ====== FOCOS TERAPÊUTICOS ====== */}
      <Card className="border-border/60">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" /> Focos Terapêuticos
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">{topThemes.length} temas mapeados</Badge>
        </CardHeader>
        <CardContent>
          {topThemes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Os focos terapêuticos serão identificados conforme as sessões forem organizadas com IA.
            </p>
          ) : (
            <div className="space-y-3">
              {primaryFocus && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Flame className="w-4 h-4 text-primary" />
                    <p className="text-[10px] uppercase tracking-wider text-primary font-bold">Foco principal da fase atual</p>
                  </div>
                  <p className="text-base font-semibold text-foreground">{primaryFocus}</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {topThemes.slice(1).map((theme, i) => {
                  const max = topThemes[0]?.count || 1;
                  const pct = (theme.count / max) * 100;
                  return (
                    <div key={theme.name} className="p-2.5 rounded-lg border border-border/40 bg-card">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-foreground">{theme.name}</span>
                        <span className="text-[10px] text-muted-foreground">{theme.count}x</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ====== TIMELINE CLÍNICA ====== */}
      <Card className="border-border/60">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Timeline Clínica
          </CardTitle>
          {onNavigate && (
            <button onClick={() => onNavigate("timeline")} className="text-xs text-primary flex items-center gap-1 hover:underline">
              Ver completa <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </CardHeader>
        <CardContent>
          {timelineEvents.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              A linha do tempo aparecerá conforme você registra sessões, humor e eventos.
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-border/40 space-y-4">
              {timelineEvents.map((evt, i) => {
                const Icon = evt.icon;
                return (
                  <motion.div
                    key={evt.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="relative"
                  >
                    <span className="absolute -left-[calc(1.5rem+5px)] w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
                    <div className="flex items-start justify-between gap-3 group">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`p-1.5 rounded-lg bg-muted/50 ${evt.color} shrink-0`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{evt.title}</p>
                          {evt.subtitle && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{evt.subtitle}</p>}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-1">
                        {format(new Date(evt.date), "dd MMM", { locale: ptBR })}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, accent = "muted", isText = false,
}: {
  icon: any; label: string; value: string | number;
  accent?: "primary" | "success" | "destructive" | "muted"; isText?: boolean;
}) {
  const accentClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    destructive: "bg-destructive/10 text-destructive",
    muted: "bg-muted text-muted-foreground",
  }[accent];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="hover:shadow-md transition-shadow border-border/60 h-full">
        <CardContent className="p-3 flex items-start gap-2.5">
          <div className={`p-1.5 rounded-lg ${accentClasses} shrink-0`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold leading-tight">{label}</p>
            <p className={`font-bold text-foreground mt-0.5 truncate ${isText ? "text-sm" : "text-xl"}`}>{value}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SummaryRow({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-lg bg-primary/5 text-primary shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">{label}</p>
        <p className="text-sm text-foreground leading-relaxed">{value}</p>
      </div>
    </div>
  );
}
