const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// ======== PROFESSIONAL ENDPOINTS ========

// GET /api/tests/templates - list professional's test templates
router.get('/templates', async (req, res) => {
  try {
    const templates = await prisma.testTemplate.findMany({
      where: { professionalId: req.userId },
      include: {
        _count: { select: { questions: true, assignments: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar testes' });
  }
});

// GET /api/tests/templates/:id
router.get('/templates/:id', async (req, res) => {
  try {
    const template = await prisma.testTemplate.findFirst({
      where: { id: req.params.id, professionalId: req.userId },
      include: {
        questions: { orderBy: { orderNum: 'asc' } },
        assignments: {
          include: {
            patient: { select: { id: true, name: true } },
            responses: true
          },
          orderBy: { assignedAt: 'desc' }
        }
      }
    });
    if (!template) return res.status(404).json({ error: 'Teste não encontrado' });
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar teste' });
  }
});

// POST /api/tests/templates
router.post('/templates', async (req, res) => {
  try {
    const { title, description, category, questions } = req.body;
    if (!title) return res.status(400).json({ error: 'Título é obrigatório' });

    const template = await prisma.testTemplate.create({
      data: {
        professionalId: req.userId,
        title,
        description,
        category,
        questions: questions?.length ? {
          create: questions.map((q, i) => ({
            text: q.text,
            type: q.type || 'scale',
            options: q.options || [],
            orderNum: i
          }))
        } : undefined
      },
      include: { questions: { orderBy: { orderNum: 'asc' } } }
    });

    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar teste', details: err.message });
  }
});

// PUT /api/tests/templates/:id
router.put('/templates/:id', async (req, res) => {
  try {
    const existing = await prisma.testTemplate.findFirst({
      where: { id: req.params.id, professionalId: req.userId }
    });
    if (!existing) return res.status(404).json({ error: 'Teste não encontrado' });

    const { title, description, category, isActive, questions } = req.body;
    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (category !== undefined) data.category = category;
    if (isActive !== undefined) data.isActive = isActive;

    // If questions provided, replace all
    if (questions) {
      await prisma.testQuestion.deleteMany({ where: { templateId: req.params.id } });
      await prisma.testQuestion.createMany({
        data: questions.map((q, i) => ({
          templateId: req.params.id,
          text: q.text,
          type: q.type || 'scale',
          options: q.options || [],
          orderNum: i
        }))
      });
    }

    const template = await prisma.testTemplate.update({
      where: { id: req.params.id },
      data,
      include: { questions: { orderBy: { orderNum: 'asc' } } }
    });

    res.json(template);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar teste', details: err.message });
  }
});

// POST /api/tests/assign - assign test to patient
router.post('/assign', async (req, res) => {
  try {
    const { templateId, patientId } = req.body;
    if (!templateId || !patientId) {
      return res.status(400).json({ error: 'templateId e patientId são obrigatórios' });
    }

    // Verify ownership
    const template = await prisma.testTemplate.findFirst({
      where: { id: templateId, professionalId: req.userId }
    });
    if (!template) return res.status(404).json({ error: 'Teste não encontrado' });

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, professionalId: req.userId }
    });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const assignment = await prisma.testAssignment.create({
      data: { templateId, patientId },
      include: {
        template: { select: { title: true } },
        patient: { select: { name: true } }
      }
    });

    res.status(201).json(assignment);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atribuir teste', details: err.message });
  }
});

// GET /api/tests/assignments/:id/results - professional view results
router.get('/assignments/:id/results', async (req, res) => {
  try {
    const assignment = await prisma.testAssignment.findUnique({
      where: { id: req.params.id },
      include: {
        template: { include: { questions: { orderBy: { orderNum: 'asc' } } } },
        patient: { select: { id: true, name: true } },
        responses: true
      }
    });
    if (!assignment) return res.status(404).json({ error: 'Atribuição não encontrada' });

    // Verify professional owns the template
    if (assignment.template.professionalId !== req.userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    res.json(assignment);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar resultados' });
  }
});

// ======== PATIENT ENDPOINTS ========

// GET /api/tests/my - patient's pending and completed tests
router.get('/my', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.patientId) return res.status(403).json({ error: 'Acesso negado' });

    const assignments = await prisma.testAssignment.findMany({
      where: { patientId: user.patientId },
      include: {
        template: {
          select: { title: true, description: true, category: true }
        },
        _count: { select: { responses: true } }
      },
      orderBy: { assignedAt: 'desc' }
    });

    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar testes' });
  }
});

// GET /api/tests/my/:assignmentId - get test to answer
router.get('/my/:assignmentId', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.patientId) return res.status(403).json({ error: 'Acesso negado' });

    const assignment = await prisma.testAssignment.findFirst({
      where: { id: req.params.assignmentId, patientId: user.patientId },
      include: {
        template: {
          include: { questions: { orderBy: { orderNum: 'asc' } } }
        },
        responses: true
      }
    });

    if (!assignment) return res.status(404).json({ error: 'Teste não encontrado' });
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar teste' });
  }
});

// POST /api/tests/my/:assignmentId/respond - submit test responses
router.post('/my/:assignmentId/respond', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.patientId) return res.status(403).json({ error: 'Acesso negado' });

    const assignment = await prisma.testAssignment.findFirst({
      where: { id: req.params.assignmentId, patientId: user.patientId, status: 'pending' }
    });
    if (!assignment) return res.status(404).json({ error: 'Teste não encontrado ou já respondido' });

    const { responses } = req.body; // [{ questionId, answer }]
    if (!Array.isArray(responses) || !responses.length) {
      return res.status(400).json({ error: 'Respostas são obrigatórias' });
    }

    // Create responses
    await prisma.testResponse.createMany({
      data: responses.map(r => ({
        assignmentId: req.params.assignmentId,
        questionId: r.questionId,
        answer: String(r.answer)
      }))
    });

    // Mark as completed
    const updated = await prisma.testAssignment.update({
      where: { id: req.params.assignmentId },
      data: { status: 'completed', completedAt: new Date() }
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao enviar respostas', details: err.message });
  }
});

module.exports = router;
