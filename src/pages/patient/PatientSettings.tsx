import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { Lock, LogOut, User, Shield, ChevronRight, Loader2, Download, Smartphone, Share } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";

export default function PatientSettings() {
  const { user, logout } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Detect PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === "accepted") {
        setIsInstalled(true);
        toast({ title: "App instalado! 🎉" });
      }
      setDeferredPrompt(null);
    }
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  const changePasswordMutation = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword: currentPw, newPassword: newPw }),
    onSuccess: () => {
      toast({ title: "Senha alterada com sucesso! 🔒" });
      setShowPassword(false);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao alterar senha", description: err.message, variant: "destructive" });
    },
  });

  const handleChangePassword = () => {
    if (newPw.length < 6) {
      toast({ title: "Senha muito curta", description: "Mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    if (newPw !== confirmPw) {
      toast({ title: "Senhas não coincidem", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate();
  };

  return (
    <div className="px-4 py-5 max-w-md mx-auto space-y-4">
      <div>
        <h1 className="text-lg font-display font-bold text-foreground">Configurações</h1>
        <p className="text-xs text-muted-foreground">Gerencie sua conta</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Install App */}
      {!isInstalled && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
          <Card>
            <CardContent className="pt-4 pb-3">
              <button onClick={() => deferredPrompt ? handleInstall() : setShowInstall(!showInstall)} className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Download className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-medium text-foreground">Instalar App</span>
                    <p className="text-[10px] text-muted-foreground">Acesse sem precisar abrir o navegador</p>
                  </div>
                </div>
                {deferredPrompt ? (
                  <Button size="sm" variant="default" className="text-xs h-7">Instalar</Button>
                ) : (
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showInstall ? "rotate-90" : ""}`} />
                )}
              </button>
              {showInstall && !deferredPrompt && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 space-y-3">
                  {isIOS && (
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                      <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5" /> iPhone / iPad
                      </p>
                      <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                        <li>Toque no botão <Share className="w-3 h-3 inline" /> <strong>Compartilhar</strong> na barra inferior do Safari</li>
                        <li>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong></li>
                        <li>Toque em <strong>"Adicionar"</strong> no canto superior direito</li>
                        <li>Pronto! O app vai aparecer na sua tela inicial 🎉</li>
                      </ol>
                    </div>
                  )}
                  {isAndroid && (
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                      <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5" /> Android
                      </p>
                      <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                        <li>Toque nos <strong>3 pontinhos ⋮</strong> no canto superior do Chrome</li>
                        <li>Selecione <strong>"Adicionar à tela inicial"</strong> ou <strong>"Instalar aplicativo"</strong></li>
                        <li>Confirme tocando em <strong>"Instalar"</strong></li>
                        <li>Pronto! O app vai aparecer na sua tela inicial 🎉</li>
                      </ol>
                    </div>
                  )}
                  {!isIOS && !isAndroid && (
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                      <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5" /> Computador
                      </p>
                      <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                        <li>No Chrome, clique no ícone de <strong>instalar</strong> na barra de endereço</li>
                        <li>Ou acesse pelo celular para a melhor experiência</li>
                      </ol>
                    </div>
                  )}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardContent className="pt-4 pb-3">
            <button onClick={() => setShowPassword(!showPassword)} className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-warning" />
                </div>
                <span className="text-sm font-medium text-foreground">Alterar senha</span>
              </div>
              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showPassword ? "rotate-90" : ""}`} />
            </button>
            {showPassword && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3">
                <form onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }} className="space-y-2">
                  <Input type="password" placeholder="Senha atual" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
                  <Input type="password" placeholder="Nova senha" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                  <Input type="password" placeholder="Confirmar nova senha" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
                  <Button type="submit" size="sm" className="w-full" disabled={changePasswordMutation.isPending}>
                    {changePasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Salvar nova senha
                  </Button>
                </form>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Privacidade e LGPD</p>
                <p className="text-[10px] text-muted-foreground">Seus dados são protegidos e criptografados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Button variant="outline" className="w-full gap-2 text-destructive border-destructive/20 hover:bg-destructive/5" onClick={logout}>
          <LogOut className="w-4 h-4" />
          Sair da conta
        </Button>
      </motion.div>
    </div>
  );
}
