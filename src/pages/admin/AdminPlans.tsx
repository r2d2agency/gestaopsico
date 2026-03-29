import { motion } from "framer-motion";
import { CreditCard, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const plans = [
  {
    id: "basic",
    name: "Essencial",
    price: "R$ 89,00",
    priceWithSecretary: "R$ 289,00",
    period: "/mês",
    features: [
      "Até 30 pacientes",
      "Agenda e prontuário",
      "Sessões online",
      "IA para análise de anotações",
      "Suporte por e-mail",
    ],
    recommended: false,
  },
  {
    id: "professional",
    name: "Profissional",
    price: "R$ 149,00",
    priceWithSecretary: "R$ 349,00",
    period: "/mês",
    features: [
      "Pacientes ilimitados",
      "Assistente de IA (GPT, Claude, Gemini)",
      "Agentes personalizáveis",
      "Terapia de casal",
      "Financeiro completo",
      "Suporte prioritário",
    ],
    recommended: true,
  },
  {
    id: "enterprise",
    name: "Clínica",
    price: "R$ 349,00",
    priceWithSecretary: "R$ 549,00",
    period: "/mês",
    features: [
      "Até 10 profissionais",
      "Tudo do Profissional",
      "Painel administrativo",
      "Agentes de IA ilimitados",
      "Multi-unidades",
      "Suporte dedicado + SLA",
    ],
    recommended: false,
  },
];

export default function AdminPlans() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Planos & Assinaturas</h1>
        <p className="text-sm text-muted-foreground">Gerencie os planos disponíveis para as organizações</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`relative rounded-xl border p-6 ${
              plan.recommended
                ? "border-primary bg-primary/5 shadow-glow"
                : "border-border bg-card"
            }`}
          >
            {plan.recommended && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Recomendado
              </Badge>
            )}

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-bold text-foreground">{plan.name}</h3>
              </div>
            </div>

            <div className="mb-6">
              <span className="text-3xl font-display font-bold text-foreground">{plan.price}</span>
              <span className="text-muted-foreground text-sm">{plan.period}</span>
            </div>

            <ul className="space-y-2 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Button variant={plan.recommended ? "default" : "outline"} className="w-full">
              Gerenciar Plano
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
