import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Filter, MoreHorizontal, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const patients = [
  { id: 1, name: "Ana Silva", cpf: "123.456.789-00", phone: "(11) 98765-4321", email: "ana@email.com", birthDate: "15/03/1990", gender: "Feminino", status: "Ativo", lastVisit: "28/03/2026", sessions: 12 },
  { id: 2, name: "Carlos Mendes", cpf: "987.654.321-00", phone: "(11) 91234-5678", email: "carlos@email.com", birthDate: "22/07/1985", gender: "Masculino", status: "Ativo", lastVisit: "27/03/2026", sessions: 8 },
  { id: 3, name: "Juliana Costa", cpf: "456.789.123-00", phone: "(11) 99876-5432", email: "juliana@email.com", birthDate: "10/11/1992", gender: "Feminino", status: "Ativo", lastVisit: "25/03/2026", sessions: 15 },
  { id: 4, name: "Roberto Lima", cpf: "321.654.987-00", phone: "(11) 93456-7890", email: "roberto@email.com", birthDate: "05/01/1988", gender: "Masculino", status: "Inativo", lastVisit: "10/03/2026", sessions: 5 },
  { id: 5, name: "Maria Santos", cpf: "654.321.987-00", phone: "(11) 92345-6789", email: "maria@email.com", birthDate: "18/09/1995", gender: "Feminino", status: "Ativo", lastVisit: "26/03/2026", sessions: 20 },
  { id: 6, name: "Pedro Oliveira", cpf: "789.123.456-00", phone: "(11) 94567-8901", email: "pedro@email.com", birthDate: "30/06/1980", gender: "Masculino", status: "Ativo", lastVisit: "28/03/2026", sessions: 3 },
];

export default function Pacientes() {
  const [search, setSearch] = useState("");
  const filtered = patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Pacientes</h1>
          <p className="text-muted-foreground mt-1">{patients.length} pacientes cadastrados</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" />Novo Paciente</Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF ou e-mail..."
            className="pl-10"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon"><Filter className="w-4 h-4" /></Button>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card rounded-xl border border-border shadow-card overflow-hidden"
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Paciente</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Contato</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Nascimento</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Sessões</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Última Consulta</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((p, i) => (
              <motion.tr
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-secondary-foreground">
                        {p.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.cpf}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{p.phone}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-sm text-muted-foreground">{p.birthDate}</td>
                <td className="px-5 py-3.5 text-sm font-medium text-foreground">{p.sessions}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    p.status === "Ativo" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-sm text-muted-foreground">{p.lastVisit}</td>
                <td className="px-5 py-3.5">
                  <button className="p-1 rounded hover:bg-muted transition-colors">
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
