import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, FileText, Music, Video, BookOpen, ExternalLink, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const RESOURCES = [
  { id: 1, title: "Guia de Higiene do Sono", type: "PDF", category: "Bem-estar", icon: FileText },
  { id: 2, title: "Meditação Guiada: Ansiedade", type: "Audio", category: "Meditação", icon: Music },
  { id: 3, title: "Vídeo: Entendendo a TCC", type: "Video", category: "Educacional", icon: Video },
  { id: 4, title: "Diário de Gratidão", type: "Template", category: "Exercício", icon: BookOpen },
];

export default function RecursosPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredResources = RESOURCES.filter(resource =>
    resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAction = (action: string, title: string) => {
    toast({
      title: `${action} Recurso`,
      description: `Ação "${action}" realizada para: ${title}`,
    });
  };

  const handleAdd = () => {
    toast({
      title: "Adicionar Recurso",
      description: "Funcionalidade de upload será implementada em breve.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Recursos Terapêuticos</h1>
          <p className="text-muted-foreground">Biblioteca de materiais para compartilhar com seus pacientes.</p>
        </div>
        <Button className="shrink-0 gap-2" onClick={handleAdd}>
          <Plus className="w-4 h-4" /> Adicionar Recurso
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Pesquisar recursos..." 
            className="pl-9" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredResources.map((resource) => (
          <Card key={resource.id} className="group hover:border-primary/50 transition-colors shadow-sm">
            <CardHeader className="pb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <resource.icon className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-base font-semibold">{resource.title}</CardTitle>
              <CardDescription className="text-xs">{resource.category} • {resource.type}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mt-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2 text-xs"
                  onClick={() => handleAction("Visualizar", resource.title)}
                >
                  <ExternalLink className="w-3 h-3 mr-1" /> Ver
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2 text-xs"
                  onClick={() => handleAction("Baixar", resource.title)}
                >
                  <Download className="w-3 h-3 mr-1" /> Baixar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {filteredResources.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          Nenhum recurso encontrado para "{searchTerm}".
        </div>
      )}
    </div>
  );
}
