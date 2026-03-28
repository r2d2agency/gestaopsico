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
} from "lucide-react";

const features = [
  { icon: Calendar, title: "Agendamento Inteligente", desc: "Agenda completa com confirmação automática e lembretes para pacientes." },
  { icon: Video, title: "Consulta por Vídeo", desc: "Videochamada integrada com sala exclusiva por consulta, individual ou casal." },
  { icon: Brain, title: "Prontuário com IA", desc: "Transcrição automática e geração de prontuário inteligente pós-consulta." },
  { icon: FileText, title: "Prontuário Eletrônico", desc: "Prontuário completo com histórico, evolução clínica e exportação em PDF." },
  { icon: DollarSign, title: "Financeiro Integrado", desc: "Controle de pagamentos, recibos e relatórios de faturamento automáticos." },
  { icon: Heart, title: "Terapia de Casal", desc: "Gestão de vínculos de casal com prontuário conjunto e sessões compartilhadas." },
];

const benefits = [
  "Reduza o trabalho administrativo em 70%",
  "Prontuários gerados automaticamente por IA",
  "Tudo em um único sistema integrado",
  "Conformidade total com a LGPD",
  "Acesse de qualquer lugar, a qualquer hora",
  "Suporte a atendimento individual e de casal",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-sm">CS</span>
            </div>
            <span className="font-display font-bold text-lg text-foreground">ClínicaSaúde</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#benefits" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Benefícios</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Planos</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link to="/dashboard">Entrar</Link>
            </Button>
            <Button asChild>
              <Link to="/dashboard">Começar Grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-6">
              <Brain className="w-4 h-4" /> Prontuário com Inteligência Artificial
            </span>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground leading-tight max-w-4xl mx-auto">
              Gestão clínica completa para{" "}
              <span className="text-primary">profissionais da saúde</span>
            </h1>
            <p className="text-lg text-muted-foreground mt-6 max-w-2xl mx-auto">
              Agenda, consultas online, prontuário eletrônico inteligente e financeiro integrado.
              Tudo o que você precisa em uma única plataforma.
            </p>
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button size="lg" asChild>
                <Link to="/dashboard">
                  Começar Gratuitamente <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline">
                Ver Demonstração
              </Button>
            </div>
            <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-success" /> Grátis por 14 dias</span>
              <span className="flex items-center gap-1"><Shield className="w-4 h-4 text-success" /> LGPD Compliant</span>
              <span className="flex items-center gap-1"><Users className="w-4 h-4 text-success" /> +500 profissionais</span>
            </div>
          </motion.div>

          {/* Dashboard preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16 rounded-2xl border border-border shadow-lg overflow-hidden bg-card max-w-5xl mx-auto"
          >
            <div className="bg-muted/50 px-4 py-2.5 flex items-center gap-2 border-b border-border">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-warning/60" />
              <div className="w-3 h-3 rounded-full bg-success/60" />
              <span className="text-xs text-muted-foreground ml-2">app.clinicasaude.com.br</span>
            </div>
            <div className="p-8 grid grid-cols-4 gap-4">
              {[
                { label: "Consultas Hoje", value: "5", color: "text-primary" },
                { label: "Pacientes", value: "127", color: "text-info" },
                { label: "Faturamento", value: "R$ 18.5k", color: "text-success" },
                { label: "Pendentes", value: "R$ 2.4k", color: "text-warning" },
              ].map((stat, i) => (
                <div key={i} className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className={`text-2xl font-display font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Tudo que você precisa, em um só lugar
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Uma plataforma completa para gerenciar sua clínica com eficiência e modernidade.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-xl p-6 border border-border shadow-card hover:shadow-card-hover transition-shadow"
              >
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-foreground text-lg">{f.title}</h3>
                <p className="text-muted-foreground text-sm mt-2">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="py-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Foque no que importa:{" "}
              <span className="text-primary">seus pacientes</span>
            </h2>
            <p className="text-muted-foreground mt-4">
              Automatize tarefas administrativas e dedique mais tempo ao atendimento de qualidade.
            </p>
            <div className="mt-8 space-y-4">
              {benefits.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3"
                >
                  <CheckCircle className="w-5 h-5 text-success shrink-0" />
                  <span className="text-foreground">{b}</span>
                </motion.div>
              ))}
            </div>
            <Button className="mt-8" size="lg" asChild>
              <Link to="/dashboard">Experimentar Agora <ArrowRight className="w-4 h-4 ml-2" /></Link>
            </Button>
          </div>
          <div className="bg-card rounded-2xl border border-border shadow-lg p-8">
            <div className="space-y-4">
              {[
                { time: "08:00", name: "Ana Silva", type: "Individual", status: "bg-success" },
                { time: "09:30", name: "Carlos & Maria", type: "Casal", status: "bg-success" },
                { time: "11:00", name: "João Oliveira", type: "Individual", status: "bg-warning" },
              ].map((apt, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-mono text-muted-foreground w-12">{apt.time}</span>
                  <div className={`w-2 h-2 rounded-full ${apt.status}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{apt.name}</p>
                    <p className="text-xs text-muted-foreground">{apt.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto gradient-hero rounded-2xl p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground">
            Comece a transformar sua prática clínica hoje
          </h2>
          <p className="text-primary-foreground/70 mt-4 max-w-xl mx-auto">
            Junte-se a mais de 500 profissionais que já modernizaram sua gestão clínica.
          </p>
          <Button size="lg" className="mt-8 bg-primary-foreground text-foreground hover:bg-primary-foreground/90" asChild>
            <Link to="/dashboard">Criar Conta Gratuita <ArrowRight className="w-4 h-4 ml-2" /></Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-xs">CS</span>
            </div>
            <span className="text-sm text-muted-foreground">© 2026 ClínicaSaúde. Todos os direitos reservados.</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
            <a href="#" className="hover:text-foreground transition-colors">Termos</a>
            <a href="#" className="hover:text-foreground transition-colors">Suporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
