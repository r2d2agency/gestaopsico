import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface AudioMessagePlayerProps {
  source: string;
  className?: string;
}

function normalizeAudioSource(source: string) {
  if (!source) return "";
  if (
    source.startsWith("blob:") ||
    /^data:audio\/[\w.+-]+;base64,/i.test(source) ||
    /^https?:\/\//i.test(source) ||
    source.startsWith("/api/")
  ) {
    return source;
  }

  const sanitized = source
    .replace(/^data:[^,]*,?/i, "")
    .replace(/^audo\/bas64,?/i, "")
    .replace(/^audio\/bas64,?/i, "");

  return `data:audio/webm;base64,${sanitized}`;
}

function buildApiUrl(source: string) {
  const apiUrl = new URL(API_BASE_URL, window.location.origin);
  return new URL(source, apiUrl.origin).toString();
}

export function AudioMessagePlayer({ source, className }: AudioMessagePlayerProps) {
  const [resolvedSource, setResolvedSource] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    const loadAudio = async () => {
      const normalizedSource = normalizeAudioSource(source);

      if (!normalizedSource) {
        if (!isMounted) return;
        setResolvedSource("");
        setHasError(true);
        setIsLoading(false);
        return;
      }

      if (!normalizedSource.startsWith("/api/")) {
        if (!isMounted) return;
        setResolvedSource(normalizedSource);
        setHasError(false);
        setIsLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
        const response = await fetch(buildApiUrl(normalizedSource), {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!response.ok) {
          throw new Error("Falha ao carregar áudio");
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);

        if (!isMounted) {
          URL.revokeObjectURL(objectUrl);
          return;
        }

        setResolvedSource(objectUrl);
        setHasError(false);
        setIsLoading(false);
      } catch {
        if (!isMounted) return;
        setResolvedSource("");
        setHasError(true);
        setIsLoading(false);
      }
    };

    setIsLoading(true);
    setHasError(false);
    setResolvedSource("");
    loadAudio();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [source]);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className || ""}`}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Carregando áudio...
      </div>
    );
  }

  if (hasError || !resolvedSource) {
    return (
      <div className={`flex items-center gap-2 text-xs text-destructive ${className || ""}`}>
        <AlertCircle className="h-3.5 w-3.5" />
        Áudio indisponível
      </div>
    );
  }

  return <audio controls preload="metadata" src={resolvedSource} className={className} />;
}