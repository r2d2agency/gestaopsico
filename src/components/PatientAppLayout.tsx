import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Home, Calendar, BookOpen, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { patientPortalApi } from "@/lib/portalApi";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { hexToHsl } from "@/lib/utils";
import { usePortalSlug } from "@/hooks/usePortalSlug";

export default function PatientAppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const { basePath } = usePortalSlug();

  const tabs = [
    { to: basePath, icon: Home, label: "Início" },
    { to: `${basePath}/consultas`, icon: Calendar, label: "Agenda" },
    { to: `${basePath}/mensagens`, icon: BookOpen, label: "Diário" },
    { to: `${basePath}/configuracoes`, icon: Settings, label: "Config" },
  ];

  const { data: dashboard } = useQuery({
    queryKey: ["patient-dashboard"],
    queryFn: () => patientPortalApi.dashboard(),
  });

  const clinicName = dashboard?.clinicName || "PsicoGest";
  const clinicLogo = (dashboard as any)?.clinicLogo;
  const primaryColor = (dashboard as any)?.primaryColor;
  const accentColor = (dashboard as any)?.accentColor;

  // Apply clinic colors + favicon + dynamic manifest
  useEffect(() => {
    if (primaryColor) {
      document.documentElement.style.setProperty("--primary", hexToHsl(primaryColor));
    }
    if (accentColor) {
      document.documentElement.style.setProperty("--accent", hexToHsl(accentColor));
    }

    // Dynamic favicon from clinic logo
    if (clinicLogo) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = clinicLogo;

      let appleLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
      if (!appleLink) {
        appleLink = document.createElement("link");
        appleLink.rel = "apple-touch-icon";
        document.head.appendChild(appleLink);
      }
      appleLink.href = clinicLogo;
    }

    if (clinicName) {
      document.title = `${clinicName} - Portal do Paciente`;
    }
    if (primaryColor) {
      const meta = document.querySelector("meta[name='theme-color']") as HTMLMetaElement;
      if (meta) meta.content = primaryColor;
    }
    if (clinicName) {
      const metaApple = document.querySelector("meta[name='apple-mobile-web-app-title']") as HTMLMetaElement;
      if (metaApple) metaApple.content = clinicName;
    }

    // Dynamic web app manifest with clinic branding
    const startUrl = basePath || "/portal";
    const manifest = {
      name: `${clinicName} - Portal do Paciente`,
      short_name: clinicName,
      description: `Portal do paciente de ${clinicName}`,
      theme_color: primaryColor || "#6366f1",
      background_color: "#ffffff",
      display: "standalone",
      orientation: "portrait",
      start_url: startUrl,
      scope: "/",
      icons: clinicLogo
        ? [
            { src: clinicLogo, sizes: "192x192", type: "image/png" },
            { src: clinicLogo, sizes: "512x512", type: "image/png" },
            { src: clinicLogo, sizes: "512x512", type: "image/png", purpose: "any maskable" },
          ]
        : [
            { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
            { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          ],
    };

    const blob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
    const manifestUrl = URL.createObjectURL(blob);

    // Replace existing manifest link
    let manifestLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement;
    if (manifestLink) {
      manifestLink.href = manifestUrl;
    } else {
      manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      manifestLink.href = manifestUrl;
      document.head.appendChild(manifestLink);
    }

    return () => {
      document.documentElement.style.removeProperty("--primary");
      document.documentElement.style.removeProperty("--accent");
      document.title = "PsicoGest - Sistema para Psicólogos";
      URL.revokeObjectURL(manifestUrl);
    };
  }, [primaryColor, accentColor, clinicLogo, clinicName, basePath]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header
        className="sticky top-0 z-30 text-primary-foreground px-4 py-3 flex items-center justify-between safe-top"
        style={{
          background: primaryColor
            ? `linear-gradient(135deg, ${primaryColor}, ${accentColor || primaryColor})`
            : undefined,
          backgroundColor: primaryColor ? undefined : 'hsl(var(--primary))',
        }}
      >
        <div className="flex items-center gap-3">
          {clinicLogo ? (
            <img src={clinicLogo} alt={clinicName} className="w-8 h-8 rounded-full object-contain bg-white/20 p-0.5" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">
                {clinicName.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <span className="font-display font-bold text-sm">{clinicName}</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
          <span className="text-[10px] font-bold text-primary-foreground">
            {user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border safe-bottom">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto">
          {tabs.map(tab => {
            const isActive = location.pathname === tab.to || 
              (tab.to !== basePath && location.pathname.startsWith(tab.to));
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className="flex flex-col items-center gap-0.5 px-3 py-1 relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="patient-tab-indicator"
                    className="absolute -top-px left-2 right-2 h-0.5 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <tab.icon className={`w-5 h-5 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`} />
                <span className={`text-[10px] font-medium transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}>
                  {tab.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
