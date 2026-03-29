import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Calendar,
  Video,
  FileText,
  DollarSign,
  Shield,
  ArrowRight,
  CheckCircle,
  Users,
  Heart,
  MessageCircle,
  Lock,
  Headphones,
  Bot,
  Smartphone,
  Smile,
  ClipboardList,
  Building2,
  UserCheck,
  Bell,
  Clock,
  AlertCircle,
  Inbox,
  Receipt,
  Sparkles,
  Brain,
  Zap,
} from "lucide-react";
import { useState } from "react";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

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
      "App do paciente (PWA)",
      "Testes psicológicos",
      "Monitoramento de humor",
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
    desc: "Para quem quer crescer",
    features: [
      "Pacientes ilimitados",
      "Apoio de IA no prontuário",
      "App do paciente com sua marca",
      "Testes + monitoramento de humor",
      "Terapia de casal",
      "Financeiro completo + cobranças",
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
    desc: "Até 3 profissionais",
    features: [
      "Até 3 profissionais inclusos",
      "Tudo do Profissional",
      "Painel administrativo",
      "Secretária e financeiro dedicados",
      "Relatórios consolidados",
      "Suporte dedicado + SLA",
    ],
    secretaryFeatures: [
      "Secretária IA no WhatsApp",
      "Múltiplos números WhatsApp",
      "Bot inteligente por profissional",
    ],
    highlighted: false,
    note: "Mais de 3 profissionais? Entre em contato.",
  },
];

export default function LandingPage() {
  const [withSecretary, setWithSecretary] = useState(false);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Heart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">Psico Gleego</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#como-funciona" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Como funciona</a>
            <a href="#secretaria" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Secretária IA</a>
            <a href="#funcionalidades" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#planos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Planos</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
            <Button className="gradient-primary border-0 shadow-glow" asChild>
              <Link to="/login">Testar Gratuitamente</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════ */}
      <section className="pt-36 pb-28 px-6 relative">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-lavender/5 rounded-full blur-3xl" />

        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <h1 className="text-4xl md:text-6xl font-display font-extrabold text-foreground leading-[1.12] tracking-tight">
              Sua clínica organizada, seus pacientes atendidos e suas sessões registradas —{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-lavender to-rose">
                sem você precisar fazer tudo sozinho
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mt-8 max-w-2xl mx-auto leading-relaxed">
              Agenda, atendimento online, prontuário e uma secretária com IA trabalhando junto com você.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
              <Button size="lg" className="gradient-primary border-0 shadow-glow text-base px-10 h-13" asChild>
                <Link to="/login">
                  Testar Gratuitamente <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 h-13">
                <Video className="w-4 h-4 mr-2" /> Ver Demonstração
              </Button>
            </div>
            <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-success" /> Sem cartão de crédito</span>
              <span className="flex items-center gap-1.5"><Lock className="w-4 h-4 text-success" /> LGPD & CFP</span>
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-success" /> +800 psicólogos</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          BLOCO DE DOR
      ═══════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp}>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground leading-tight">
                Você atende seus pacientes…<br />
                <span className="text-muted-foreground font-normal text-2xl md:text-3xl">
                  e depois precisa dar conta de todo o resto.
                </span>
              </h2>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { icon: MessageCircle, text: "Mensagens fora de hora" },
              { icon: Inbox, text: "Pacientes sem resposta" },
              { icon: FileText, text: "Anotações acumuladas" },
              { icon: Receipt, text: "Financeiro desorganizado" },
              { icon: Clock, text: "Agenda difícil de controlar" },
              { icon: AlertCircle, text: "Medo de perder pacientes" },
            ].map((item, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 bg-card rounded-xl p-4 border border-border"
              >
                <div className="w-10 h-10 rounded-lg bg-rose/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-rose" />
                </div>
                <span className="text-foreground text-sm">{item.text}</span>
              </motion.div>
            ))}
          </div>

          {/* VIRADA */}
          <motion.div {...fadeUp} transition={{ delay: 0.4 }} className="mt-16 text-center">
            <div className="inline-flex items-center gap-3 bg-card rounded-2xl border border-primary/20 px-8 py-5 shadow-lg">
              <Sparkles className="w-6 h-6 text-primary shrink-0" />
              <p className="text-lg md:text-xl font-display font-semibold text-foreground">
                Agora você não precisa fazer tudo isso sozinho.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECRETÁRIA COM IA — DESTAQUE PRINCIPAL
      ═══════════════════════════════════════════ */}
      <section id="secretaria" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div {...fadeUp}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium border border-success/20 mb-4">
                <Bot className="w-4 h-4" /> Principal diferencial
              </span>
              <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground leading-tight">
                Uma secretária digital que atende{" "}
                <span className="text-primary">enquanto você está em sessão</span>
              </h2>
              <p className="text-muted-foreground mt-4 text-lg">
                Ela atua direto no seu WhatsApp — respondendo pacientes, organizando agendamentos 
                e mantendo a comunicação ativa, 24 horas por dia.
              </p>
              <div className="mt-8 space-y-3">
                {[
                  "Responde pacientes automaticamente",
                  "Organiza agendamentos sem você intervir",
                  "Envia informações e lembretes",
                  "Reduz mensagens fora de horário",
                  "Evita perda de novos pacientes",
                ].map((text, i) => (
                  <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.06 }} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center shrink-0">
                      <CheckCircle className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                    <span className="text-foreground">{text}</span>
                  </motion.div>
                ))}
              </div>
              <Button className="mt-8 gradient-primary border-0 shadow-glow" size="lg" asChild>
                <Link to="/login">Quero minha secretária IA <ArrowRight className="w-4 h-4 ml-2" /></Link>
              </Button>
            </motion.div>

            {/* WhatsApp mockup */}
            <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="bg-card rounded-3xl border border-border shadow-xl p-6 max-w-sm mx-auto">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-foreground text-sm">Secretária • Psico Gleego</p>
                    <p className="text-xs text-success">Online agora</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-muted/50 rounded-2xl rounded-tl-sm p-3 max-w-[85%]">
                    <p className="text-xs text-foreground">Olá! Gostaria de agendar uma consulta com a Dra. Marina.</p>
                    <p className="text-[10px] text-muted-foreground mt-1 text-right">14:32</p>
                  </div>
                  <div className="bg-primary/10 rounded-2xl rounded-tr-sm p-3 max-w-[85%] ml-auto">
                    <p className="text-xs text-foreground">Olá! 😊 Claro! A Dra. Marina tem horários disponíveis na quarta (09h, 14h) e quinta (10h, 16h). Qual você prefere?</p>
                    <p className="text-[10px] text-muted-foreground mt-1 text-right">14:32</p>
                  </div>
                  <div className="bg-muted/50 rounded-2xl rounded-tl-sm p-3 max-w-[85%]">
                    <p className="text-xs text-foreground">Quarta às 14h, por favor!</p>
                    <p className="text-[10px] text-muted-foreground mt-1 text-right">14:33</p>
                  </div>
                  <div className="bg-primary/10 rounded-2xl rounded-tr-sm p-3 max-w-[85%] ml-auto">
                    <p className="text-xs text-foreground">Perfeito! ✅ Agendei quarta-feira às 14h com a Dra. Marina. Você receberá um lembrete no dia anterior. Até lá!</p>
                    <p className="text-[10px] text-muted-foreground mt-1 text-right">14:33</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          APP DO PACIENTE
      ═══════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Phone mockup */}
            <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="order-2 lg:order-1">
              <div className="bg-card rounded-3xl border border-border shadow-xl p-6 max-w-sm mx-auto">
                <div className="bg-muted/50 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                      <Smile className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-display font-semibold text-foreground text-sm">Olá, Maria!</p>
                      <p className="text-xs text-muted-foreground">Seu espaço de acompanhamento</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                      <p className="text-xs font-medium text-primary mb-1">📅 Próxima consulta</p>
                      <p className="text-xs text-muted-foreground">Quarta, 02 Abr às 14:00</p>
                    </div>
                    <div className="bg-success/5 rounded-lg p-3 border border-success/10">
                      <p className="text-xs font-medium text-success mb-1">📋 Teste disponível</p>
                      <p className="text-xs text-muted-foreground">Inventário de Ansiedade de Beck</p>
                    </div>
                    <div className="bg-lavender/5 rounded-lg p-3 border border-lavender/10">
                      <p className="text-xs font-medium text-lavender mb-1">😊 Registre seu humor</p>
                      <p className="text-xs text-muted-foreground">Como você está se sentindo hoje?</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3 border border-border">
                      <p className="text-xs font-medium text-foreground mb-1">💰 Financeiro</p>
                      <p className="text-xs text-muted-foreground">Nenhuma pendência</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div {...fadeUp} className="order-1 lg:order-2">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-info/10 text-info text-sm font-medium border border-info/20 mb-4">
                <Smartphone className="w-4 h-4" /> App do Paciente
              </span>
              <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground leading-tight">
                Seu paciente com{" "}
                <span className="text-primary">tudo na mão</span>
              </h2>
              <p className="text-muted-foreground mt-4 text-lg">
                Um aplicativo com a identidade do seu consultório, onde o paciente acompanha 
                tudo sobre o atendimento — sem precisar te mandar mensagem.
              </p>
              <div className="mt-8 space-y-3">
                {[
                  "Visualiza consultas agendadas",
                  "Acessa o link de atendimento online",
                  "Responde testes e registra humor",
                  "Acompanha informações do atendimento",
                  "Reduz mensagens no WhatsApp",
                ].map((text, i) => (
                  <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.06 }} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-foreground text-sm">{text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          ORGANIZAÇÃO DAS SESSÕES
      ═══════════════════════════════════════════ */}
      <section id="como-funciona" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div {...fadeUp}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-lavender/10 text-lavender text-sm font-medium border border-lavender/20 mb-4">
                <FileText className="w-4 h-4" /> Registro de sessões
              </span>
              <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground leading-tight">
                Suas sessões{" "}
                <span className="text-primary">organizadas automaticamente</span>
              </h2>
              <p className="text-muted-foreground mt-4 text-lg">
                Depois da consulta, o sistema estrutura os pontos principais e gera um 
                rascunho de prontuário para você revisar e salvar.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  { icon: "📝", text: "A sessão é estruturada automaticamente" },
                  { icon: "🎯", text: "Os principais pontos são organizados" },
                  { icon: "📄", text: "Um rascunho de prontuário é gerado" },
                ].map((item, i) => (
                  <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.08 }} className="flex items-center gap-3 bg-card rounded-xl p-4 border border-border">
                    <span className="text-2xl shrink-0">{item.icon}</span>
                    <span className="text-foreground">{item.text}</span>
                  </motion.div>
                ))}
              </div>
              <div className="mt-8 bg-muted/50 rounded-xl p-5 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <p className="text-sm font-medium text-foreground">Você sempre no controle</p>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  O profissional revisa tudo antes de salvar. A tecnologia não substitui 
                  o seu olhar clínico — apenas organiza e apoia sua rotina.
                </p>
              </div>
            </motion.div>

            {/* Prontuário mockup */}
            <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="bg-card rounded-2xl border border-border shadow-xl p-7">
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border">
                  <div className="w-10 h-10 rounded-xl bg-lavender/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-lavender" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-foreground text-sm">Prontuário — Ana Silva</p>
                    <p className="text-xs text-muted-foreground">Sessão 12 • 28 Mar 2026</p>
                  </div>
                  <span className="ml-auto text-xs bg-success/10 text-success px-2 py-1 rounded-full">Rascunho IA</span>
                </div>
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-xs font-medium text-primary mb-1">Temas abordados</p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Relações familiares, ansiedade em contexto social, estratégias de enfrentamento.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-lavender mb-1">Observações</p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Paciente relata melhora na qualidade do sono. Mantém dificuldade em estabelecer limites no ambiente de trabalho.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-success mb-1">Encaminhamentos</p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Sugestão de exercício de assertividade para próxima sessão.
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" className="text-xs gradient-primary border-0">Revisar e Salvar</Button>
                    <Button size="sm" variant="outline" className="text-xs">Editar</Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          FUNCIONALIDADES
      ═══════════════════════════════════════════ */}
      <section id="funcionalidades" className="py-24 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <motion.div {...fadeUp}>
              <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
                Tudo que você precisa,{" "}
                <span className="text-primary">em um só lugar</span>
              </h2>
              <p className="text-muted-foreground mt-4 max-w-xl mx-auto text-lg">
                Simples, direto e pensado para a rotina real do psicólogo.
              </p>
            </motion.div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Calendar, title: "Agenda inteligente", desc: "Organize sessões com confirmação automática e lembretes.", color: "bg-primary/10 text-primary" },
              { icon: Video, title: "Atendimento online", desc: "Link de vídeo integrado para teleconsultas.", color: "bg-info/10 text-info" },
              { icon: Bot, title: "Secretária com IA", desc: "Atendimento 24h no WhatsApp para seus pacientes.", color: "bg-success/10 text-success" },
              { icon: Smartphone, title: "App do paciente", desc: "App instalável com a marca do seu consultório.", color: "bg-lavender/10 text-lavender" },
              { icon: FileText, title: "Prontuário organizado", desc: "Registro estruturado com apoio de IA.", color: "bg-warm/10 text-warm" },
              { icon: ClipboardList, title: "Testes psicológicos", desc: "Modelos prontos e customizáveis, com envio ao paciente.", color: "bg-rose/10 text-rose" },
              { icon: Heart, title: "Individual e casal", desc: "Prontuário e testes adaptados para cada modalidade.", color: "bg-primary/10 text-primary" },
              { icon: DollarSign, title: "Controle financeiro", desc: "Cobranças, fluxo de caixa e relatórios em PDF.", color: "bg-success/10 text-success" },
            ].map((f, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ delay: i * 0.06 }}
                className="group bg-card rounded-2xl p-6 border border-border shadow-card hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="font-display font-semibold text-foreground">{f.title}</h3>
                <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          DIFERENCIAL — TUDO CONECTADO
      ═══════════════════════════════════════════ */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div {...fadeUp}>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground leading-tight">
              Você não precisa mais dividir sua rotina{" "}
              <span className="text-primary">entre várias ferramentas</span>
            </h2>
            <p className="text-muted-foreground mt-4 text-lg max-w-2xl mx-auto">
              O sistema conecta paciente, atendimento, registro e financeiro — tudo em um único lugar.
            </p>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Users, label: "Paciente" },
              { icon: Video, label: "Atendimento" },
              { icon: FileText, label: "Registro" },
              { icon: DollarSign, label: "Financeiro" },
            ].map((item, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border p-6 shadow-card">
                <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-3">
                  <item.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <p className="font-display font-semibold text-foreground">{item.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Frase-chave */}
          <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="mt-14">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-lavender/10 to-rose/10 rounded-2xl blur-lg" />
              <blockquote className="relative bg-card rounded-2xl border border-border px-8 py-6 shadow-lg text-lg md:text-xl font-display font-semibold text-foreground leading-snug">
                "Você não precisa usar várias ferramentas nem adaptar sua rotina à tecnologia.{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-lavender">
                  A tecnologia se adapta à sua rotina clínica.
                </span>"
              </blockquote>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          POSICIONAMENTO ÉTICO
      ═══════════════════════════════════════════ */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div {...fadeUp}>
            <Shield className="w-10 h-10 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-display font-bold text-foreground">
              Nada substitui o seu olhar clínico.
            </h3>
            <p className="text-muted-foreground mt-3 text-lg leading-relaxed">
              A tecnologia apenas organiza e apoia sua rotina. 
              Cada decisão clínica permanece inteiramente nas suas mãos.
            </p>
            <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5"><Lock className="w-4 h-4 text-primary" /> Conformidade LGPD</span>
              <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-primary" /> Código de Ética CFP</span>
              <span className="flex items-center gap-1.5"><Lock className="w-4 h-4 text-primary" /> Criptografia AES-256</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          DEPOIMENTOS
      ═══════════════════════════════════════════ */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Quem já usa, recomenda
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Dra. Mariana Costa",
                role: "Psicóloga Clínica",
                text: "Minha rotina mudou completamente. Não perco mais tempo organizando agenda e o prontuário fica pronto em minutos.",
                avatar: "MC",
              },
              {
                name: "Dr. Rafael Oliveira",
                role: "Psicoterapeuta",
                text: "A secretária IA reduziu em 80% as mensagens que eu recebia fora de sessão. Meus pacientes são atendidos na hora.",
                avatar: "RO",
              },
              {
                name: "Dra. Julia Santos",
                role: "Psicóloga de Casal",
                text: "O app do paciente é um diferencial enorme. Meus pacientes adoram ter tudo organizado no celular.",
                avatar: "JS",
              },
            ].map((t, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-2xl p-6 border border-border shadow-card"
              >
                <p className="text-muted-foreground text-sm leading-relaxed italic">"{t.text}"</p>
                <div className="flex items-center gap-3 mt-5 pt-5 border-t border-border">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
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

      {/* ═══════════════════════════════════════════
          PLANOS
      ═══════════════════════════════════════════ */}
      <section id="planos" className="py-24 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Escolha o plano ideal para você
            </h2>
            <p className="text-muted-foreground mt-3">Comece grátis. Sem cartão de crédito.</p>
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
                {...fadeUp}
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
                {plan.note && (
                  <p className="text-xs text-muted-foreground text-center italic mt-2 px-2">{plan.note}</p>
                )}
                <Button className={`w-full ${plan.highlighted ? "gradient-primary border-0 shadow-glow" : ""}`} variant={plan.highlighted ? "default" : "outline"} asChild>
                  <Link to={`/login?plan=${plan.name.toLowerCase()}`}>
                    {plan.highlighted ? "Testar Gratuitamente" : "Selecionar Plano"}
                  </Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          FAQ
      ═══════════════════════════════════════════ */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Perguntas frequentes
            </h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {[
              {
                q: "O sistema está em conformidade com a LGPD?",
                a: "Sim. Todos os dados são criptografados e acessíveis apenas pelo profissional responsável, respeitando o sigilo previsto no Código de Ética do CFP.",
              },
              {
                q: "Como funciona a secretária com IA?",
                a: "Ela atua direto no seu WhatsApp, respondendo pacientes, agendando consultas e enviando lembretes — 24 horas por dia, sem você precisar intervir.",
              },
              {
                q: "O paciente precisa baixar algum aplicativo?",
                a: "Não. O paciente acessa um link personalizado e pode instalar como app (PWA) direto no celular, com a identidade visual do seu consultório.",
              },
              {
                q: "A IA substitui o psicólogo?",
                a: "De forma alguma. A tecnologia organiza e apoia sua rotina. Toda decisão clínica é revisada e validada exclusivamente por você.",
              },
              {
                q: "Posso usar em clínica com vários profissionais?",
                a: "Sim! O plano Clínica suporta múltiplos profissionais, cada um com acesso apenas aos seus pacientes e financeiro.",
              },
              {
                q: "Posso experimentar antes de pagar?",
                a: "Sim! Todos os planos incluem período de teste gratuito, sem necessidade de cartão de crédito.",
              },
            ].map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="bg-card rounded-xl border border-border px-6 shadow-card">
                <AccordionTrigger className="text-left text-sm font-medium text-foreground hover:no-underline py-4">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          CTA FINAL
      ═══════════════════════════════════════════ */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto gradient-hero rounded-3xl p-14 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-lavender/10 rounded-full blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground leading-tight">
              Sua rotina clínica pode ser mais leve.
            </h2>
            <p className="text-primary-foreground/80 mt-5 max-w-xl mx-auto text-lg">
              Organize sua clínica, atenda melhor seus pacientes e registre suas sessões — 
              com a tecnologia trabalhando ao seu lado.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
              <Button size="lg" className="bg-primary-foreground text-foreground hover:bg-primary-foreground/90 text-base px-10 h-13" asChild>
                <Link to="/login">Testar Gratuitamente <ArrowRight className="w-4 h-4 ml-2" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-base px-8 h-13">
                <Headphones className="w-4 h-4 mr-2" /> Falar com Suporte
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
                  <Heart className="w-4.5 h-4.5 text-primary-foreground" />
                </div>
                <span className="font-display font-bold text-lg text-foreground">Psico Gleego</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-sm">
                Sistema completo de apoio à rotina do psicólogo. 
                Organização, atendimento e registro — tudo em um único lugar.
              </p>
            </div>
            <div>
              <h4 className="font-display font-semibold text-foreground text-sm mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#funcionalidades" className="hover:text-foreground transition-colors">Funcionalidades</a></li>
                <li><a href="#secretaria" className="hover:text-foreground transition-colors">Secretária IA</a></li>
                <li><a href="#planos" className="hover:text-foreground transition-colors">Planos</a></li>
                <li><a href="#faq" className="hover:text-foreground transition-colors">FAQ</a></li>
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
          <div className="border-t border-border mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">© 2026 Psico Gleego. Todos os direitos reservados.</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="w-3 h-3" /> Dados protegidos por criptografia AES-256
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
