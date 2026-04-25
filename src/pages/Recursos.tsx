import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, FileText, Music, Video, BookOpen, ExternalLink, Download, Trash2, Loader2, Wand2, Sparkles } from "lucide-react";
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
import { resourcesApi, TherapeuticResource } from "@/lib/resourcesApi";
import { useAuth } from "@/contexts/AuthContext";

const ICON_MAP: Record<string, any> = {
  PDF: FileText,
  Audio: Music,
  Video: Video,
  Template: BookOpen,
};

export default function RecursosPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [resources, setResources] = useState<TherapeuticResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newResource, setNewResource] = useState({ title: "", category: "", type: "PDF" });
  const [aiPrompt, setAiPrompt] = useState("");
  const [selectedAiCategory, setSelectedAiCategory] = useState("");

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      setIsLoading(true);
      const data = await resourcesApi.list();
      setResources(data);
    } catch (error) {
      console.error("Error fetching resources:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os recursos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este recurso?")) return;
    try {
      await resourcesApi.delete(id);
      setResources(prev => prev.filter(r => r.id !== id));
      toast({
        title: "Sucesso",
        description: "Recurso removido com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover o recurso.",
        variant: "destructive",
      });
    }
  };

  const handleAddResource = async () => {
    if (!newResource.title || !newResource.category) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos para adicionar um recurso.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await resourcesApi.create(newResource);
      setResources([created, ...resources]);
      setIsAddDialogOpen(false);
      setNewResource({ title: "", category: "", type: "PDF" });
      toast({
        title: "Sucesso",
        description: "Novo recurso adicionado com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o recurso.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateResource = async () => {
    if (!aiPrompt) {
      toast({
        title: "Erro",
        description: "Descreva o que você quer que a IA gere.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await resourcesApi.generate({ 
        prompt: aiPrompt, 
        category: selectedAiCategory,
        type: "Template"
      });
      setResources([created, ...resources]);
      setIsGenerateDialogOpen(false);
      setAiPrompt("");
      toast({
        title: "Sucesso!",
        description: "Recurso terapêutico gerado e salvo pela IA.",
      });
    } catch (error) {
      toast({
        title: "Erro na geração",
        description: "Não foi possível gerar o recurso com IA. Verifique se você configurou uma chave de API nas configurações de IA.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Recursos Terapêuticos</h1>
          <p className="text-muted-foreground">Biblioteca de materiais para compartilhar com seus pacientes.</p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="shrink-0 gap-2 border-primary text-primary hover:bg-primary/10">
                <Wand2 className="w-4 h-4" /> Sugestões com IA
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Gerar Recurso com IA
                </DialogTitle>
                <DialogDescription>
                  Descreva o material que você precisa (ex: "Exercício de respiração para pânico" ou "Guia de higiene do sono") e a IA criará o conteúdo para você.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="prompt">O que você precisa?</Label>
                  <textarea 
                    id="prompt" 
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Ex: Crie um guia passo a passo de meditação mindfulness de 5 minutos para iniciantes com foco em ansiedade."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="aiCategory">Categoria (Opcional)</Label>
                  <Input 
                    id="aiCategory" 
                    placeholder="Ex: Ansiedade, Meditação" 
                    value={selectedAiCategory}
                    onChange={(e) => setSelectedAiCategory(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleGenerateResource} disabled={isSubmitting} className="w-full gap-2">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Gerar e Salvar na Biblioteca
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
              <Button onClick={handleAddResource} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Salvar Recurso
              </Button>
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

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredResources.map((resource) => {
            const Icon = ICON_MAP[resource.type] || FileText;
            return (
              <Card key={resource.id} className="group hover:border-primary/50 transition-colors shadow-sm relative">
                <CardHeader className="pb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-base font-semibold">{resource.title}</CardTitle>
                  <CardDescription className="text-xs">{resource.category} • {resource.type}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-1">
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
                    {resource.professionalId === user?.id && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(resource.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      
      {!isLoading && filteredResources.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          {searchTerm ? `Nenhum recurso encontrado para "${searchTerm}".` : "Nenhum recurso disponível no momento."}
        </div>
      )}
    </div>
  );
}
