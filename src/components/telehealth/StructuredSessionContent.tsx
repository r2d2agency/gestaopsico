import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  FileText, Brain, ClipboardList, Target, Eye, TestTube, Activity,
  Lightbulb, ArrowRight, BookOpen, Stethoscope, Copy, Check
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface StructuredData {
  registro_consulta?: {
    historico_paciente?: {
      queixas_previas?: string[];
      consultas_previas?: string[];
      condicoes_psiquiatricas?: string[];
      medicacoes_em_uso?: string[];
    };
  };
  queixa_principal?: string[];
  objetivo?: string;
  observacoes?: string[];
  testes_psicologicos?: string[];
  avaliacao?: string;
  planos?: {
    intervencoes?: string[];
    encaminhamento?: string[];
  };
  estrategias?: {
    categorias?: Array<{ titulo: string; itens: string[] }>;
  };
  sugestoes_cid?: string;
  temas_abordados?: string[];
  resumo?: string;
  pontos_principais?: string[];
  motivo_sessao?: string;
  observacoes_relevantes?: string | string[];
  evolucao?: string | string[];
  encaminhamentos?: string | string[];
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
    </Button>
  );
}

function SectionHeader({ icon, title, copyText }: { icon: React.ReactNode; title: string; copyText?: string }) {
  return (
    <div className="flex items-center justify-between group">
      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {copyText && <CopyButton text={copyText} />}
    </div>
  );
}

function SubSection({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0 || (items.length === 1 && items[0].toLowerCase().includes("não mencionado"))) {
    return (
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground italic">Não mencionado.</p>
      </div>
    );
  }
  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground mb-1">{title}</h4>
      <ul className="list-disc list-inside space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-foreground leading-relaxed">{item}</li>
        ))}
      </ul>
    </div>
  );
}

function toArray(val?: string | string[]): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

function sectionToText(title: string, items: string[]): string {
  return `${title}:\n${items.map(i => `• ${i}`).join("\n")}`;
}

export default function StructuredSessionContent({ data, compact = false }: { data: string | object; compact?: boolean }) {
  let sc: StructuredData;
  try {
    sc = typeof data === "string" ? JSON.parse(data) : data;
  } catch {
    return null;
  }

  // Check if it's the new structured format or legacy
  const isNewFormat = !!(sc.registro_consulta || sc.queixa_principal || sc.avaliacao || sc.planos || sc.estrategias || sc.sugestoes_cid);

  if (!isNewFormat) {
    // Legacy format rendering
    return (
      <div className="space-y-3 bg-accent/30 border border-border rounded-xl p-4">
        <SectionHeader icon={<Brain className="h-4 w-4 text-primary" />} title="Conteúdo Organizado pela IA" />
        <div className="space-y-3">
          {sc.motivo_sessao && (
            <div><p className="text-xs font-medium text-primary">Motivo da Sessão</p><p className="text-sm text-foreground">{sc.motivo_sessao}</p></div>
          )}
          {sc.temas_abordados && sc.temas_abordados.length > 0 && (
            <div><p className="text-xs font-medium text-primary">Temas Abordados</p><div className="flex flex-wrap gap-1 mt-1">{sc.temas_abordados.map((t, i) => <Badge key={i} variant="secondary">{t}</Badge>)}</div></div>
          )}
          {sc.observacoes_relevantes && (
            <div><p className="text-xs font-medium text-primary">Observações</p><p className="text-sm text-foreground">{typeof sc.observacoes_relevantes === "string" ? sc.observacoes_relevantes : toArray(sc.observacoes_relevantes).join("; ")}</p></div>
          )}
          {sc.evolucao && (
            <div><p className="text-xs font-medium text-primary">Evolução</p><p className="text-sm text-foreground">{typeof sc.evolucao === "string" ? sc.evolucao : toArray(sc.evolucao).join("; ")}</p></div>
          )}
          {sc.encaminhamentos && (
            <div><p className="text-xs font-medium text-primary">Próximos Passos</p><p className="text-sm text-foreground">{typeof sc.encaminhamentos === "string" ? sc.encaminhamentos : toArray(sc.encaminhamentos).join("; ")}</p></div>
          )}
          {sc.resumo && (
            <div><p className="text-xs font-medium text-primary">Resumo</p><p className="text-sm text-foreground">{sc.resumo}</p></div>
          )}
        </div>
      </div>
    );
  }

  const hist = sc.registro_consulta?.historico_paciente;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Registro da Consulta</h2>
        <Badge variant="outline" className="ml-auto text-xs">Gerado por IA</Badge>
      </div>

      {/* Histórico do Paciente */}
      {hist && (
        <Card className="border-primary/10 bg-accent/20 group">
          <CardContent className="p-4 md:p-5 space-y-4">
            <SectionHeader
              icon={<BookOpen className="h-4 w-4 text-primary" />}
              title="Histórico do Paciente"
              copyText={[
                sectionToText("Queixas prévias", hist.queixas_previas || []),
                sectionToText("Consultas prévias", hist.consultas_previas || []),
                sectionToText("Condições psiquiátricas", hist.condicoes_psiquiatricas || []),
                sectionToText("Medicações em uso", hist.medicacoes_em_uso || []),
              ].join("\n\n")}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SubSection title="Queixas prévias" items={hist.queixas_previas} />
              <SubSection title="Consultas prévias" items={hist.consultas_previas} />
              <SubSection title="Condições psiquiátricas" items={hist.condicoes_psiquiatricas} />
              <SubSection title="Medicações em uso" items={hist.medicacoes_em_uso} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Queixa Principal */}
      {sc.queixa_principal && sc.queixa_principal.length > 0 && (
        <Card className="border-primary/10 bg-accent/20 group">
          <CardContent className="p-4 md:p-5 space-y-2">
            <SectionHeader
              icon={<ClipboardList className="h-4 w-4 text-primary" />}
              title="Queixa Principal"
              copyText={sc.queixa_principal.map(q => `• ${q}`).join("\n")}
            />
            <ul className="list-disc list-inside space-y-1.5">
              {sc.queixa_principal.map((q, i) => (
                <li key={i} className="text-sm text-foreground leading-relaxed">{q}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Objetivo */}
      {sc.objetivo && !sc.objetivo.toLowerCase().includes("não mencionado") && (
        <Card className="border-primary/10 bg-accent/20 group">
          <CardContent className="p-4 md:p-5 space-y-2">
            <SectionHeader icon={<Target className="h-4 w-4 text-primary" />} title="Objetivo" copyText={sc.objetivo} />
            <p className="text-sm text-foreground leading-relaxed">{sc.objetivo}</p>
          </CardContent>
        </Card>
      )}

      {/* Observações */}
      {sc.observacoes && sc.observacoes.length > 0 && (
        <Card className="border-primary/10 bg-accent/20 group">
          <CardContent className="p-4 md:p-5 space-y-2">
            <SectionHeader
              icon={<Eye className="h-4 w-4 text-primary" />}
              title="Observações Clínicas"
              copyText={sc.observacoes.map(o => `• ${o}`).join("\n")}
            />
            <ul className="list-disc list-inside space-y-1.5">
              {sc.observacoes.map((o, i) => (
                <li key={i} className="text-sm text-foreground leading-relaxed">{o}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Testes Psicológicos */}
      {sc.testes_psicologicos && sc.testes_psicologicos.length > 0 && !sc.testes_psicologicos.every(t => t.toLowerCase().includes("não mencionado")) && (
        <Card className="border-primary/10 bg-accent/20 group">
          <CardContent className="p-4 md:p-5 space-y-2">
            <SectionHeader icon={<TestTube className="h-4 w-4 text-primary" />} title="Testes Psicológicos" />
            <ul className="list-disc list-inside space-y-1.5">
              {sc.testes_psicologicos.map((t, i) => (
                <li key={i} className="text-sm text-foreground leading-relaxed">{t}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Avaliação */}
      {sc.avaliacao && (
        <Card className="border-primary/10 bg-primary/5 group">
          <CardContent className="p-4 md:p-5 space-y-2">
            <SectionHeader icon={<Activity className="h-4 w-4 text-primary" />} title="Avaliação" copyText={sc.avaliacao} />
            <p className="text-sm text-foreground leading-relaxed">{sc.avaliacao}</p>
          </CardContent>
        </Card>
      )}

      {/* Planos: Intervenções + Encaminhamento */}
      {sc.planos && (sc.planos.intervencoes?.length || sc.planos.encaminhamento?.length) && (
        <Card className="border-primary/10 bg-accent/20 group">
          <CardContent className="p-4 md:p-5 space-y-4">
            <SectionHeader icon={<ArrowRight className="h-4 w-4 text-primary" />} title="Planos" />
            {sc.planos.intervencoes && sc.planos.intervencoes.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Intervenções</h4>
                <ul className="list-disc list-inside space-y-1.5">
                  {sc.planos.intervencoes.map((int, i) => (
                    <li key={i} className="text-sm text-foreground leading-relaxed">{int}</li>
                  ))}
                </ul>
              </div>
            )}
            {sc.planos.encaminhamento && sc.planos.encaminhamento.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Encaminhamento</h4>
                <ul className="list-disc list-inside space-y-1.5">
                  {sc.planos.encaminhamento.map((enc, i) => (
                    <li key={i} className="text-sm text-foreground leading-relaxed">{enc}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Estratégias */}
      {sc.estrategias?.categorias && sc.estrategias.categorias.length > 0 && (
        <Card className="border-primary/10 bg-accent/20 group">
          <CardContent className="p-4 md:p-5 space-y-4">
            <SectionHeader icon={<Lightbulb className="h-4 w-4 text-primary" />} title="Estratégias" />
            {sc.estrategias.categorias.map((cat, i) => (
              <div key={i}>
                <h4 className="text-sm font-semibold text-foreground mb-1">{cat.titulo}:</h4>
                <ul className="list-disc list-inside space-y-1 ml-1">
                  {cat.itens.map((item, j) => (
                    <li key={j} className="text-sm text-foreground leading-relaxed">{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Sugestões de CID */}
      {sc.sugestoes_cid && !sc.sugestoes_cid.toLowerCase().includes("não mencionado") && (
        <Card className="border-primary/10 bg-accent/20 group">
          <CardContent className="p-4 md:p-5 space-y-2">
            <SectionHeader icon={<Stethoscope className="h-4 w-4 text-primary" />} title="Sugestões de CID" copyText={sc.sugestoes_cid} />
            <p className="text-sm text-foreground leading-relaxed">{sc.sugestoes_cid}</p>
          </CardContent>
        </Card>
      )}

      {/* Temas Abordados */}
      {sc.temas_abordados && sc.temas_abordados.length > 0 && (
        <div className="pt-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">Temas Abordados</p>
          <div className="flex flex-wrap gap-1.5">
            {sc.temas_abordados.map((t, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Resumo */}
      {sc.resumo && !compact && (
        <Card className="border-primary/20 bg-primary/5 group">
          <CardContent className="p-4 md:p-5 space-y-2">
            <SectionHeader icon={<FileText className="h-4 w-4 text-primary" />} title="Resumo da Sessão" copyText={sc.resumo} />
            <p className="text-sm text-foreground leading-relaxed">{sc.resumo}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
