import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Eye, EyeOff, LogIn, Check, ArrowLeft, ArrowRight, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { plansApi, type Plan } from "@/lib/plansApi";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "plan">("form");
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const { data: plans = [], isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["public-plans"],
    queryFn: () => plansApi.listPublic(),
    enabled: isRegister,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister && step === "form") {
      setStep("plan");
      return;
    }
    setIsLoading(true);
    try {
      let loggedUser;
      if (isRegister) {
        await register({ name, email, password, planId: selectedPlanId || undefined });
        toast({ title: "Conta criada com sucesso!" });
      } else {
        await login(email, password);
        toast({ title: "Login realizado!" });
      }
      // Get fresh user from localStorage token to check role
      const token = localStorage.getItem("auth_token");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          if (payload.role === "patient") {
            navigate("/portal");
            return;
          }
          if (payload.role === "superadmin") {
            navigate("/admin");
            return;
          }
        } catch {}
      }
      navigate("/dashboard");
    } catch (err: unknown) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Credenciais inválidas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setIsRegister(!isRegister);
    setStep("form");
    setSelectedPlanId(null);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative items-center justify-center p-12">
        <div className="absolute top-8 left-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-xl text-primary-foreground">PsicoGest</span>
        </div>
        <div className="max-w-md">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h2 className="text-4xl font-display font-bold text-primary-foreground leading-tight">
              Seu consultório de psicologia na era digital
            </h2>
            <p className="text-primary-foreground/70 mt-4 text-lg">
              Agenda, sessões online, prontuário inteligente e assistente de IA — tudo pensado para psicólogos.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">PsicoGest</span>
          </div>

          <AnimatePresence mode="wait">
            {/* LOGIN or REGISTER FORM */}
            {(!isRegister || step === "form") && (
              <motion.div key="form" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h1 className="text-2xl font-display font-bold text-foreground">
                  {isRegister ? "Criar conta" : "Entrar"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1 mb-8">
                  {isRegister ? "Preencha seus dados para começar" : "Acesse seu painel de psicologia"}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {isRegister && (
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome completo</Label>
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dra. Maria Silva" required />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full gradient-primary border-0 shadow-glow" disabled={isLoading}>
                    {isLoading ? "Carregando..." : (
                      <>
                        {isRegister ? <><ArrowRight className="w-4 h-4 mr-2" />Escolher Plano</> : <><LogIn className="w-4 h-4 mr-2" />Entrar</>}
                      </>
                    )}
                  </Button>
                </form>
              </motion.div>
            )}

            {/* PLAN SELECTION */}
            {isRegister && step === "plan" && (
              <motion.div key="plan" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <button onClick={() => setStep("form")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
                <h1 className="text-2xl font-display font-bold text-foreground">Escolha seu plano</h1>
                <p className="text-sm text-muted-foreground mt-1 mb-6">
                  Todos os planos incluem período de teste gratuito
                </p>

                {plansLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
                  </div>
                ) : (
                  <div className="space-y-3 mb-6">
                    {plans.map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                          selectedPlanId === plan.id
                            ? "border-primary bg-primary/5 shadow-glow"
                            : "border-border bg-card hover:border-primary/30"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-primary" />
                            <span className="font-display font-bold text-foreground">{plan.name}</span>
                            {plan.isRecommended && <Badge className="text-[10px]">Recomendado</Badge>}
                          </div>
                          <div className="text-right">
                            <span className="font-display font-bold text-foreground">R$ {Number(plan.price).toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground">/mês</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                          <span>{plan.maxPatients >= 9999 ? "∞" : plan.maxPatients} pacientes</span>
                          <span>•</span>
                          <span>{plan.maxPsychologists} psicólogo{plan.maxPsychologists > 1 ? "s" : ""}</span>
                          <span>•</span>
                          <span className="text-primary font-medium">{plan.trialDays} dias grátis</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(plan.features || []).slice(0, 3).map((f) => (
                            <span key={f} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Check className="w-3 h-3 text-primary" />{f}
                            </span>
                          ))}
                          {(plan.features || []).length > 3 && (
                            <span className="text-[11px] text-primary">+{plan.features.length - 3} mais</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <Button
                  onClick={handleSubmit}
                  className="w-full gradient-primary border-0 shadow-glow"
                  disabled={isLoading || !selectedPlanId}
                >
                  {isLoading ? "Criando conta..." : (
                    <><LogIn className="w-4 h-4 mr-2" />Criar Conta e Começar Trial</>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 text-center">
            <button type="button" onClick={switchMode} className="text-sm text-primary hover:underline">
              {isRegister ? "Já tem conta? Entrar" : "Não tem conta? Criar agora"}
            </button>
          </div>

          <div className="mt-8 text-center">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
              ← Voltar para o site
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
