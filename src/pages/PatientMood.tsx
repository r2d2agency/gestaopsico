import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Smile, Frown, Meh, Heart, Zap, Moon, Brain, TrendingUp,
  Calendar, Send, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { moodApi, type MoodEntry } from "@/lib/portalApi";

const MOODS = [
  { value: 1, label: "Muito mal", icon: Frown, color: "text-destructive" },
  { value: 2, label: "Mal", icon: Frown, color: "text-warning" },
  { value: 3, label: "Neutro", icon: Meh, color: "text-muted-foreground" },
  { value: 4, label: "Bem", icon: Smile, color: "text-success" },
  { value: 5, label: "Muito bem", icon: Smile, color: "text-primary" },
];

const EMOTIONS = [
  "Ansioso", "Triste", "Feliz", "Irritado", "Calmo", "Estressado",
  "Motivado", "Cansado", "Esperançoso", "Frustrado", "Grato", "Solitário",
  "Confiante", "Preocupado", "Tranquilo", "Eufórico"
];

export default function PatientMood() {
  const qc = useQueryClient();
  const [mood, setMood] = useState(3);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [energy, setEnergy] = useState([3]);
  const [sleep, setSleep] = useState([3]);
  const [anxiety, setAnxiety] = useState([3]);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["mood-history"],
    queryFn: () => moodApi.myHistory(30),
  });

  const submitMutation = useMutation({
    mutationFn: () => moodApi.create({
      mood,
      emotions: selectedEmotions,
      notes: notes || undefined,
      energyLevel: energy[0],
      sleepQuality: sleep[0],
      anxietyLevel: anxiety[0],
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mood-history"] });
      toast({ title: "Humor registrado! 🎉" });
      setNotes("");
      setSelectedEmotions([]);
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const toggleEmotion = (e: string) => {
    setSelectedEmotions(prev =>
      prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]
    );
  };

  const MoodIcon = MOODS[mood - 1]?.icon || Meh;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-display font-bold text-foreground">Como você está agora?</h1>
        <p className="text-muted-foreground mt-1">Registre seu humor a qualquer momento do dia</p>
      </div>

      {/* Mood Selection */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center mb-4">
              <MoodIcon className={`w-16 h-16 ${MOODS[mood - 1]?.color}`} />
            </div>
            <p className="text-center text-lg font-display font-bold text-foreground mb-6">
              {MOODS[mood - 1]?.label}
            </p>
            <div className="flex justify-center gap-4">
              {MOODS.map(m => (
                <button
                  key={m.value}
                  onClick={() => setMood(m.value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                    mood === m.value
                      ? "bg-primary/10 scale-110 shadow-glow"
                      : "hover:bg-muted"
                  }`}
                >
                  <m.icon className={`w-8 h-8 ${mood === m.value ? m.color : "text-muted-foreground"}`} />
                  <span className="text-[10px] text-muted-foreground">{m.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Emotions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Heart className="w-4 h-4 text-primary" />Emoções</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {EMOTIONS.map(e => (
                <Badge
                  key={e}
                  variant={selectedEmotions.includes(e) ? "default" : "outline"}
                  className="cursor-pointer transition-all hover:scale-105"
                  onClick={() => toggleEmotion(e)}
                >
                  {e}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Levels */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardContent className="pt-6 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-warning" />Energia</span>
                <span className="text-sm font-bold text-foreground">{energy[0]}/5</span>
              </div>
              <Slider value={energy} onValueChange={setEnergy} max={5} min={1} step={1} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm flex items-center gap-2"><Moon className="w-4 h-4 text-info" />Sono</span>
                <span className="text-sm font-bold text-foreground">{sleep[0]}/5</span>
              </div>
              <Slider value={sleep} onValueChange={setSleep} max={5} min={1} step={1} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-destructive" />Ansiedade</span>
                <span className="text-sm font-bold text-foreground">{anxiety[0]}/5</span>
              </div>
              <Slider value={anxiety} onValueChange={setAnxiety} max={5} min={1} step={1} />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notes */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardContent className="pt-6">
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Como foi seu dia? O que te marcou? (opcional)"
              rows={3}
            />
          </CardContent>
        </Card>
      </motion.div>

      <Button
        onClick={() => submitMutation.mutate()}
        disabled={submitMutation.isPending}
        className="w-full gap-2 gradient-primary border-0 shadow-glow"
        size="lg"
      >
        {submitMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        Registrar Humor
      </Button>

      {/* History */}
      {history.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <h2 className="font-display font-bold text-foreground mb-3">Últimos registros</h2>
          <div className="space-y-2">
            {history.slice(0, 10).map(entry => {
              const m = MOODS[entry.mood - 1];
              const Icon = m?.icon || Meh;
              const entryDate = new Date(entry.date);
              return (
                <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                  <Icon className={`w-6 h-6 ${m?.color}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{m?.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {entryDate.toLocaleDateString("pt-BR")} às {entryDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      {entry.emotions?.length ? ` · ${entry.emotions.join(", ")}` : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
