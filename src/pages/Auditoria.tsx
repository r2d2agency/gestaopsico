import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auditApi } from "@/lib/clinicApi";

export default function Auditoria() {
  const { data: events } = useQuery({ queryKey: ["audit-events"], queryFn: () => auditApi.list() });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Auditoria</h1>
        <p className="text-sm text-muted-foreground">Trilha de prontuários, permissões, equipe e fechamentos</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Eventos recentes</CardTitle>
          <CardDescription>Últimas 200 alterações sensíveis da organização</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {events?.map((event) => (
            <div key={event.id} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{event.action} · {event.entityType}{event.entityId ? ` ${event.entityId.slice(0, 8)}` : ""}</p>
              <p className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString("pt-BR")}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
