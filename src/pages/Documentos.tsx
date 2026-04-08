import { useState } from "react";
import {
  FileUp, FileText, Send, Plus, Clock, CheckCircle, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";

export default function Documentos() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Envio de Documentos</h1>
          <p className="text-sm text-muted-foreground">
            Envie documentos para assinatura ou visualização pelo paciente
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Enviar Documento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Enviar Documento</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/40 transition-colors cursor-pointer">
                <FileUp className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Arraste ou clique para selecionar</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, imagens — até 10MB</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button disabled>
                <Send className="w-4 h-4 mr-2" /> Enviar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="text-center py-16 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="font-medium">Nenhum documento enviado</p>
        <p className="text-sm mt-1">Envie documentos para seus pacientes assinarem ou visualizarem</p>
      </div>
    </div>
  );
}
