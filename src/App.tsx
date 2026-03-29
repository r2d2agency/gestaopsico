import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Pacientes from "./pages/Pacientes";
import Agenda from "./pages/Agenda";
import Financeiro from "./pages/Financeiro";
import AppLayout from "./components/AppLayout";
import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrganizations from "./pages/admin/AdminOrganizations";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPlans from "./pages/admin/AdminPlans";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          {/* Admin / Superadmin */}
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/organizacoes" element={<AdminOrganizations />} />
            <Route path="/admin/usuarios" element={<AdminUsers />} />
            <Route path="/admin/planos" element={<AdminPlans />} />
          </Route>
          {/* App normal */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pacientes" element={<Pacientes />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/casais" element={<Dashboard />} />
            <Route path="/consultas" element={<Dashboard />} />
            <Route path="/prontuarios" element={<Dashboard />} />
            <Route path="/relatorios" element={<Dashboard />} />
            <Route path="/configuracoes" element={<Dashboard />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
