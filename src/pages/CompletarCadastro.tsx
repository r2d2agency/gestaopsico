import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PhoneInputInternational } from "@/components/PhoneInputInternational";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const API = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
    ? "http://localhost:3001/api" 
    : "/api");

export default function CompletarCadastro() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");
  const [patient, setPatient] = useState<any>(null);
  const [form, setForm] = useState({
    phone: "", email: "", birth_date: "", gender: "",
    cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "",
    emergency_contact: "",
  });

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/pacientes/registration/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setLoading(false); return; }
        setPatient(data);
        setForm(prev => ({
          ...prev,
          phone: data.phone || "",
          email: data.email || "",
          birth_date: data.birth_date ? String(data.birth_date).slice(0, 10) : "",
          gender: data.gender || "",
          cep: data.cep || "",
          street: data.street || "",
          number: data.number || "",
          complement: data.complement || "",
          neighborhood: data.neighborhood || "",
          city: data.city || "",
          state: data.state || "",
          emergency_contact: data.emergency_contact || "",
        }));
        setLoading(false);
      })
      .catch(() => { setError("Erro ao carregar dados"); setLoading(false); });
  }, [token]);

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/pacientes/registration/${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCompleted(true);
      toast({ title: "Cadastro completado com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="max-w-md w-full mx-4">
        <CardContent className="p-8 text-center">
          <p className="text-destructive text-lg">{error}</p>
        </CardContent>
      </Card>
    </div>
  );

  if (completed) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">Cadastro Completado!</h2>
            <p className="text-muted-foreground">Seus dados foram atualizados com sucesso. Obrigado!</p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>Complete seu Cadastro</CardTitle>
          <CardDescription>
            Olá{patient?.name ? `, ${patient.name}` : ""}! Por favor, complete seus dados abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Telefone / WhatsApp</Label>
            <PhoneInputInternational value={form.phone} onChange={v => set("phone", v)} placeholder="Seu número" />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="seu@email.com" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data de Nascimento</Label>
              <Input type="date" value={form.birth_date} onChange={e => set("birth_date", e.target.value)} />
            </div>
            <div>
              <Label>Gênero</Label>
              <Select value={form.gender} onValueChange={v => set("gender", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                  <SelectItem value="nao-binario">Não-binário</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                  <SelectItem value="prefiro-nao-informar">Prefiro não informar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>CEP</Label>
              <Input value={form.cep} onChange={e => set("cep", e.target.value)} placeholder="00000-000" />
            </div>
            <div className="col-span-2">
              <Label>Rua</Label>
              <Input value={form.street} onChange={e => set("street", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Número</Label>
              <Input value={form.number} onChange={e => set("number", e.target.value)} />
            </div>
            <div>
              <Label>Complemento</Label>
              <Input value={form.complement} onChange={e => set("complement", e.target.value)} />
            </div>
            <div>
              <Label>Bairro</Label>
              <Input value={form.neighborhood} onChange={e => set("neighborhood", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cidade</Label>
              <Input value={form.city} onChange={e => set("city", e.target.value)} />
            </div>
            <div>
              <Label>Estado</Label>
              <Input value={form.state} onChange={e => set("state", e.target.value)} maxLength={2} />
            </div>
          </div>
          <div>
            <Label>Contato de Emergência</Label>
            <Input value={form.emergency_contact} onChange={e => set("emergency_contact", e.target.value)} placeholder="Nome e telefone" />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : "Completar Cadastro"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
