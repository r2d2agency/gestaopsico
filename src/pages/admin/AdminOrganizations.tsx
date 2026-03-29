import { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Plus,
  Search,
  MoreHorizontal,
  Power,
  PowerOff,
  Pencil,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  useOrganizations,
  useCreateOrganization,
  useToggleOrgStatus,
} from "@/hooks/useAdmin";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativa", variant: "default" },
  inactive: { label: "Inativa", variant: "secondary" },
  suspended: { label: "Suspensa", variant: "destructive" },
};

const planLabels: Record<string, string> = {
  basic: "Básico",
  professional: "Profissional",
  enterprise: "Enterprise",
};

export default function AdminOrganizations() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (filterStatus && filterStatus !== "all") params.status = filterStatus;

  const { data, isLoading } = useOrganizations(Object.keys(params).length ? params : undefined);
  const createOrg = useCreateOrganization();
  const toggleStatus = useToggleOrgStatus();

  const [form, setForm] = useState({
    name: "",
    slug: "",
    type: "clinic" as "clinic" | "individual",
    plan: "basic",
    email: "",
    phone: "",
    maxUsers: 5,
  });

  const handleCreate = () => {
    createOrg.mutate(form, {
      onSuccess: () => {
        setDialogOpen(false);
        setForm({ name: "", slug: "", type: "clinic", plan: "basic", email: "", phone: "", maxUsers: 5 });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Organizações</h1>
          <p className="text-sm text-muted-foreground">
            {data?.total ?? 0} organizações cadastradas
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Nova Organização
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Criar Organização</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome da clínica ou profissional" />
              </div>
              <div className="grid gap-2">
                <Label>Slug (URL)</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="minha-clinica" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as "clinic" | "individual", maxUsers: v === "individual" ? 1 : 5 })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clinic">Clínica</SelectItem>
                      <SelectItem value="individual">Individual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Plano</Label>
                  <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Básico</SelectItem>
                      <SelectItem value="professional">Profissional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Telefone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Máx. Usuários</Label>
                <Input type="number" min={1} value={form.maxUsers} onChange={(e) => setForm({ ...form, maxUsers: Number(e.target.value) })} />
              </div>
              <Button onClick={handleCreate} disabled={createOrg.isPending || !form.name || !form.slug}>
                {createOrg.isPending ? "Criando..." : "Criar Organização"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Buscar organizações..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="inactive">Inativas</SelectItem>
            <SelectItem value="suspended">Suspensas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : !data?.data?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Nenhuma organização encontrada</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {data.data.map((org) => {
            const sc = statusConfig[org.status] || statusConfig.inactive;
            return (
              <div key={org.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:shadow-card transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{org.name}</p>
                      <Badge variant={sc.variant}>{sc.label}</Badge>
                      <Badge variant="outline" className="capitalize">{org.type === "clinic" ? "Clínica" : "Individual"}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>{org.slug}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {org._count?.users ?? 0}/{org.maxUsers} usuários
                      </span>
                      <span>•</span>
                      <span>Plano: {planLabels[org.plan] || org.plan}</span>
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="gap-2"><Pencil className="w-4 h-4" /> Editar</DropdownMenuItem>
                    {org.status === "active" ? (
                      <DropdownMenuItem className="gap-2 text-destructive" onClick={() => toggleStatus.mutate({ id: org.id, status: "suspended" })}>
                        <PowerOff className="w-4 h-4" /> Suspender
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem className="gap-2" onClick={() => toggleStatus.mutate({ id: org.id, status: "active" })}>
                        <Power className="w-4 h-4" /> Ativar
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
