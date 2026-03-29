import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Palette, Building2, Phone, Mail, MapPin, Save, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { orgSettingsApi, type OrgSettings } from "@/lib/portalApi";

export default function Configuracoes() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<OrgSettings>>({
    logo: "", primaryColor: "", secondaryColor: "", accentColor: "",
    businessName: "", businessPhone: "", businessEmail: "", businessAddress: ""
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["org-settings"],
    queryFn: () => orgSettingsApi.get(),
  });

  useEffect(() => {
    if (settings) setForm({ ...settings });
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () => orgSettingsApi.update(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-settings"] });
      toast({ title: "Configurações salvas!" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const set = (field: keyof OrgSettings, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  if (isLoading) return <div className="text-center py-16 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Configurações</h1>
          <p className="text-sm text-muted-foreground">Personalize sua clínica e marca</p>
        </div>
        <Button className="gap-2" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Identidade Visual */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Palette className="w-5 h-5 text-primary" /> Identidade Visual</CardTitle>
              <CardDescription>Personalize as cores e logo da sua clínica</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>URL do Logo</Label>
                <Input value={form.logo || ""} onChange={e => set("logo", e.target.value)} placeholder="https://..." />
                {form.logo && (
                  <div className="mt-2 p-3 bg-muted rounded-lg flex items-center justify-center">
                    <img src={form.logo} alt="Logo" className="max-h-16 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Cor Primária</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={form.primaryColor || "#7c3aed"} onChange={e => set("primaryColor", e.target.value)} className="w-12 h-10 p-1 cursor-pointer" />
                    <Input value={form.primaryColor || ""} onChange={e => set("primaryColor", e.target.value)} placeholder="#7c3aed" className="flex-1" />
                  </div>
                </div>
                <div>
                  <Label>Cor Secundária</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={form.secondaryColor || "#a78bfa"} onChange={e => set("secondaryColor", e.target.value)} className="w-12 h-10 p-1 cursor-pointer" />
                    <Input value={form.secondaryColor || ""} onChange={e => set("secondaryColor", e.target.value)} placeholder="#a78bfa" className="flex-1" />
                  </div>
                </div>
                <div>
                  <Label>Cor de Destaque</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={form.accentColor || "#ec4899"} onChange={e => set("accentColor", e.target.value)} className="w-12 h-10 p-1 cursor-pointer" />
                    <Input value={form.accentColor || ""} onChange={e => set("accentColor", e.target.value)} placeholder="#ec4899" className="flex-1" />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 rounded-xl border border-border" style={{
                background: `linear-gradient(135deg, ${form.primaryColor || '#7c3aed'}, ${form.secondaryColor || '#a78bfa'})`
              }}>
                <div className="flex items-center gap-3">
                  {form.logo ? (
                    <img src={form.logo} alt="Preview" className="w-10 h-10 rounded-lg object-contain bg-white/20 p-1" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div>
                    <p className="font-display font-bold text-white">{form.businessName || "Sua Clínica"}</p>
                    <p className="text-xs text-white/70">Preview da marca</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Dados da Clínica */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Dados da Clínica</CardTitle>
              <CardDescription>Informações exibidas para pacientes e em relatórios</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nome da Clínica</Label>
                <Input value={form.businessName || ""} onChange={e => set("businessName", e.target.value)} placeholder="Clínica Psicologia Integrada" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1"><Phone className="w-3 h-3" />Telefone</Label>
                  <Input value={form.businessPhone || ""} onChange={e => set("businessPhone", e.target.value)} placeholder="(11) 99999-9999" />
                </div>
                <div>
                  <Label className="flex items-center gap-1"><Mail className="w-3 h-3" />E-mail</Label>
                  <Input type="email" value={form.businessEmail || ""} onChange={e => set("businessEmail", e.target.value)} placeholder="contato@clinica.com" />
                </div>
              </div>
              <div>
                <Label className="flex items-center gap-1"><MapPin className="w-3 h-3" />Endereço</Label>
                <Input value={form.businessAddress || ""} onChange={e => set("businessAddress", e.target.value)} placeholder="Rua das Flores, 123" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
