import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Smile, Frown, Meh, TrendingUp, Calendar, Brain,
  Zap, Moon, BarChart3, Heart
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { moodApi, type MoodEntry, type MoodStats } from "@/lib/portalApi";

const MOODS = [
  { label: "Muito mal", icon: Frown, color: "text-destructive", bg: "bg-destructive" },
  { label: "Mal", icon: Frown, color: "text-warning", bg: "bg-warning" },
  { label: "Neutro", icon: Meh, color: "text-muted-foreground", bg: "bg-muted-foreground" },
  { label: "Bem", icon: Smile, color: "text-success", bg: "bg-success" },
  { label: "Muito bem", icon: Smile, color: "text-primary", bg: "bg-primary" },
];

interface Props {
  patientId: string;
  patientName?: string;
}

export default function MoodDashboard({ patientId, patientName }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["patient-mood", patientId],
    queryFn: () => moodApi.patientMood(patientId, 90),
    enabled: !!patientId,
  });

  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>;
  }

  const entries = data?.entries || [];
  const stats = data?.stats;

  if (!entries.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Smile className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p>Nenhum registro de humor deste paciente</p>
        <p className="text-sm mt-1">O paciente precisa acessar o portal para registrar</p>
      </div>
    );
  }

  const moodDistribution = [0, 0, 0, 0, 0];
  entries.forEach(e => { moodDistribution[e.mood - 1]++; });

  const sortedEmotions = stats?.emotionFrequency
    ? Object.entries(stats.emotionFrequency).sort(([, a], [, b]) => b - a).slice(0, 8)
    : [];

  return (
    <div className="space-y-6">
      {patientName && (
        <h2 className="text-lg font-display font-bold text-foreground">
          Humor de {patientName}
        </h2>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-display font-bold text-foreground">{stats?.avgMood || 0}</p>
            <p className="text-xs text-muted-foreground">Média de humor</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-display font-bold text-foreground">{stats?.totalEntries || 0}</p>
            <p className="text-xs text-muted-foreground">Registros</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-display font-bold text-foreground">{stats?.streak || 0}</p>
            <p className="text-xs text-muted-foreground">Dias seguidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            {(() => {
              const avgIdx = Math.round((stats?.avgMood || 3) - 1);
              const m = MOODS[avgIdx] || MOODS[2];
              const Icon = m.icon;
              return <Icon className={`w-8 h-8 mx-auto ${m.color}`} />;
            })()}
            <p className="text-xs text-muted-foreground mt-1">Tendência</p>
          </CardContent>
        </Card>
      </div>

      {/* Mood Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />Evolução (últimos 90 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-[2px] h-24">
            {entries.map((entry, i) => {
              const m = MOODS[entry.mood - 1];
              return (
                <motion.div
                  key={entry.id}
                  initial={{ height: 0 }}
                  animate={{ height: `${(entry.mood / 5) * 100}%` }}
                  transition={{ delay: i * 0.01 }}
                  className={`flex-1 rounded-t-sm ${m.bg} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
                  title={`${new Date(entry.date).toLocaleDateString("pt-BR")} - ${m.label}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>{entries[0] ? new Date(entries[0].date).toLocaleDateString("pt-BR") : ""}</span>
            <span>{entries[entries.length - 1] ? new Date(entries[entries.length - 1].date).toLocaleDateString("pt-BR") : ""}</span>
          </div>
        </CardContent>
      </Card>

      {/* Distribution + Emotions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />Distribuição
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {MOODS.map((m, i) => {
                const count = moodDistribution[i];
                const pct = entries.length ? (count / entries.length) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <m.icon className={`w-4 h-4 ${m.color} shrink-0`} />
                    <div className="flex-1">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          className={`h-full ${m.bg} rounded-full`}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="w-4 h-4 text-primary" />Emoções mais frequentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {sortedEmotions.map(([emotion, count]) => (
                <Badge key={emotion} variant="outline" className="gap-1">
                  {emotion}
                  <span className="text-[10px] font-bold text-primary">{count}</span>
                </Badge>
              ))}
              {sortedEmotions.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma emoção registrada</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Entries */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />Registros recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {entries.slice(-15).reverse().map(entry => {
              const m = MOODS[entry.mood - 1];
              const Icon = m.icon;
              return (
                <div key={entry.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <Icon className={`w-5 h-5 mt-0.5 ${m.color} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{m.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.date).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    {entry.emotions?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {entry.emotions.map(e => (
                          <span key={e} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{e}</span>
                        ))}
                      </div>
                    )}
                    {entry.notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{entry.notes}</p>
                    )}
                    <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                      {entry.energyLevel && <span className="flex items-center gap-0.5"><Zap className="w-3 h-3" />Energia: {entry.energyLevel}/5</span>}
                      {entry.sleepQuality && <span className="flex items-center gap-0.5"><Moon className="w-3 h-3" />Sono: {entry.sleepQuality}/5</span>}
                      {entry.anxietyLevel && <span className="flex items-center gap-0.5"><Brain className="w-3 h-3" />Ansiedade: {entry.anxietyLevel}/5</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
