import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, FileText, Music, Video, BookOpen, ExternalLink, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const INITIAL_RESOURCES = [
  { id: 1, title: "Guia de Higiene do Sono", type: "PDF", category: "Bem-estar", icon: FileText },
  { id: 2, title: "Meditação Guiada: Ansiedade", type: "Audio", category: "Meditação", icon: Music },
  { id: 3, title: "Vídeo: Entendendo a TCC", type: "Video", category: "Educacional", icon: Video },
  { id: 4, title: "Diário de Gratidão", type: "Template", category: "Exercício", icon: BookOpen },
];

export default function RecursosPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [resources, setResources] = useState(INITIAL_RESOURCES);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newResource, setNewResource] = useState({ title: "", category: "", type: "PDF" });

  const filteredResources = resources.filter(resource =>
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

  const handleAddResource = () => {
    if (!newResource.title || !newResource.category) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos para adicionar um recurso.",
        variant: "destructive",
      });
      return;
    }

    const iconMap: Record<string, any> = {
      PDF: FileText,
      Audio: Music,
      Video: Video,
      Template: BookOpen,
    };

    const resourceToAdd = {
      id: resources.length + 1,
      title: newResource.title,
      category: newResource.category,
      type: newResource.type,
      icon: iconMap[newResource.type] || FileText,
    };

    setResources([resourceToAdd, ...resources]);
    setIsAddDialogOpen(false);
    setNewResource({ title: "", category: "", type: "PDF" });
    toast({
      title: "Sucesso",
      description: "Novo recurso adicionado com sucesso!",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Recursos Terapêuticos</h1>
          <p className="text-muted-foreground">Biblioteca de materiais para compartilhar com seus pacientes.</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0 gap-2">
              <Plus className="w-4 h-4" /> Adicionar Recurso
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Recurso</DialogTitle>
              <DialogDescription>
                Preencha as informações do material que deseja disponibilizar na biblioteca.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Título</Label>
                <Input 
                  id="title" 
                  value={newResource.title}
                  onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                  placeholder="Ex: Guia de Meditação" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Categoria</Label>
                <Input 
                  id="category" 
                  value={newResource.category}
                  onChange={(e) => setNewResource({ ...newResource, category: e.target.value })}
                  placeholder="Ex: Meditação, Ansiedade, Bem-estar" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Tipo de Material</Label>
                <Select 
                  value={newResource.type} 
                  onValueChange={(value) => setNewResource({ ...newResource, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PDF">Documento (PDF)</SelectItem>
                    <SelectItem value="Audio">Áudio (MP3)</SelectItem>
                    <SelectItem value="Video">Vídeo</SelectItem>
                    <SelectItem value="Template">Template / Exercício</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddResource}>Salvar Recurso</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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