import { useState } from "react";
import { motion } from "framer-motion";
import {
  UserPlus,
  Search,
  MoreHorizontal,
  Power,
  PowerOff,
  Users,
  Shield,
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
  useAdminUsers,
  useCreateUser,
  useToggleUserStatus,
  useOrganizations,
} from "@/hooks/useAdmin";

const roleLabels: Record<string, string> = {
  superadmin: "Superadmin",
  admin: "Administrador",
  professional: "Profissional",
};

const roleVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  superadmin: "destructive",
  admin: "default",
  professional: "secondary",
};

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (filterRole && filterRole !== "all") params.role = filterRole;

  const { data, isLoading } = useAdminUsers(Object.keys(params).length ? params : undefined);
  const { data: orgsData } = useOrganizations();
  const createUser = useCreateUser();
  const toggleStatus = useToggleUserStatus();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "professional",
    organizationId: "",
  });

  const handleCreate = () => {
    const payload = { ...form, organizationId: form.organizationId || undefined };
    createUser.mutate(payload, {
      onSuccess: () => {
        setDialogOpen(false);
        setForm({ name: "", email: "", password: "", role: "professional", organizationId: "" });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} usuários no sistema</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><UserPlus className="w-4 h-4" /> Novo Usuário</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Criar Usuário</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Senha</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Perfil</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Profissional</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="superadmin">Superadmin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Organização</Label>
                  <Select value={form.organizationId || "none"} onValueChange={(v) => setForm({ ...form, organizationId: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {orgsData?.data?.map((org) => (
                        <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreate} disabled={createUser.isPending || !form.name || !form.email || !form.password}>
                {createUser.isPending ? "Criando..." : "Criar Usuário"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Buscar usuários..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Perfil" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="professional">Profissional</SelectItem>
            <SelectItem value="admin">Administrador</SelectItem>
            <SelectItem value="superadmin">Superadmin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : !data?.data?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Nenhum usuário encontrado</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {data.data.map((user) => (
            <div key={user.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:shadow-card transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">
                    {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{user.name}</p>
                    <Badge variant={roleVariants[user.role] || "outline"}>
                      <Shield className="w-3 h-3 mr-1" />
                      {roleLabels[user.role] || user.role}
                    </Badge>
                    <Badge variant={user.status === "active" ? "default" : "secondary"}>
                      {user.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span>{user.email}</span>
                    {user.organization && (
                      <>
                        <span>•</span>
                        <span>{user.organization.name}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{user._count?.patients ?? 0} pacientes</span>
                    <span>•</span>
                    <span>{user._count?.appointments ?? 0} consultas</span>
                  </div>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {user.status === "active" ? (
                    <DropdownMenuItem className="gap-2 text-destructive" onClick={() => toggleStatus.mutate({ id: user.id, status: "inactive" })}>
                      <PowerOff className="w-4 h-4" /> Desativar
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem className="gap-2" onClick={() => toggleStatus.mutate({ id: user.id, status: "active" })}>
                      <Power className="w-4 h-4" /> Ativar
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
