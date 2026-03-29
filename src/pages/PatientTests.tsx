import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ClipboardList, CheckCircle, Clock, ChevronRight, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { testsApi, type TestAssignment } from "@/lib/portalApi";

export default function PatientTests() {
  const qc = useQueryClient();
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["my-tests"],
    queryFn: () => testsApi.myTests(),
  });

  const { data: testDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["my-test", activeTest],
    queryFn: () => testsApi.getMyTest(activeTest!),
    enabled: !!activeTest,
  });

  const submitMutation = useMutation({
    mutationFn: () => {
      const responses = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer
      }));
      return testsApi.respondTest(activeTest!, responses);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-tests"] });
      toast({ title: "Teste respondido! ✅" });
      setActiveTest(null);
      setAnswers({});
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const pending = assignments.filter(a => a.status === "pending");
  const completed = assignments.filter(a => a.status === "completed");

  if (activeTest && testDetail) {
    const questions = testDetail.template?.questions || [];
    const allAnswered = questions.every(q => answers[q.id!]);

    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <button onClick={() => setActiveTest(null)} className="text-sm text-primary hover:underline mb-2">
            ← Voltar
          </button>
          <h1 className="text-2xl font-display font-bold text-foreground">{testDetail.template?.title}</h1>
          {testDetail.template?.description && (
            <p className="text-muted-foreground mt-1">{testDetail.template.description}</p>
          )}
        </div>

        {detailLoading ? (
          <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
        ) : (
          <>
            {questions.map((q, i) => (
              <motion.div key={q.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-sm font-medium text-foreground mb-3">
                      {i + 1}. {q.text}
                    </p>

                    {q.type === "scale" && (
                      <div className="space-y-2">
                        <Slider
                          value={[parseInt(answers[q.id!] || "3")]}
                          onValueChange={([v]) => setAnswers({ ...answers, [q.id!]: String(v) })}
                          min={1} max={5} step={1}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Discordo totalmente</span>
                          <span className="font-bold text-foreground">{answers[q.id!] || "3"}</span>
                          <span>Concordo totalmente</span>
                        </div>
                      </div>
                    )}

                    {q.type === "multiple_choice" && (
                      <RadioGroup
                        value={answers[q.id!] || ""}
                        onValueChange={v => setAnswers({ ...answers, [q.id!]: v })}
                      >
                        {(q.options || []).map(opt => (
                          <div key={opt} className="flex items-center space-x-2">
                            <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                            <Label htmlFor={`${q.id}-${opt}`}>{opt}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}

                    {q.type === "text" && (
                      <Textarea
                        value={answers[q.id!] || ""}
                        onChange={e => setAnswers({ ...answers, [q.id!]: e.target.value })}
                        placeholder="Sua resposta..."
                        rows={3}
                      />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || !allAnswered}
              className="w-full gap-2 gradient-primary border-0 shadow-glow"
              size="lg"
            >
              {submitMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              Enviar Respostas
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Meus Testes</h1>
        <p className="text-muted-foreground mt-1">Responda os testes enviados pelo seu psicólogo</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Nenhum teste pendente</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div>
              <h2 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-warning" />Pendentes ({pending.length})
              </h2>
              <div className="space-y-2">
                {pending.map(a => (
                  <motion.div
                    key={a.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setActiveTest(a.id)}
                    className="cursor-pointer"
                  >
                    <Card className="hover:shadow-md transition-shadow border-warning/30">
                      <CardContent className="pt-4 pb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                            <ClipboardList className="w-5 h-5 text-warning" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{a.template?.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Enviado em {new Date(a.assignedAt).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <h2 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />Respondidos ({completed.length})
              </h2>
              <div className="space-y-2">
                {completed.map(a => (
                  <Card key={a.id} className="opacity-70">
                    <CardContent className="pt-4 pb-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{a.template?.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Respondido em {a.completedAt ? new Date(a.completedAt).toLocaleDateString("pt-BR") : "—"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
