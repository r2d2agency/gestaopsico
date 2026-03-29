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

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/pacientes', patientsRoutes);
app.use('/api/consultas', appointmentsRoutes);
app.use('/api/casais', couplesRoutes);
app.use('/api/prontuarios', recordsRoutes);
app.use('/api/financeiro', financialRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 PsicoGest API rodando na porta ${PORT}`);
});
