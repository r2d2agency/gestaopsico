import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Eye, EyeOff, LogIn, Loader2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";

interface PortalBranding {
  organizationId: string;
  businessName: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  portalSlug: string;
}

export default function PortalLogin() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { login } = useAuth();

  // Load saved credentials
  const savedCreds = localStorage.getItem(`portal_remember_${slug}`);
  const parsed = savedCreds ? JSON.parse(savedCreds) : null;

  const [email, setEmail] = useState(parsed?.email || "");
  const [password, setPassword] = useState(parsed?.password || "");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(!!parsed);
  const [isLoading, setIsLoading] = useState(false);

  const { data: branding, isLoading: brandingLoading, error } = useQuery<PortalBranding>({
    queryKey: ["portal-branding", slug],
    queryFn: () => apiRequest(`/org-settings/portal/${slug}`),
    enabled: !!slug,
    retry: false,
  });

  // Auto-login if remember-me
  const { user } = useAuth();
  useEffect(() => {
    if (user && user.role === "patient") {
      navigate(`/p/${slug}/portal`, { replace: true });
    }
  }, [user, slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const loggedUser = await login(email, password);

      // Save or clear remember-me
      if (rememberMe) {
        localStorage.setItem(`portal_remember_${slug}`, JSON.stringify({ email, password }));
      } else {
        localStorage.removeItem(`portal_remember_${slug}`);
      }

      if (loggedUser.role === "patient") {
        navigate(`/p/${slug}/portal`);
      } else {
        navigate("/dashboard");
      }
      toast({ title: "Login realizado!" });
    } catch (err: unknown) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Credenciais inválidas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (brandingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !branding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center">
          <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-display font-bold text-foreground mb-2">
            Clínica não encontrada
          </h1>
          <p className="text-sm text-muted-foreground">
            O link que você acessou não corresponde a nenhuma clínica cadastrada.
          </p>
        </div>
      </div>
    );
  }

  const primaryColor = branding.primaryColor || "#7c3aed";
  const accentColor = branding.accentColor || branding.secondaryColor || "#a78bfa";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with branding */}
      <div
        className="w-full py-8 px-6 flex flex-col items-center"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
        }}
      >
        {branding.logo ? (
          <img
            src={branding.logo}
            alt={branding.businessName}
            className="w-16 h-16 rounded-2xl object-contain bg-white/20 p-2 mb-3"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
            <span className="text-2xl font-bold text-white">
              {branding.businessName?.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
        <h1 className="text-xl font-display font-bold text-white text-center">
          {branding.businessName}
        </h1>
        <p className="text-white/70 text-sm mt-1">Portal do Paciente</p>
      </div>

      {/* Login form */}
      <div className="flex-1 flex items-start justify-center px-6 pt-8 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <h2 className="text-lg font-display font-bold text-foreground mb-1">
            Acesse sua conta
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Use o email e senha fornecidos pelo seu profissional
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(!!checked)}
              />
              <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                Lembrar-me neste dispositivo
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              style={{ backgroundColor: primaryColor }}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <LogIn className="w-4 h-4 mr-2" />
              )}
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-8">
            Acesso exclusivo para pacientes de {branding.businessName}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
