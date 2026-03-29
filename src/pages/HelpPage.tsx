import {
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  FileText,
  Heart,
  Video,
  BarChart3,
  Settings,
  Sparkles,
  Bot,
  Bell,
  ClipboardList,
  Shield,
  Building2,
  CreditCard,
  Smile,
  Palette,
  MessageSquare,
  Cpu,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

interface HelpItem {
  icon: typeof LayoutDashboard;
  title: string;
  description: string;
  path: string;
  roles: string[];
  area: "app" | "admin" | "portal";
}

const helpItems: HelpItem[] = [
  // App
  { icon: LayoutDashboard, title: "Dashboard", description: "Visão geral do seu dia: consultas agendadas, pacientes recentes, receita do mês e pagamentos pendentes em um único painel.", path: "/dashboard", roles: ["admin", "professional", "psychologist", "secretary", "financial", "secretary_financial", "superadmin"], area: "app" },
  { icon: Users, title: "Pacientes", description: "Cadastro completo dos pacientes com CPF, endereço (busca por CEP), telefone/WhatsApp, histórico clínico, medicações e alergias. Vincule cada paciente ao profissional responsável.", path: "/pacientes", roles: ["admin", "professional", "psychologist", "superadmin"], area: "app" },
  { icon: Heart, title: "Casais", description: "Gerencie terapias de casal vinculando dois pacientes. Prontuários e testes do casal ficam separados dos individuais, mas os resultados caem na ficha de cada paciente.", path: "/casais", roles: ["admin", "professional", "psychologist", "superadmin"], area: "app" },
  { icon: Calendar, title: "Agenda", description: "Visualize e crie consultas por dia/semana/mês. Secretárias podem agendar para qualquer profissional. Bloqueie horários com motivo descritivo. Filtre por profissional.", path: "/agenda", roles: ["admin", "professional", "psychologist", "secretary", "secretary_financial", "superadmin"], area: "app" },
  { icon: Video, title: "Consultas", description: "Lista de todas as consultas com status (agendada, realizada, cancelada). Registre comparecimento, que gera automaticamente o lançamento financeiro.", path: "/consultas", roles: ["admin", "professional", "psychologist", "secretary", "secretary_financial", "superadmin"], area: "app" },
  { icon: FileText, title: "Prontuários", description: "Registros clínicos protegidos por LGPD — somente o psicólogo responsável tem acesso. Inclua anotações, análises de IA e vincule a sessões específicas.", path: "/prontuarios", roles: ["admin", "professional", "psychologist", "superadmin"], area: "app" },
  { icon: DollarSign, title: "Financeiro", description: "Controle completo: receitas, contas a pagar/receber, fluxo de caixa, baixa de pagamentos. Pacientes podem pagar por sessão ou mensal. Gere cobranças agrupadas e relatórios em PDF.", path: "/financeiro", roles: ["admin", "professional", "psychologist", "financial", "secretary_financial", "superadmin"], area: "app" },
  { icon: ClipboardList, title: "Testes", description: "Crie, edite e envie testes psicológicos aos pacientes. Modelos prontos incluídos. Importe/exporte em JSON. Respostas caem automaticamente no prontuário e dashboard do profissional.", path: "/testes", roles: ["admin", "professional", "psychologist", "superadmin"], area: "app" },
  { icon: Sparkles, title: "Assistente IA", description: "Inteligência artificial para análise de anotações clínicas, sugestões terapêuticas e suporte na elaboração de prontuários. Suporta GPT, Claude e Gemini.", path: "/assistente-ia", roles: ["admin", "professional", "psychologist", "superadmin"], area: "app" },
  { icon: Bot, title: "Secretária IA", description: "Automação de atendimento por WhatsApp: agendamentos, confirmações, lembretes e respostas automáticas para pacientes. Configuração de agentes personalizados.", path: "/secretaria-ia", roles: ["admin", "professional", "psychologist", "superadmin"], area: "app" },
  { icon: Bell, title: "Notificações", description: "Central de notificações: lembretes de consultas, cobranças, novos testes disponíveis e alertas do sistema. Entregues via app (push) e WhatsApp.", path: "/notificacoes", roles: ["admin", "professional", "psychologist", "secretary", "financial", "secretary_financial", "superadmin"], area: "app" },
  { icon: BarChart3, title: "Relatórios", description: "Relatórios detalhados: receita mensal, receita futura, inadimplência, frequência de pacientes e produtividade por profissional. Exporte em PDF.", path: "/relatorios", roles: ["admin", "professional", "psychologist", "financial", "secretary_financial", "superadmin"], area: "app" },
  { icon: Settings, title: "Configurações", description: "Personalize logo, cores e identidade visual do seu consultório/clínica. Configure dados da organização, profissionais e preferências gerais.", path: "/configuracoes", roles: ["admin", "professional", "psychologist", "superadmin"], area: "app" },

  // Portal do Paciente
  { icon: Smile, title: "Humor (Paciente)", description: "O paciente registra seu estado emocional ao longo do dia — similar ao que existe em apps como Cogni. Os dados alimentam um dashboard que só o psicólogo vê.", path: "/portal/humor", roles: ["patient"], area: "portal" },
  { icon: ClipboardList, title: "Testes (Paciente)", description: "Testes enviados pelo psicólogo aparecem aqui. O paciente responde e os resultados vão direto para o prontuário e dashboard do profissional.", path: "/portal/testes", roles: ["patient"], area: "portal" },
  { icon: Calendar, title: "Consultas (Paciente)", description: "Visualize e agende consultas diretamente pelo app. Receba lembretes por push e WhatsApp.", path: "/portal/consultas", roles: ["patient"], area: "portal" },
  { icon: CreditCard, title: "Financeiro (Paciente)", description: "Veja suas cobranças, sessões realizadas e status de pagamento. Receba notificações de cobrança no dia e horário configurados pelo profissional.", path: "/portal/financeiro", roles: ["patient"], area: "portal" },

  // Admin / Superadmin
  { icon: Shield, title: "Painel Admin", description: "Visão geral do sistema: organizações ativas, usuários, métricas globais e gestão de assinaturas.", path: "/admin", roles: ["superadmin"], area: "admin" },
  { icon: Building2, title: "Organizações", description: "Crie e gerencie clínicas e consultórios individuais. Controle status (ativo/suspenso), limites de usuários e planos.", path: "/admin/organizacoes", roles: ["superadmin"], area: "admin" },
  { icon: Users, title: "Usuários (Admin)", description: "Cadastre profissionais com CRP, telefone e especialidade. Defina perfis: Admin, Profissional, Secretária, Financeiro, Secretária+Financeiro.", path: "/admin/usuarios", roles: ["superadmin"], area: "admin" },
  { icon: CreditCard, title: "Planos", description: "Gerencie planos de assinatura (Essencial, Profissional, Clínica) com preços, limites e funcionalidades incluídas.", path: "/admin/planos", roles: ["superadmin"], area: "admin" },
  { icon: Palette, title: "Branding", description: "Configure logo, nome do sistema, favicon e cores globais da plataforma.", path: "/admin/branding", roles: ["superadmin"], area: "admin" },
  { icon: MessageSquare, title: "WhatsApp", description: "Gerencie instâncias de WhatsApp (W-API), configure conexões e monitore status.", path: "/admin/whatsapp", roles: ["superadmin"], area: "admin" },
  { icon: Cpu, title: "Agentes de IA", description: "Crie e configure agentes de IA personalizados para automação e assistência clínica.", path: "/admin/agentes-ia", roles: ["superadmin"], area: "admin" },
  { icon: Cpu, title: "Provedores de IA", description: "Configure chaves de API para OpenAI, Anthropic, Google e outros provedores de IA.", path: "/admin/provedores-ia", roles: ["superadmin"], area: "admin" },
  { icon: Settings, title: "Configurações (Admin)", description: "Configurações globais do sistema: tokens, integrações e parâmetros gerais.", path: "/admin/configuracoes", roles: ["superadmin"], area: "admin" },
];

const roleLabels: Record<string, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  professional: "Profissional",
  psychologist: "Psicólogo",
  secretary: "Secretária",
  financial: "Financeiro",
  secretary_financial: "Sec.+Fin.",
  patient: "Paciente",
};

export default function HelpPage() {
  const { user } = useAuth();
  const role = user?.role || "professional";

  const userRoles = role === "secretary_financial" ? ["secretary_financial", "secretary", "financial"] : [role];
  const isSuperadmin = role === "superadmin";

  const visibleItems = helpItems.filter((item) => {
    if (isSuperadmin) return true;
    return userRoles.some((r) => item.roles.includes(r));
  });

  const appItems = visibleItems.filter((i) => i.area === "app");
  const portalItems = visibleItems.filter((i) => i.area === "portal");
  const adminItems = visibleItems.filter((i) => i.area === "admin");

  const Section = ({ title, items }: { title: string; items: HelpItem[] }) =>
    items.length === 0 ? null : (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.path} className="hover:shadow-card transition-shadow">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-foreground text-sm">{item.title}</h3>
                      {item.roles.length < 8 && (
                        <div className="flex gap-1 flex-wrap">
                          {item.roles.slice(0, 3).map((r) => (
                            <Badge key={r} variant="outline" className="text-[10px] px-1.5 py-0">
                              {roleLabels[r] || r}
                            </Badge>
                          ))}
                          {item.roles.length > 3 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              +{item.roles.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10">
          <HelpCircle className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Central de Ajuda</h1>
          <p className="text-sm text-muted-foreground">
            Conheça todos os módulos disponíveis no sistema e para que serve cada um.
          </p>
        </div>
      </div>

      <Section title="Módulos do Sistema" items={appItems} />
      {portalItems.length > 0 && <Section title="Portal do Paciente" items={portalItems} />}
      {adminItems.length > 0 && <Section title="Administração (Superadmin)" items={adminItems} />}
    </div>
  );
}
