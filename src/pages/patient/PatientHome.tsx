import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Smile, Frown, Meh, Send, Loader2,
  ClipboardList, Calendar, CreditCard, Heart,
  Sparkles, Download, X, ListTodo
} from "lucide-react";
import { Link } from "react-router-dom";
import { usePortalSlug } from "@/hooks/usePortalSlug";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { patientPortalApi, moodApi, testsApi, type TestAssignment } from "@/lib/portalApi";

const MOODS = [
  { value: 1, label: "Muito mal", icon: Frown, color: "text-destructive" },
  { value: 2, label: "Mal", icon: Frown, color: "text-warning" },
  { value: 3, label: "Neutro", icon: Meh, color: "text-muted-foreground" },
  { value: 4, label: "Bem", icon: Smile, color: "text-success" },
  { value: 5, label: "Muito bem", icon: Smile, color: "text-primary" },
];

const MOTIVATIONAL = [
  "Cada dia é uma nova oportunidade de cuidar de si. 💜",
  "Você é mais forte do que imagina. Continue! ✨",
  "Permita-se sentir. Todos os sentimentos são válidos. 🌱",
  "O autocuidado não é egoísmo, é necessidade. 🦋",
  "Pequenos passos ainda são passos. 🌟",
];

function getMotivational() {
  const day = new Date().getDate();
  return MOTIVATIONAL[day % MOTIVATIONAL.length];
}

function getQuickActions(basePath: string) {
  return [
    { to: `${basePath}/humor`, icon: Heart, label: "Humor", desc: "Registrar como se sente", gradient: "from-primary/10 to-primary/5" },
    { to: `${basePath}/testes`, icon: ClipboardList, label: "Testes", desc: "Testes pendentes", gradient: "from-accent to-accent/50" },
    { to: `${basePath}/tarefas`, icon: ListTodo, label: "Tarefas", desc: "Atividades sugeridas", gradient: "from-indigo-500/10 to-indigo-500/5" },
    { to: `${basePath}/consultas`, icon: Calendar, label: "Consultas", desc: "Próximas sessões", gradient: "from-success/10 to-success/5" },
  ];
}

export default function PatientHome() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { basePath } = usePortalSlug();
  const [quickMood, setQuickMood] = useState<number | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const firstName = user?.name?.split(" ")[0] || "Paciente";

  // PWA install prompt
  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const dismissed = sessionStorage.getItem("install_dismissed");
    if (isStandalone || dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Show banner anyway for iOS (no beforeinstallprompt)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS && !isStandalone) {
      setShowInstallBanner(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === "accepted") {
        toast({ title: "App instalado! 🎉" });
      }
      setDeferredPrompt(null);
    }
    setShowInstallBanner(false);
    sessionStorage.setItem("install_dismissed", "1");
  };

  const dismissBanner = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem("install_dismissed", "1");
  };

  const { data } = useQuery({
    queryKey: ["patient-dashboard"],
    queryFn: () => patientPortalApi.dashboard(),
  });

  const { data: myTests = [] } = useQuery<TestAssignment[]>({
    queryKey: ["my-tests"],
    queryFn: () => testsApi.myTests(),
  });

  const pendingTests = myTests.filter(t => t.status === "pending");

  const moodMutation = useMutation({
    mutationFn: (mood: number) =>
      moodApi.create({ mood, emotions: [], energyLevel: 3, sleepQuality: 3, anxietyLevel: 3 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient-dashboard"] });
      toast({ title: "Humor registrado! 🎉" });
      setQuickMood(null);
    },
    onError: (err: Error) =>
      toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="px-4 py-5 space-y-5 max-w-md mx-auto">
      {/* Install Banner */}
      <AnimatePresence>
        {showInstallBanner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
              <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">Instale o app no seu celular</p>
                <p className="text-[10px] text-muted-foreground">Acesse mais rápido, sem abrir o navegador</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant="default" className="h-7 text-xs px-3" onClick={handleInstallClick}>
                  {deferredPrompt ? "Instalar" : "Como instalar"}
                </Button>
                <button onClick={dismissBanner} className="p-1 rounded-full hover:bg-muted">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-display font-bold text-foreground">
          Olá, {firstName} 👋
        </h1>
        <div className="flex items-start gap-2 mt-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
          <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {getMotivational()}
          </p>
        </div>
      </motion.div>

      {/* Quick Mood - prominent */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="pt-4 pb-3">
            <p className="text-sm font-display font-bold text-foreground mb-3">
              Como você está agora?
            </p>
            <div className="flex justify-between gap-1">
              {MOODS.map(m => (
                <button
                  key={m.value}
                  onClick={() => setQuickMood(m.value)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all flex-1 ${
                    quickMood === m.value
                      ? "bg-primary/15 scale-105 ring-2 ring-primary/30"
                      : "hover:bg-muted active:scale-95"
                  }`}
                >
                  <m.icon className={`w-7 h-7 ${quickMood === m.value ? m.color : "text-muted-foreground"}`} />
                  <span className="text-[9px] text-muted-foreground leading-tight">{m.label}</span>
                </button>
              ))}
            </div>
            {quickMood && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={() => moodMutation.mutate(quickMood)}
                  disabled={moodMutation.isPending}
                >
                  {moodMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Registrar
                </Button>
                <Link to={`${basePath}/humor`} className="flex-1">
                  <Button size="sm" variant="outline" className="w-full text-xs">+ Detalhes</Button>
                </Link>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-3">
        {getQuickActions(basePath).map((action, i) => (
          <Link key={action.to} to={action.to}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              whileTap={{ scale: 0.97 }}
            >
              <Card className="hover:shadow-md transition-all h-full">
                <CardContent className="pt-4 pb-3 flex flex-col gap-2">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center`}>
                    <action.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-foreground text-sm">{action.label}</p>
                    <p className="text-[10px] text-muted-foreground">{action.desc}</p>
                  </div>
                  {action.label === "Testes" && data?.pendingTests ? (
                    <Badge variant="destructive" className="text-[9px] w-fit">
                      {data.pendingTests} pendente{data.pendingTests > 1 ? "s" : ""}
                    </Badge>
                  ) : null}
                </CardContent>
              </Card>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Pending Tests */}
      {pendingTests.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" />
              Testes pendentes
            </p>
            {pendingTests.map(test => (
              <Link key={test.id} to={`${basePath}/testes`}>
                <Card className="hover:shadow-md transition-shadow border-warning/30 bg-warning/5">
                  <CardContent className="pt-3 pb-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                      <ClipboardList className="w-5 h-5 text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{test.template?.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Enviado em {new Date(test.assignedAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <Badge variant="destructive" className="text-[9px] shrink-0">Responder</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Next appointment preview */}
      {data?.upcomingAppointments?.[0] && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Link to={`${basePath}/consultas`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-1">Próxima consulta</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-success" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {new Date(data.upcomingAppointments[0].date).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                      {" às "}{data.upcomingAppointments[0].time}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {data.upcomingAppointments[0].professional?.name} · {data.upcomingAppointments[0].mode === "video" ? "Online" : "Presencial"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      )}
    </div>
  );
}
