import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Pacientes from "./pages/Pacientes";
import Agenda from "./pages/Agenda";
import Financeiro from "./pages/Financeiro";
import AiAssistant from "./pages/AiAssistant";
import AppLayout from "./components/AppLayout";
import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrganizations from "./pages/admin/AdminOrganizations";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminAiAgents from "./pages/admin/AdminAiAgents";
import AdminAiProviders from "./pages/admin/AdminAiProviders";
import AdminSettings from "./pages/admin/AdminSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            {/* Admin / Superadmin */}
            <Route element={<ProtectedRoute requiredRole="superadmin"><AdminLayout /></ProtectedRoute>}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/organizacoes" element={<AdminOrganizations />} />
              <Route path="/admin/usuarios" element={<AdminUsers />} />
              <Route path="/admin/planos" element={<AdminPlans />} />
              <Route path="/admin/agentes-ia" element={<AdminAiAgents />} />
              <Route path="/admin/provedores-ia" element={<AdminAiProviders />} />
              <Route path="/admin/configuracoes" element={<AdminSettings />} />
            </Route>
            {/* App normal */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/pacientes" element={<Pacientes />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/assistente-ia" element={<AiAssistant />} />
              <Route path="/casais" element={<Dashboard />} />
              <Route path="/consultas" element={<Dashboard />} />
              <Route path="/prontuarios" element={<Dashboard />} />
              <Route path="/relatorios" element={<Dashboard />} />
              <Route path="/configuracoes" element={<Dashboard />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
