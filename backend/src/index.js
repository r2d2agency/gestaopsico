require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('./routes/auth');
const patientsRoutes = require('./routes/patients');
const appointmentsRoutes = require('./routes/appointments');
const couplesRoutes = require('./routes/couples');
const recordsRoutes = require('./routes/records');
const financialRoutes = require('./routes/financial');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/aiAgents');
const setupRoutes = require('./routes/setup');
const plansRoutes = require('./routes/plans');
const settingsRoutes = require('./routes/settings');
const whatsappRoutes = require('./routes/whatsapp');
const accountsRoutes = require('./routes/accounts');
const moodRoutes = require('./routes/mood');
const testsRoutes = require('./routes/tests');
const orgSettingsRoutes = require('./routes/orgSettings');
const patientPortalRoutes = require('./routes/patientPortal');
const invoicesRoutes = require('./routes/invoices');
const teamRoutes = require('./routes/team');
const messagesRoutes = require('./routes/messages');
const importRoutes = require('./routes/import');
const telehealthRoutes = require('./routes/telehealth');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = (process.env.FRONTEND_URL || '*').split(',').map(s => s.trim());
app.use(cors({
  origin: allowedOrigins.length === 1 && allowedOrigins[0] === '*'
    ? '*'
    : (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) cb(null, true);
        else cb(null, true); // allow all for now, tighten later
      },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root
app.get('/', (req, res) => res.json({ message: 'Psico Gleego API online' }));

const healthHandler = (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
};

// Health checks
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/pacientes', patientsRoutes);
app.use('/api/consultas', appointmentsRoutes);
app.use('/api/casais', couplesRoutes);
app.use('/api/prontuarios', recordsRoutes);
app.use('/api/financeiro', financialRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/tests', testsRoutes);
app.use('/api/org-settings', orgSettingsRoutes);
app.use('/api/patient-portal', patientPortalRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/import', importRoutes);
app.use('/api/telehealth', telehealthRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Psico Gleego API rodando na porta ${PORT}`);
});
