import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pacientesApi, type Patient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Brain, Save, Edit3, X, Target, Shield, Zap, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  patient: Patient;
}

export default function ClinicalMap({ patient }: Props) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    emotional_patterns: patient.emotional_patterns || "",
    triggers: patient.triggers || "",
    defense_mechanisms: patient.defense_mechanisms || "",
    dominant_themes: patient.dominant_themes || "",
  });

  useEffect(() => {
    setFormData({
      emotional_patterns: patient.emotional_patterns || "",
      triggers: patient.triggers || "",
      defense_mechanisms: patient.defense_mechanisms || "",
      dominant_themes: patient.dominant_themes || "",
    });
  }, [patient]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Patient>) => pacientesApi.update(patient.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient", patient.id] });
      toast.success("Mapa clínico atualizado com sucesso!");
      setIsEditing(false);
    },
    onError: () => {
      toast.error("Erro ao atualizar mapa clínico");
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const fields = [
    { id: "dominant_themes", label: "Temas Dominantes", icon: Target, placeholder: "Ex: Medo de abandono, busca por validação externa...", color: "text-primary" },
    { id: "emotional_patterns", label: "Padrões Emocionais", icon: Heart, placeholder: "Ex: Oscilação entre euforia e apatia, ansiedade antecipatória...", color: "text-rose-500" },
    { id: "triggers", label: "Gatilhos", icon: Zap, placeholder: "Ex: Críticas no trabalho, silêncio do parceiro...", color: "text-amber-500" },
    { id: "defense_mechanisms", label: "Mecanismos de Defesa", icon: Shield, placeholder: "Ex: Projeção, intelectualização, negação...", color: "text-emerald-500" },
  ];

  return (
    <Card className="border-border/60 overflow-hidden">
      <CardHeader className="pb-3 flex flex-row items-center justify-between bg-muted/30">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          Mapa Clínico Premium
        </CardTitle>
        <Button 
          variant={isEditing ? "ghost" : "outline"} 
          size="sm" 
          onClick={() => setIsEditing(!isEditing)}
          className="h-8 gap-1.5"
        >
          {isEditing ? (
            <><X className="w-3.5 h-3.5" /> Cancelar</>
          ) : (
            <><Edit3 className="w-3.5 h-3.5" /> Editar Mapa</>
          )}
        </Button>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <field.icon className={`w-4 h-4 ${field.color}`} />
                <Label htmlFor={field.id} className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {field.label}
                </Label>
              </div>
              
              <AnimatePresence mode="wait">
                {isEditing ? (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    key={`edit-${field.id}`}
                  >
                    <Textarea
                      id={field.id}
                      placeholder={field.placeholder}
                      className="min-h-[100px] resize-none bg-background focus:ring-1 focus:ring-primary"
                      value={(formData as any)[field.id]}
                      onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={`view-${field.id}`}
                    className="p-3 rounded-lg bg-muted/30 border border-border/40 min-h-[100px]"
                  >
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {(patient as any)[field.id] || (
                        <span className="text-muted-foreground italic">Nenhum registro definido ainda.</span>
                      )}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {isEditing && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-end pt-2"
          >
            <Button 
              onClick={handleSave} 
              disabled={updateMutation.isPending}
              className="gradient-primary shadow-glow"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? "Salvando..." : "Salvar Mapa Clínico"}
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
