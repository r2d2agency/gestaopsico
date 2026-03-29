import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Video,
  FileText,
  DollarSign,
  Brain,
  Shield,
  ArrowRight,
  CheckCircle,
  Users,
  Heart,
  Sparkles,
  MessageCircle,
  Lock,
  Headphones,
  Bot,
  Zap,
} from "lucide-react";
import { useState } from "react";

const features = [
  {
    icon: Calendar,
    title: "Agenda Inteligente",
    desc: "Organize sessões individuais e de casal com confirmação automática e lembretes via WhatsApp.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: MessageCircle,
    title: "Secretária IA no WhatsApp",
    desc: "Um agente de IA que agenda, remarca e responde seus pacientes 24h pelo WhatsApp. Nunca perca um agendamento.",
    color: "bg-success/10 text-success",
  },
  {
    icon: Brain,
    title: "IA Clínica Personalizada",
    desc: "Agentes de IA que analisam anotações, sugerem abordagens terapêuticas e geram insights. Escolha entre GPT, Claude ou Gemini.",
    color: "bg-lavender/10 text-lavender",
  },
  {
    icon: Video,
    title: "Sessões Online",
    desc: "Videochamada segura integrada com sala exclusiva por sessão terapêutica.",
    color: "bg-info/10 text-info",
  },
  {
    icon: FileText,
    title: "Prontuário + IA",
    desc: "Suba suas anotações e a IA analisa, organiza e sugere intervenções clínicas automaticamente.",
    color: "bg-warm/10 text-warm",
  },
  {
    icon: Sparkles,
    title: "Agentes Personalizáveis",
    desc: "Seu admin cria agentes de IA e você personaliza o prompt para seu estilo terapêutico. Use GPT, Claude ou Gemini.",
    color: "bg-rose/10 text-rose",
  },
  {
    icon: DollarSign,
    title: "Financeiro + Cobrança WhatsApp",
    desc: "Controle de honorários, recibos automáticos e cobranças enviadas direto pelo WhatsApp.",
    color: "bg-success/10 text-success",
  },
  {
    icon: Heart,
    title: "Terapia de Casal",
    desc: "Prontuário conjunto, dinâmicas de casal e acompanhamento de evolução compartilhada.",
    color: "bg-rose/10 text-rose",
  },
];

const benefits = [
  "Reduza o trabalho administrativo em 70%",
  "Assistente de IA que analisa suas anotações",
  "Prontuários gerados e organizados automaticamente",
  "Conformidade total com a LGPD e CFP",
  "Acesse de qualquer lugar, a qualquer hora",
  "Gestão de terapia individual e de casal",
];

const testimonials = [
  {
    name: "Dra. Mariana Costa",
    role: "Psicóloga Clínica - CRP 06/12345",
    text: "O PsicoGest transformou minha prática. A IA me ajuda a identificar padrões que eu levaria sessões para perceber.",
    avatar: "MC",
  },
  {
    name: "Dr. Rafael Oliveira",
    role: "Psicoterapeuta - CRP 05/67890",
    text: "Finalmente um sistema feito por quem entende psicologia. O prontuário eletrônico é simplesmente perfeito.",
    avatar: "RO",
  },
  {
    name: "Dra. Julia Santos",
    role: "Psicóloga de Casal - CRP 11/54321",
    text: "O módulo de terapia de casal é único no mercado. Meus pacientes percebem a diferença na qualidade do acompanhamento.",
    avatar: "JS",
  },
];

const plans = [
  {
    name: "Essencial",
    price: "R$ 89",
    priceWithSecretary: "R$ 289",
    period: "/mês",
    desc: "Para psicólogos autônomos",
    features: [
      "Até 30 pacientes",
      "Agenda e prontuário",
      "Sessões online",
      "IA para análise de anotações",
      "Suporte por e-mail",
    ],
    secretaryFeatures: [
      "Secretária IA no WhatsApp",
      "Agendamento automático 24h",
      "Lembretes e cobranças via WhatsApp",
    ],
    highlighted: false,
  },
  {
    name: "Profissional",
    price: "R$ 149",
    priceWithSecretary: "R$ 349",
    period: "/mês",
    desc: "Para quem quer crescer com IA",
    features: [
      "Pacientes ilimitados",
      "Assistente de IA (GPT, Claude, Gemini)",
      "Agentes personalizáveis",
      "Terapia de casal",
      "Financeiro completo",
      "Suporte prioritário",
    ],
    secretaryFeatures: [
      "Secretária IA no WhatsApp",
      "Agendamento automático 24h",
      "Relatórios e alertas via WhatsApp",
    ],
    highlighted: true,
  },
  {
    name: "Clínica",
    price: "R$ 349",
    priceWithSecretary: "R$ 549",
    period: "/mês",
    desc: "Para clínicas com equipe",
    features: [
      "Até 10 profissionais",
      "Tudo do Profissional",
      "Painel administrativo",
      "Agentes de IA ilimitados",
      "Multi-unidades",
      "Suporte dedicado + SLA",
    ],
    secretaryFeatures: [
      "Secretária IA no WhatsApp",
      "Múltiplos números WhatsApp",
      "Bot inteligente por profissional",
    ],
    highlighted: false,
  },
];

export default function LandingPage() {
  const [withSecretary, setWithSecretary] = useState(false);
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">PsicoGest</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#benefits" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Benefícios</a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Depoimentos</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Planos</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
            <Button className="gradient-primary border-0 shadow-glow" asChild>
              <Link to="/login">Começar Grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-36 pb-24 px-6 relative">
        {/* Background decorations */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-lavender/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-rose/5 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 border border-primary/20">
              <Sparkles className="w-4 h-4" /> Inteligência Artificial para Psicólogos
            </span>
            <h1 className="text-5xl md:text-7xl font-display font-extrabold text-foreground leading-[1.1] max-w-5xl mx-auto tracking-tight">
              Seu consultório de{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-lavender to-rose">
                psicologia
              </span>{" "}
              na era digital
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mt-8 max-w-2xl mx-auto leading-relaxed">
              Agenda, sessões online, prontuário inteligente e assistente de IA — 
              tudo pensado para psicólogos que querem focar no que realmente importa: seus pacientes.
            </p>
            <div className="flex items-center justify-center gap-4 mt-10">
              <Button size="lg" className="gradient-primary border-0 shadow-glow text-base px-8 h-12" asChild>
                <Link to="/dashboard">
                  Experimentar 14 dias grátis <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 h-12">
                <Video className="w-4 h-4 mr-2" /> Ver Demonstração
              </Button>
            </div>
            <div className="flex items-center justify-center gap-8 mt-10 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-success" /> Sem cartão de crédito</span>
              <span className="flex items-center gap-1.5"><Lock className="w-4 h-4 text-success" /> LGPD & CFP</span>
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-success" /> +800 psicólogos</span>
            </div>
          </motion.div>

          {/* Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3 }}
            className="mt-20 rounded-2xl border border-border/50 shadow-2xl overflow-hidden bg-card max-w-5xl mx-auto"
          >
            <div className="bg-sidebar px-4 py-3 flex items-center gap-2 border-b border-sidebar-border">
              <div className="w-3 h-3 rounded-full bg-rose/60" />
              <div className="w-3 h-3 rounded-full bg-warning/60" />
              <div className="w-3 h-3 rounded-full bg-success/60" />
              <span className="text-xs text-sidebar-foreground/60 ml-2">app.psicogest.com.br</span>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Sessões Hoje", value: "5", icon: "📋" },
                  { label: "Pacientes Ativos", value: "127", icon: "👥" },
                  { label: "Honorários", value: "R$ 18.5k", icon: "💰" },
                  { label: "IA Insights", value: "23", icon: "🧠" },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="bg-muted/50 rounded-xl p-4 text-center border border-border/50"
                  >
                    <span className="text-2xl">{stat.icon}</span>
                    <p className="text-2xl font-display font-bold text-foreground mt-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {["Próxima sessão: Ana Silva às 14h", "Prontuário atualizado por IA", "Pagamento confirmado - PIX"].map((t, i) => (
                  <div key={i} className="bg-primary/5 rounded-lg p-3 text-sm text-foreground border border-primary/10">
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <span className="text-sm font-medium text-primary uppercase tracking-wider">Funcionalidades</span>
              <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mt-3">
                Feito para psicólogos,{" "}
                <span className="text-primary">por quem entende</span>
              </h2>
              <p className="text-muted-foreground mt-4 max-w-xl mx-auto text-lg">
                Cada recurso foi pensado para a realidade do consultório de psicologia.
              </p>
            </motion.div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group bg-card rounded-2xl p-7 border border-border shadow-card hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-2xl ${f.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-7 h-7" />
                </div>
                <h3 className="font-display font-semibold text-foreground text-lg">{f.title}</h3>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="py-24 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <span className="text-sm font-medium text-primary uppercase tracking-wider">Por que PsicoGest</span>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mt-3 leading-tight">
              Cuide da saúde mental,{" "}
              <span className="text-primary">nós cuidamos do resto</span>
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              Automatize a parte burocrática e dedique mais tempo à escuta qualificada e ao acolhimento terapêutico.
            </p>
            <div className="mt-10 space-y-4">
              {benefits.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center shrink-0">
                    <CheckCircle className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                  <span className="text-foreground">{b}</span>
                </motion.div>
              ))}
            </div>
            <Button className="mt-10 gradient-primary border-0 shadow-glow" size="lg" asChild>
              <Link to="/login">Começar Agora <ArrowRight className="w-4 h-4 ml-2" /></Link>
            </Button>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="bg-card rounded-2xl border border-border shadow-xl p-8 space-y-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-display font-semibold text-foreground text-sm">Assistente IA</p>
                  <p className="text-xs text-muted-foreground">Analisando sessão de hoje...</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="bg-primary/5 rounded-xl p-4 text-sm text-foreground border border-primary/10">
                  <p className="font-medium text-primary text-xs mb-1">🧠 Insight da IA</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Paciente demonstra padrão de evitação em temas familiares. 
                    Nas últimas 3 sessões, houve redirecionamento quando o assunto envolve a mãe. 
                    Considere técnica de dessensibilização gradual.
                  </p>
                </div>
                <div className="bg-muted/50 rounded-xl p-4 text-sm text-foreground border border-border">
                  <p className="font-medium text-warm text-xs mb-1">📊 Progresso</p>
                  <p className="text-muted-foreground text-xs">Escala de ansiedade: 8 → 5 (melhora de 37% em 8 sessões)</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-4 text-sm text-foreground border border-border">
                  <p className="font-medium text-success text-xs mb-1">✅ Sugestão</p>
                  <p className="text-muted-foreground text-xs">Aplicar inventário Beck na próxima sessão para acompanhamento quantitativo.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* AI Secretary Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium border border-success/20">
                <Bot className="w-4 h-4" /> Novidade
              </span>
              <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mt-4">
                Sua <span className="text-primary">Secretária IA</span> no WhatsApp
              </h2>
              <p className="text-muted-foreground mt-4 max-w-2xl mx-auto text-lg">
                Um agente inteligente que trabalha 24 horas no seu WhatsApp. Agenda, remarca, cobra e responde seus pacientes automaticamente.
              </p>
            </motion.div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: MessageCircle, title: "Agendamento Automático", desc: "Pacientes marcam e remarcam sessões pelo WhatsApp a qualquer hora. A IA consulta sua agenda em tempo real.", color: "text-primary" },
              { icon: Zap, title: "Lembretes e Cobranças", desc: "Envio automático de lembretes de sessão, cobranças pendentes e confirmações de pagamento via WhatsApp.", color: "text-success" },
              { icon: Brain, title: "Alertas Inteligentes", desc: "Receba no seu WhatsApp: agenda do dia, relatórios financeiros, novos agendamentos e alertas de inadimplência.", color: "text-lavender" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-2xl p-7 border border-border shadow-card hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-5 ${item.color}`}>
                  <item.icon className="w-7 h-7" />
                </div>
                <h3 className="font-display font-semibold text-foreground text-lg">{item.title}</h3>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground mb-4">Disponível como add-on em qualquer plano por <span className="font-bold text-foreground">+R$ 200/mês</span></p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-primary uppercase tracking-wider">Depoimentos</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mt-3">
              Amado por psicólogos em todo o Brasil
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-2xl p-6 border border-border shadow-card"
              >
                <p className="text-muted-foreground text-sm leading-relaxed italic">"{t.text}"</p>
                <div className="flex items-center gap-3 mt-5 pt-5 border-t border-border">
                  <div className="w-10 h-10 rounded-full gradient-warm flex items-center justify-center">
                    <span className="text-primary-foreground font-display font-bold text-xs">{t.avatar}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-primary uppercase tracking-wider">Planos</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mt-3">
              Invista no seu consultório
            </h2>
            <p className="text-muted-foreground mt-3">Comece grátis, escale quando quiser.</p>
            <div className="flex items-center justify-center gap-3 mt-6">
              <span className={`text-sm font-medium ${!withSecretary ? "text-foreground" : "text-muted-foreground"}`}>Sem Secretária IA</span>
              <button
                onClick={() => setWithSecretary(!withSecretary)}
                className={`relative w-14 h-7 rounded-full transition-colors ${withSecretary ? "bg-primary" : "bg-muted-foreground/30"}`}
              >
                <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-primary-foreground shadow transition-transform ${withSecretary ? "translate-x-7" : "translate-x-0.5"}`} />
              </button>
              <span className={`text-sm font-medium ${withSecretary ? "text-foreground" : "text-muted-foreground"}`}>
                Com Secretária IA <span className="text-xs text-primary">(+R$200)</span>
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-2xl p-7 border ${
                  plan.highlighted
                    ? "bg-card border-primary/30 shadow-lg shadow-primary/10 relative"
                    : "bg-card border-border shadow-card"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-primary text-primary-foreground text-xs font-medium">
                    Mais Popular
                  </div>
                )}
                <h3 className="font-display font-bold text-lg text-foreground">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{plan.desc}</p>
                <div className="mt-5 mb-6">
                  <span className="text-4xl font-display font-extrabold text-foreground">
                    {withSecretary ? plan.priceWithSecretary : plan.price}
                  </span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                  {withSecretary && (
                    <p className="text-xs text-primary mt-1">Inclui Secretária IA no WhatsApp</p>
                  )}
                </div>
                <ul className="space-y-3 mb-4">
                  {plan.features.map((f, fi) => (
                    <li key={fi} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4 text-success shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {withSecretary && (
                  <div className="border-t border-border pt-4 mb-4">
                    <p className="text-xs font-medium text-primary mb-2 flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5" /> Secretária IA
                    </p>
                    <ul className="space-y-2">
                      {plan.secretaryFeatures.map((f, fi) => (
                        <li key={fi} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="space-y-2">
                  <Button className={`w-full ${plan.highlighted ? "gradient-primary border-0 shadow-glow" : ""}`} variant={plan.highlighted ? "default" : "outline"} asChild>
                    <Link to="/dashboard">
                      {plan.highlighted ? "Começar Grátis" : "Selecionar Plano"}
                    </Link>
                  </Button>
                  {!plan.highlighted && (
                    <Button variant="ghost" className="w-full text-xs text-primary hover:text-primary" asChild>
                      <Link to="/dashboard">
                        <ArrowRight className="w-3 h-3 mr-1" />
                        Upgrade para {i === 0 ? "Profissional" : "Clínica Enterprise"}
                      </Link>
                    </Button>
                  )}
                  {plan.highlighted && !withSecretary && (
                    <button
                      onClick={() => setWithSecretary(true)}
                      className="w-full text-xs text-primary hover:underline mt-1 flex items-center justify-center gap-1"
                    >
                      <Zap className="w-3 h-3" /> Adicionar Secretária IA (+R$200/mês)
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto gradient-hero rounded-3xl p-14 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-lavender/10 rounded-full blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground leading-tight">
              Pronto para transformar sua prática clínica?
            </h2>
            <p className="text-primary-foreground/70 mt-5 max-w-xl mx-auto text-lg">
              Junte-se a mais de 800 psicólogos que já modernizaram seu consultório com o PsicoGest.
            </p>
            <div className="flex items-center justify-center gap-4 mt-10">
              <Button size="lg" className="bg-primary-foreground text-foreground hover:bg-primary-foreground/90 text-base px-8 h-12" asChild>
                <Link to="/login">Criar Conta Gratuita <ArrowRight className="w-4 h-4 ml-2" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-base px-8 h-12">
                <Headphones className="w-4 h-4 mr-2" /> Falar com Suporte
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
                  <Brain className="w-4.5 h-4.5 text-primary-foreground" />
                </div>
                <span className="font-display font-bold text-lg text-foreground">PsicoGest</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-sm">
                Plataforma completa de gestão para psicólogos e clínicas de psicologia. 
                Feito com ❤️ para quem cuida da saúde mental.
              </p>
            </div>
            <div>
              <h4 className="font-display font-semibold text-foreground text-sm mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Funcionalidades</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Planos</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Segurança</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Integrações</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-semibold text-foreground text-sm mb-4">Suporte</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contato</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Termos de Uso</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-10 pt-8 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">© 2026 PsicoGest. Todos os direitos reservados.</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="w-3 h-3" /> Dados protegidos por criptografia AES-256
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
