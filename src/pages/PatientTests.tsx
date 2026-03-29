import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, CheckCircle, Clock, ChevronRight, ChevronLeft,
  Send, Loader2, ArrowRight, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { testsApi, type TestAssignment } from "@/lib/portalApi";

export default function PatientTests() {
  const qc = useQueryClient();
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["my-tests"],
    queryFn: () => testsApi.myTests(),
  });

  const { data: testDetail, isLoading: detailLoading } = useQuery<any>({
    queryKey: ["my-test", activeTest],
    queryFn: () => testsApi.getMyTest(activeTest!),
    enabled: !!activeTest,
  });

  const submitMutation = useMutation({
    mutationFn: () => {
      const responses = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));
      return testsApi.respondTest(activeTest!, responses);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-tests"] });
      const completionMsg = testDetail?.template?.completionMessage;
      if (completionMsg) {
        setShowCompletion(true);
      } else {
        toast({ title: "Teste respondido! ✅" });
        resetTest();
      }
    },
    onError: (err: Error) =>
      toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const resetTest = () => {
    setActiveTest(null);
    setAnswers({});
    setCurrentPage(0);
    setShowIntro(true);
    setShowCompletion(false);
  };

  const pending = assignments.filter((a) => a.status === "pending");
  const completed = assignments.filter((a) => a.status === "completed");

  // Active test logic
  if (activeTest && testDetail) {
    const template = testDetail.template;
    const questions = template?.questions || [];
    const perPage = template?.questionsPerPage || 1;
    const totalPages = Math.ceil(questions.length / perPage);
    const introText = template?.introText;
    const completionMessage = template?.completionMessage;

    const pageQuestions = questions.slice(
      currentPage * perPage,
      (currentPage + 1) * perPage
    );
    const allAnswered = questions.every((q) => answers[q.id!]);
    const pageAnswered = pageQuestions.every((q) => answers[q.id!]);
    const isLastPage = currentPage >= totalPages - 1;
    const progress = ((currentPage + 1) / totalPages) * 100;

    // Completion screen
    if (showCompletion) {
      return (
        <div className="max-w-md mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-foreground">
                Teste concluído!
              </h2>
              {completionMessage && (
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed whitespace-pre-wrap">
                  {completionMessage}
                </p>
              )}
            </div>
            <Button onClick={resetTest} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar aos testes
            </Button>
          </motion.div>
        </div>
      );
    }

    // Intro screen
    if (showIntro && introText) {
      return (
        <div className="max-w-md mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <button
              onClick={resetTest}
              className="text-sm text-primary hover:underline"
            >
              ← Voltar
            </button>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <ClipboardList className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-xl font-display font-bold text-foreground">
                {template?.title}
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {introText}
              </p>
              <p className="text-xs text-muted-foreground">
                {questions.length} perguntas
              </p>
            </div>
            <Button
              onClick={() => setShowIntro(false)}
              className="w-full gap-2"
              size="lg"
            >
              Começar <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      );
    }

    // Questions flow
    return (
      <div className="max-w-md mx-auto px-4 py-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              if (currentPage === 0 && introText) {
                setShowIntro(true);
              } else if (currentPage > 0) {
                setCurrentPage((p) => p - 1);
              } else {
                resetTest();
              }
            }}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
          <span className="text-xs text-muted-foreground font-medium">
            {currentPage + 1} / {totalPages}
          </span>
        </div>

        {/* Progress */}
        <Progress value={progress} className="h-1.5" />

        <h2 className="text-base font-display font-semibold text-foreground">
          {template?.title}
        </h2>

        {/* Questions */}
        {detailLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {pageQuestions.map((q, i) => (
                <Card key={q.id}>
                  <CardContent className="pt-5 pb-5">
                    <p className="text-sm font-medium text-foreground mb-4">
                      {currentPage * perPage + i + 1}. {q.text}
                    </p>

                    {q.type === "scale" && q.options?.length > 0 ? (
                      <RadioGroup
                        value={answers[q.id!] || ""}
                        onValueChange={(v) =>
                          setAnswers({ ...answers, [q.id!]: v })
                        }
                        className="space-y-2"
                      >
                        {q.options.map((opt: string, optIdx: number) => (
                          <div
                            key={optIdx}
                            className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                            onClick={() =>
                              setAnswers({
                                ...answers,
                                [q.id!]: String(optIdx),
                              })
                            }
                          >
                            <RadioGroupItem
                              value={String(optIdx)}
                              id={`${q.id}-${optIdx}`}
                            />
                            <Label
                              htmlFor={`${q.id}-${optIdx}`}
                              className="text-sm cursor-pointer flex-1"
                            >
                              {opt}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    ) : q.type === "scale" ? (
                      <div className="space-y-3">
                        <Slider
                          value={[parseInt(answers[q.id!] || "3")]}
                          onValueChange={([v]) =>
                            setAnswers({ ...answers, [q.id!]: String(v) })
                          }
                          min={1}
                          max={5}
                          step={1}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Discordo totalmente</span>
                          <span className="font-bold text-foreground">
                            {answers[q.id!] || "3"}
                          </span>
                          <span>Concordo totalmente</span>
                        </div>
                      </div>
                    ) : q.type === "multiple_choice" ? (
                      <RadioGroup
                        value={answers[q.id!] || ""}
                        onValueChange={(v) =>
                          setAnswers({ ...answers, [q.id!]: v })
                        }
                        className="space-y-2"
                      >
                        {(q.options || []).map((opt: string, optIdx: number) => (
                          <div
                            key={opt}
                            className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                            onClick={() =>
                              setAnswers({ ...answers, [q.id!]: opt })
                            }
                          >
                            <RadioGroupItem
                              value={opt}
                              id={`${q.id}-${opt}`}
                            />
                            <Label
                              htmlFor={`${q.id}-${opt}`}
                              className="text-sm cursor-pointer flex-1"
                            >
                              {opt}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    ) : (
                      <Textarea
                        value={answers[q.id!] || ""}
                        onChange={(e) =>
                          setAnswers({ ...answers, [q.id!]: e.target.value })
                        }
                        placeholder="Sua resposta..."
                        rows={3}
                      />
                    )}
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          {isLastPage ? (
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || !allAnswered}
              className="w-full gap-2"
              size="lg"
            >
              {submitMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Enviar Respostas
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={!pageAnswered}
              className="w-full gap-2"
              size="lg"
            >
              Próxima <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Test list
  return (
    <div className="space-y-6 max-w-md mx-auto px-4 py-5">
      <div>
        <h1 className="text-lg font-display font-bold text-foreground">
          Meus Testes
        </h1>
        <p className="text-xs text-muted-foreground">
          Responda os testes enviados pelo seu psicólogo
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhum teste pendente</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div>
              <h2 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-warning" />
                Pendentes ({pending.length})
              </h2>
              <div className="space-y-2">
                {pending.map((a) => (
                  <motion.div
                    key={a.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      setActiveTest(a.id);
                      setShowIntro(true);
                      setCurrentPage(0);
                      setAnswers({});
                    }}
                    className="cursor-pointer"
                  >
                    <Card className="hover:shadow-md transition-shadow border-warning/30">
                      <CardContent className="pt-4 pb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                            <ClipboardList className="w-5 h-5 text-warning" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {a.template?.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Enviado em{" "}
                              {new Date(a.assignedAt).toLocaleDateString(
                                "pt-BR"
                              )}
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
              <h2 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-success" />
                Respondidos ({completed.length})
              </h2>
              <div className="space-y-2">
                {completed.map((a) => (
                  <Card key={a.id} className="opacity-70">
                    <CardContent className="pt-4 pb-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {a.template?.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Respondido em{" "}
                          {a.completedAt
                            ? new Date(a.completedAt).toLocaleDateString(
                                "pt-BR"
                              )
                            : "—"}
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
