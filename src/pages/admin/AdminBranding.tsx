import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Palette, Upload, Type, Image, Loader2, CheckCircle, Eye, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { settingsApi } from "@/lib/plansApi";

const COLOR_PRESETS = [
  { name: "Indigo", primary: "234 89% 74%", accent: "250 95% 76%" },
  { name: "Esmeralda", primary: "160 84% 39%", accent: "158 64% 52%" },
  { name: "Rosa", primary: "330 81% 60%", accent: "340 75% 55%" },
  { name: "Azul", primary: "217 91% 60%", accent: "213 94% 68%" },
  { name: "Roxo", primary: "270 76% 53%", accent: "280 68% 60%" },
  { name: "Âmbar", primary: "38 92% 50%", accent: "32 95% 44%" },
];

export default function AdminBranding() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const [appName, setAppName] = useState("PsicoGest");
  const [appSubtitle, setAppSubtitle] = useState("Gestão Clínica");
  const [primaryColor, setPrimaryColor] = useState("234 89% 74%");
  const [accentColor, setAccentColor] = useState("250 95% 76%");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => settingsApi.getAll(),
    retry: false,
  });

  useEffect(() => {
    if (settings) {
      if (settings.app_name) setAppName(settings.app_name);
      if (settings.app_subtitle) setAppSubtitle(settings.app_subtitle);
      if (settings.primary_color) setPrimaryColor(settings.primary_color);
      if (settings.accent_color) setAccentColor(settings.accent_color);
      if (settings.logo_url) setLogoPreview(settings.logo_url);
      if (settings.favicon_url) setFaviconPreview(settings.favicon_url);
    }
  }, [settings]);

  const saveSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      return settingsApi.set(key, value);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
  });

  const saveAll = async () => {
    try {
      await Promise.all([
        saveSetting.mutateAsync({ key: "app_name", value: appName }),
        saveSetting.mutateAsync({ key: "app_subtitle", value: appSubtitle }),
        saveSetting.mutateAsync({ key: "primary_color", value: primaryColor }),
        saveSetting.mutateAsync({ key: "accent_color", value: accentColor }),
      ]);

      // Handle logo upload as base64
      if (logoFile) {
        const base64 = await fileToBase64(logoFile);
        await saveSetting.mutateAsync({ key: "logo_url", value: base64 });
      }
      if (faviconFile) {
        const base64 = await fileToBase64(faviconFile);
        await saveSetting.mutateAsync({ key: "favicon_url", value: base64 });
      }

      // Apply colors live
      applyColors(primaryColor, accentColor);

      // Apply favicon
      if (faviconFile) {
        const base64 = await fileToBase64(faviconFile);
        applyFavicon(base64);
      }

      toast({ title: "Branding salvo com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 2MB", variant: "destructive" });
      return;
    }
    setLogoFile(file);
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
  };

  const handleFaviconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 512KB", variant: "destructive" });
      return;
    }
    setFaviconFile(file);
    const url = URL.createObjectURL(file);
    setFaviconPreview(url);
  };

  const applyColors = (primary: string, accent: string) => {
    document.documentElement.style.setProperty("--primary", primary);
    document.documentElement.style.setProperty("--accent", accent);
  };

  const applyFavicon = (url: string) => {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = url;
  };

  const applyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setPrimaryColor(preset.primary);
    setAccentColor(preset.accent);
    applyColors(preset.primary, preset.accent);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Identidade Visual</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure logo, nome, cores e favicon do sistema
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* App Name & Subtitle */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="w-5 h-5 text-primary" /> Nome do Sistema
              </CardTitle>
              <CardDescription>Nome exibido na sidebar, login e portal do paciente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nome do App</Label>
                <Input value={appName} onChange={e => setAppName(e.target.value)} placeholder="PsicoGest" />
              </div>
              <div>
                <Label>Subtítulo</Label>
                <Input value={appSubtitle} onChange={e => setAppSubtitle(e.target.value)} placeholder="Gestão Clínica" />
              </div>
              {/* Preview */}
              <div className="mt-4 p-4 bg-sidebar rounded-lg">
                <div className="flex items-center gap-3">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-9 h-9 rounded-lg object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                      <span className="text-primary-foreground font-bold text-sm">
                        {appName.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-sm text-sidebar-primary">{appName}</p>
                    <p className="text-xs text-sidebar-foreground/60">{appSubtitle}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Logo Upload */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5 text-primary" /> Logo
              </CardTitle>
              <CardDescription>Logo exibida na sidebar e no portal (PNG/SVG, máx 2MB)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input ref={fileInputRef} type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" className="hidden" onChange={handleLogoSelect} />

              {logoPreview ? (
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                    <img src={logoPreview} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-2" />Trocar
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setLogoPreview(null); setLogoFile(null); }}>
                      <Trash2 className="w-4 h-4 mr-2" />Remover
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
                >
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Clique para enviar logo</p>
                  <p className="text-xs text-muted-foreground">PNG, SVG ou JPG até 2MB</p>
                </button>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Colors */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" /> Cores do Sistema
              </CardTitle>
              <CardDescription>Cor primária e de destaque usadas em todo o sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Presets */}
              <div>
                <Label className="text-xs mb-2 block">Paletas prontas</Label>
                <div className="grid grid-cols-3 gap-2">
                  {COLOR_PRESETS.map(p => (
                    <button
                      key={p.name}
                      onClick={() => applyPreset(p)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-xs font-medium ${
                        primaryColor === p.primary
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border hover:border-primary/30 text-muted-foreground"
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: `hsl(${p.primary})` }} />
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cor Primária (HSL)</Label>
                  <div className="flex gap-2 items-center">
                    <div className="w-8 h-8 rounded-lg border border-border" style={{ backgroundColor: `hsl(${primaryColor})` }} />
                    <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} placeholder="234 89% 74%" className="font-mono text-xs" />
                  </div>
                </div>
                <div>
                  <Label>Cor de Destaque (HSL)</Label>
                  <div className="flex gap-2 items-center">
                    <div className="w-8 h-8 rounded-lg border border-border" style={{ backgroundColor: `hsl(${accentColor})` }} />
                    <Input value={accentColor} onChange={e => setAccentColor(e.target.value)} placeholder="250 95% 76%" className="font-mono text-xs" />
                  </div>
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={() => applyColors(primaryColor, accentColor)} className="gap-2">
                <Eye className="w-4 h-4" />Pré-visualizar
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Favicon */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5 text-primary" /> Favicon
              </CardTitle>
              <CardDescription>Ícone exibido na aba do navegador (PNG/ICO, máx 512KB)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input ref={faviconInputRef} type="file" accept="image/png,image/x-icon,image/svg+xml" className="hidden" onChange={handleFaviconSelect} />

              {faviconPreview ? (
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                    <img src={faviconPreview} alt="Favicon" className="w-8 h-8 object-contain" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" onClick={() => faviconInputRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-2" />Trocar
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setFaviconPreview(null); setFaviconFile(null); }}>
                      <Trash2 className="w-4 h-4 mr-2" />Remover
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => faviconInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
                >
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Enviar favicon</p>
                  <p className="text-xs text-muted-foreground">PNG ou ICO, 32x32 ou 64x64</p>
                </button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveAll} disabled={saveSetting.isPending} size="lg" className="gap-2">
          {saveSetting.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          Salvar Identidade Visual
        </Button>
      </div>
    </div>
  );
}
