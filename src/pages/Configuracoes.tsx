import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Palette, Building2, Phone, Mail, MapPin, Save, Loader2, ImageIcon, Upload,
  UserPlus, Users, Power, PowerOff, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { orgSettingsApi, type OrgSettings } from "@/lib/portalApi";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
export default function Configuracoes() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 2MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      set("logo", reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Team management
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [teamForm, setTeamForm] = useState({ name: "", email: "", password: "", role: "professional", crp: "", phone: "", specialty: "" });

  const { data: teamData } = useQuery<{ data: any[]; total: number }>({
    queryKey: ["team"],
    queryFn: () => apiRequest("/team"),
    enabled: isAdmin,
  });

  const createTeamMember = useMutation({
    mutationFn: (data: any) => apiRequest("/team", { method: "POST", body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team"] });
      toast({ title: "Membro adicionado à equipe!" });
      setTeamDialogOpen(false);
      setTeamForm({ name: "", email: "", password: "", role: "professional", crp: "", phone: "", specialty: "" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const toggleTeamStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest(`/team/${id}/status`, { method: "PATCH", body: { status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team"] });
      toast({ title: "Status atualizado!" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const roleLabels: Record<string, string> = {
    admin: "Admin", professional: "Psicólogo(a)", secretary: "Secretária",
    financial: "Financeiro", secretary_financial: "Sec.+Fin.", superadmin: "Superadmin",
  };

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
              {/* Logo Upload */}
              <div>
                <Label>Logo</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <div className="flex items-center gap-3 mt-1">
                  {form.logo ? (
                    <div className="relative group">
                      <img src={form.logo} alt="Logo" className="w-16 h-16 rounded-lg object-contain border border-border bg-muted p-1" />
                      <button
                        onClick={() => set("logo", "")}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >×</button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted">
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-3.5 h-3.5 mr-1.5" />Enviar Logo
                    </Button>
                    <span className="text-xs text-muted-foreground">PNG, JPG ou SVG (máx. 2MB)</span>
                  </div>
                </div>
                <div className="mt-2">
                  <Label className="text-xs text-muted-foreground">Ou cole a URL:</Label>
                  <Input value={form.logo?.startsWith("data:") ? "" : form.logo || ""} onChange={e => set("logo", e.target.value)} placeholder="https://..." className="mt-1" />
                </div>
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

      {/* Team Management */}
      {isAdmin && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Equipe</CardTitle>
                  <CardDescription>Gerencie psicólogos, secretárias e financeiros da sua organização</CardDescription>
                </div>
                <Button size="sm" onClick={() => setTeamDialogOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />Novo Membro
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!teamData?.data?.length ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum membro na equipe ainda</p>
              ) : (
                <div className="space-y-2">
                  {teamData.data.map((member: any) => (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">
                            {member.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{member.name}</p>
                            <Badge variant="outline" className="text-xs">{roleLabels[member.role] || member.role}</Badge>
                            <Badge variant={member.status === "active" ? "default" : "secondary"} className="text-xs">
                              {member.status === "active" ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {member.email}
                            {member.crp && <> · <span className="text-primary">{member.crp}</span></>}
                            {member.specialty && <> · {member.specialty}</>}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleTeamStatus.mutate({ id: member.id, status: member.status === "active" ? "inactive" : "active" })}
                      >
                        {member.status === "active" ? <PowerOff className="w-4 h-4 text-destructive" /> : <Power className="w-4 h-4 text-green-600" />}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create Team Member Dialog */}
          <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
            <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Novo Membro da Equipe</DialogTitle>
                <DialogDescription>Adicione um psicólogo, secretária ou financeiro à sua organização</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome *</Label>
                    <Input value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} placeholder="Nome completo" />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input type="email" value={teamForm.email} onChange={(e) => setTeamForm({ ...teamForm, email: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Senha *</Label>
                    <Input type="password" value={teamForm.password} onChange={(e) => setTeamForm({ ...teamForm, password: e.target.value })} />
                  </div>
                  <div>
                    <Label>Perfil *</Label>
                    <Select value={teamForm.role} onValueChange={(v) => setTeamForm({ ...teamForm, role: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Psicólogo(a)</SelectItem>
                        <SelectItem value="secretary">Secretária</SelectItem>
                        <SelectItem value="financial">Financeiro</SelectItem>
                        <SelectItem value="secretary_financial">Secretária + Financeiro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {teamForm.role === "professional" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>CRP</Label>
                      <Input value={teamForm.crp} onChange={(e) => setTeamForm({ ...teamForm, crp: e.target.value })} placeholder="CRP 06/123456" />
                    </div>
                    <div>
                      <Label>Especialidade</Label>
                      <Input value={teamForm.specialty} onChange={(e) => setTeamForm({ ...teamForm, specialty: e.target.value })} placeholder="TCC, Psicanálise..." />
                    </div>
                  </div>
                )}
                <div>
                  <Label>Telefone</Label>
                  <Input value={teamForm.phone} onChange={(e) => setTeamForm({ ...teamForm, phone: e.target.value })} placeholder="(11) 99999-9999" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTeamDialogOpen(false)}>Cancelar</Button>
                <Button
                  onClick={() => createTeamMember.mutate({
                    ...teamForm,
                    crp: teamForm.crp || undefined,
                    phone: teamForm.phone || undefined,
                    specialty: teamForm.specialty || undefined,
                  })}
                  disabled={createTeamMember.isPending || !teamForm.name || !teamForm.email || !teamForm.password}
                >
                  {createTeamMember.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Criar Membro
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>
      )}
    </div>
  );
}
