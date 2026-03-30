const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// ======== PRESET TEST TEMPLATES ========
const PRESET_TESTS = [
  {
    title: "Inventário de Ansiedade de Beck (BAI)",
    description: "Avalia a intensidade de sintomas de ansiedade. Cada item é pontuado de 0 a 3. Resultado: 0-10 mínimo, 11-19 leve, 20-30 moderado, 31-63 grave.",
    category: "ansiedade",
    scoringRules: { type: "sum", ranges: [
      { min: 0, max: 10, label: "Mínimo" },
      { min: 11, max: 19, label: "Leve" },
      { min: 20, max: 30, label: "Moderado" },
      { min: 31, max: 63, label: "Grave" }
    ]},
    questions: [
      { text: "Dormência ou formigamento", type: "scale", options: ["Absolutamente não", "Levemente", "Moderadamente", "Gravemente"] },
      { text: "Sensação de calor", type: "scale", options: ["Absolutamente não", "Levemente", "Moderadamente", "Gravemente"] },
      { text: "Tremores nas pernas", type: "scale", options: ["Absolutamente não", "Levemente", "Moderadamente", "Gravemente"] },
      { text: "Incapaz de relaxar", type: "scale", options: ["Absolutamente não", "Levemente", "Moderadamente", "Gravemente"] },
      { text: "Medo que aconteça o pior", type: "scale", options: ["Absolutamente não", "Levemente", "Moderadamente", "Gravemente"] },
      { text: "Atordoado ou tonto", type: "scale", options: ["Absolutamente não", "Levemente", "Moderadamente", "Gravemente"] },
      { text: "Palpitação ou aceleração do coração", type: "scale", options: ["Absolutamente não", "Levemente", "Moderadamente", "Gravemente"] },
      { text: "Sem equilíbrio", type: "scale", options: ["Absolutamente não", "Levemente", "Moderadamente", "Gravemente"] },
      { text: "Aterrorizado", type: "scale", options: ["Absolutamente não", "Levemente", "Moderadamente", "Gravemente"] },
      { text: "Nervoso", type: "scale", options: ["Absolutamente não", "Levemente", "Moderadamente", "Gravemente"] },
      { text: "Sensação de sufocação", type: "scale", options: ["Absolutamente não", "Levemente", "Moderadamente", "Gravemente"] },
      { text: "Tremores nas mãos", type: "scale", options: ["Absolutamente não", "Levemente", "Moderadamente", "Gravemente"] },
      { text: "Trêmulo", type: "scale", options: ["Absolutamente não", "Levemente", "Moderadamente", "Gravemente"] },
      { text: "Medo de perder o controle", type: "scale", options: ["Absolutamente não", "Levemente", "Moderadamente", "Gravemente"] },
      { text: "Dificuldade de respirar", type: "scale", options: ["Absolutamente não", "Levemente", "Moderadamente", "Gravemente"] },
      { text: "Medo de morrer", type: "scale", options: ["Absolutamente não", "Levemente", "Moderadamente", "Gravemente"] },
      { text: "Assustado", type: "scale", options: ["Absolutamente não", "Levemente", "Moderadamente", "Gravemente"] },
      { text: "Indigestão ou desconforto no abdômen", type: "scale", options: ["Absolutamente não", "Levemente", "Moderadamente", "Gravemente"] },
      { text: "Sensação de desmaio", type: "scale", options: ["Absolutamente não", "Levemente", "Moderadamente", "Gravemente"] },
      { text: "Rosto afogueado", type: "scale", options: ["Absolutamente não", "Levemente", "Moderadamente", "Gravemente"] },
      { text: "Suor (não devido ao calor)", type: "scale", options: ["Absolutamente não", "Levemente", "Moderadamente", "Gravemente"] },
    ]
  },
  {
    title: "Inventário de Depressão de Beck (BDI-II)",
    description: "Avalia a intensidade de sintomas depressivos. Cada grupo é pontuado de 0 a 3. Resultado: 0-13 mínimo, 14-19 leve, 20-28 moderado, 29-63 grave.",
    category: "depressao",
    scoringRules: { type: "sum", ranges: [
      { min: 0, max: 13, label: "Mínimo" },
      { min: 14, max: 19, label: "Leve" },
      { min: 20, max: 28, label: "Moderado" },
      { min: 29, max: 63, label: "Grave" }
    ]},
    questions: [
      { text: "Tristeza", type: "scale", options: ["Não me sinto triste", "Sinto-me triste muitas vezes", "Estou triste o tempo todo", "Estou tão triste que não consigo suportar"] },
      { text: "Pessimismo", type: "scale", options: ["Não estou desanimado", "Sinto-me mais desanimado que de costume", "Não espero que as coisas deem certo", "Sinto que não há esperança"] },
      { text: "Fracasso passado", type: "scale", options: ["Não me sinto um fracasso", "Fracassei mais do que deveria", "Vejo muitos fracassos", "Sinto-me um fracasso total"] },
      { text: "Perda de prazer", type: "scale", options: ["Tenho prazer nas coisas", "Não sinto tanto prazer", "Tenho pouco prazer", "Não sinto nenhum prazer"] },
      { text: "Sentimentos de culpa", type: "scale", options: ["Não me sinto culpado", "Sinto-me culpado às vezes", "Sinto-me culpado na maioria das vezes", "Sinto-me culpado o tempo todo"] },
      { text: "Sentimento de punição", type: "scale", options: ["Não sinto que esteja sendo punido", "Sinto que posso ser punido", "Espero ser punido", "Sinto que estou sendo punido"] },
      { text: "Autoestima", type: "scale", options: ["Sinto como sempre me senti", "Perdi confiança em mim", "Estou desapontado comigo", "Não gosto de mim"] },
      { text: "Autocrítica", type: "scale", options: ["Não me critico mais que o normal", "Sou mais crítico comigo", "Critico-me por todas falhas", "Me culpo por tudo de ruim"] },
      { text: "Pensamentos suicidas", type: "scale", options: ["Não penso em me matar", "Penso mas não faria", "Gostaria de me matar", "Me mataria se tivesse oportunidade"] },
      { text: "Choro", type: "scale", options: ["Não choro mais que antes", "Choro mais que antes", "Choro por qualquer coisa", "Sinto vontade mas não consigo"] },
      { text: "Agitação", type: "scale", options: ["Não estou mais inquieto", "Sinto-me mais inquieto", "Estou tão inquieto que é difícil ficar parado", "Estou muito inquieto"] },
      { text: "Perda de interesse", type: "scale", options: ["Não perdi interesse", "Estou menos interessado", "Perdi o interesse pela maioria", "É difícil me interessar"] },
      { text: "Indecisão", type: "scale", options: ["Tomo decisões bem", "Acho mais difícil decidir", "Tenho muita dificuldade", "Não consigo tomar decisões"] },
      { text: "Desvalorização", type: "scale", options: ["Me sinto útil", "Não me considero tão útil", "Me sinto mais inútil", "Me sinto completamente inútil"] },
      { text: "Falta de energia", type: "scale", options: ["Tenho energia", "Tenho menos energia", "Não tenho energia para muito", "Não tenho energia para nada"] },
      { text: "Alteração no sono", type: "scale", options: ["Nenhuma mudança", "Durmo um pouco mais/menos", "Durmo muito mais/menos", "Quase o dia todo / quase nada"] },
      { text: "Irritabilidade", type: "scale", options: ["Não estou mais irritável", "Estou mais irritável", "Estou muito mais irritável", "Estou irritável o tempo todo"] },
      { text: "Alteração no apetite", type: "scale", options: ["Nenhuma mudança", "Apetite um pouco diferente", "Apetite muito diferente", "Sem apetite ou como demais"] },
      { text: "Dificuldade de concentração", type: "scale", options: ["Concentro-me bem", "Não me concentro tão bem", "É difícil manter atenção", "Não consigo me concentrar"] },
      { text: "Cansaço ou fadiga", type: "scale", options: ["Não estou mais cansado", "Canso mais facilmente", "Cansado demais para muitas coisas", "Cansado demais para tudo"] },
      { text: "Perda de interesse por sexo", type: "scale", options: ["Nenhuma mudança", "Menos interessado", "Muito menos interessado", "Perdi completamente"] },
    ]
  },
  {
    title: "Escala de Autoestima de Rosenberg",
    description: "Avalia a autoestima global. Itens 2, 5, 6, 8, 9 são invertidos. Resultado: 30-40 autoestima alta, 20-30 média, <20 baixa.",
    category: "autoestima",
    scoringRules: { type: "sum", reverseItems: [1, 4, 5, 7, 8], ranges: [
      { min: 10, max: 19, label: "Autoestima Baixa" },
      { min: 20, max: 29, label: "Autoestima Média" },
      { min: 30, max: 40, label: "Autoestima Alta" }
    ]},
    questions: [
      { text: "Eu sinto que sou uma pessoa de valor, no mínimo tanto quanto as outras pessoas", type: "scale", options: ["Discordo totalmente", "Discordo", "Concordo", "Concordo totalmente"] },
      { text: "Eu acho que eu tenho várias boas qualidades", type: "scale", options: ["Discordo totalmente", "Discordo", "Concordo", "Concordo totalmente"] },
      { text: "Levando tudo em conta, eu penso que sou um fracasso", type: "scale", options: ["Discordo totalmente", "Discordo", "Concordo", "Concordo totalmente"], reverseScored: true },
      { text: "Eu acho que sou capaz de fazer as coisas tão bem quanto a maioria das pessoas", type: "scale", options: ["Discordo totalmente", "Discordo", "Concordo", "Concordo totalmente"] },
      { text: "Eu acho que eu não tenho muito do que me orgulhar", type: "scale", options: ["Discordo totalmente", "Discordo", "Concordo", "Concordo totalmente"], reverseScored: true },
      { text: "Eu tenho uma atitude positiva com relação a mim mesmo", type: "scale", options: ["Discordo totalmente", "Discordo", "Concordo", "Concordo totalmente"] },
      { text: "No conjunto, eu estou satisfeito comigo", type: "scale", options: ["Discordo totalmente", "Discordo", "Concordo", "Concordo totalmente"] },
      { text: "Eu gostaria de poder ter mais respeito por mim mesmo", type: "scale", options: ["Discordo totalmente", "Discordo", "Concordo", "Concordo totalmente"], reverseScored: true },
      { text: "Às vezes eu me sinto inútil", type: "scale", options: ["Discordo totalmente", "Discordo", "Concordo", "Concordo totalmente"], reverseScored: true },
      { text: "Às vezes eu acho que não presto para nada", type: "scale", options: ["Discordo totalmente", "Discordo", "Concordo", "Concordo totalmente"], reverseScored: true },
    ]
  },
  {
    title: "Escala de Estresse Percebido (PSS-10)",
    description: "Avalia o grau de estresse percebido no último mês. Itens 4, 5, 7 e 8 são invertidos. Resultado: 0-13 baixo, 14-26 moderado, 27-40 alto estresse.",
    category: "estresse",
    scoringRules: { type: "sum", reverseItems: [3, 4, 6, 7], ranges: [
      { min: 0, max: 13, label: "Estresse Baixo" },
      { min: 14, max: 26, label: "Estresse Moderado" },
      { min: 27, max: 40, label: "Estresse Alto" }
    ]},
    questions: [
      { text: "Ficou aborrecido por algo inesperado?", type: "scale", options: ["Nunca", "Quase nunca", "Às vezes", "Frequentemente", "Muito frequentemente"] },
      { text: "Sentiu que era incapaz de controlar coisas importantes?", type: "scale", options: ["Nunca", "Quase nunca", "Às vezes", "Frequentemente", "Muito frequentemente"] },
      { text: "Sentiu-se nervoso e estressado?", type: "scale", options: ["Nunca", "Quase nunca", "Às vezes", "Frequentemente", "Muito frequentemente"] },
      { text: "Sentiu-se confiante em lidar com problemas pessoais?", type: "scale", options: ["Nunca", "Quase nunca", "Às vezes", "Frequentemente", "Muito frequentemente"], reverseScored: true },
      { text: "Sentiu que as coisas corriam a seu favor?", type: "scale", options: ["Nunca", "Quase nunca", "Às vezes", "Frequentemente", "Muito frequentemente"], reverseScored: true },
      { text: "Não conseguiu lidar com todas as coisas que tinha que fazer?", type: "scale", options: ["Nunca", "Quase nunca", "Às vezes", "Frequentemente", "Muito frequentemente"] },
      { text: "Sentiu que controlava as irritações do dia a dia?", type: "scale", options: ["Nunca", "Quase nunca", "Às vezes", "Frequentemente", "Muito frequentemente"], reverseScored: true },
      { text: "Sentiu que estava por cima das coisas?", type: "scale", options: ["Nunca", "Quase nunca", "Às vezes", "Frequentemente", "Muito frequentemente"], reverseScored: true },
      { text: "Ficou irritado com coisas fora do seu controle?", type: "scale", options: ["Nunca", "Quase nunca", "Às vezes", "Frequentemente", "Muito frequentemente"] },
      { text: "Sentiu dificuldades acumulando tanto que não conseguia superar?", type: "scale", options: ["Nunca", "Quase nunca", "Às vezes", "Frequentemente", "Muito frequentemente"] },
    ]
  },
  {
    title: "PHQ-9 (Questionário de Saúde do Paciente)",
    description: "Rastreamento e monitoramento de depressão. Resultado: 0-4 nenhuma, 5-9 leve, 10-14 moderada, 15-19 moderadamente grave, 20-27 grave.",
    category: "depressao",
    scoringRules: { type: "sum", ranges: [
      { min: 0, max: 4, label: "Nenhuma" },
      { min: 5, max: 9, label: "Leve" },
      { min: 10, max: 14, label: "Moderada" },
      { min: 15, max: 19, label: "Moderadamente Grave" },
      { min: 20, max: 27, label: "Grave" }
    ]},
    questions: [
      { text: "Pouco interesse ou prazer em fazer as coisas", type: "scale", options: ["Nenhuma vez", "Vários dias", "Mais da metade dos dias", "Quase todos os dias"] },
      { text: "Sentir-se para baixo, deprimido ou sem esperança", type: "scale", options: ["Nenhuma vez", "Vários dias", "Mais da metade dos dias", "Quase todos os dias"] },
      { text: "Dificuldade para dormir/dormir demais", type: "scale", options: ["Nenhuma vez", "Vários dias", "Mais da metade dos dias", "Quase todos os dias"] },
      { text: "Sentir-se cansado ou com pouca energia", type: "scale", options: ["Nenhuma vez", "Vários dias", "Mais da metade dos dias", "Quase todos os dias"] },
      { text: "Falta de apetite ou comer demais", type: "scale", options: ["Nenhuma vez", "Vários dias", "Mais da metade dos dias", "Quase todos os dias"] },
      { text: "Sentir-se mal consigo mesmo", type: "scale", options: ["Nenhuma vez", "Vários dias", "Mais da metade dos dias", "Quase todos os dias"] },
      { text: "Dificuldade para se concentrar", type: "scale", options: ["Nenhuma vez", "Vários dias", "Mais da metade dos dias", "Quase todos os dias"] },
      { text: "Mover-se ou falar tão lentamente / agitação", type: "scale", options: ["Nenhuma vez", "Vários dias", "Mais da metade dos dias", "Quase todos os dias"] },
      { text: "Pensamentos de que seria melhor estar morto", type: "scale", options: ["Nenhuma vez", "Vários dias", "Mais da metade dos dias", "Quase todos os dias"] },
    ]
  },
  {
    title: "GAD-7 (Transtorno de Ansiedade Generalizada)",
    description: "Rastreamento de ansiedade generalizada. Resultado: 0-4 mínima, 5-9 leve, 10-14 moderada, 15-21 grave.",
    category: "ansiedade",
    scoringRules: { type: "sum", ranges: [
      { min: 0, max: 4, label: "Mínima" },
      { min: 5, max: 9, label: "Leve" },
      { min: 10, max: 14, label: "Moderada" },
      { min: 15, max: 21, label: "Grave" }
    ]},
    questions: [
      { text: "Sentir-se nervoso, ansioso ou no limite", type: "scale", options: ["Nenhuma vez", "Vários dias", "Mais da metade dos dias", "Quase todos os dias"] },
      { text: "Não ser capaz de impedir ou controlar as preocupações", type: "scale", options: ["Nenhuma vez", "Vários dias", "Mais da metade dos dias", "Quase todos os dias"] },
      { text: "Preocupar-se muito com diversas coisas", type: "scale", options: ["Nenhuma vez", "Vários dias", "Mais da metade dos dias", "Quase todos os dias"] },
      { text: "Dificuldade para relaxar", type: "scale", options: ["Nenhuma vez", "Vários dias", "Mais da metade dos dias", "Quase todos os dias"] },
      { text: "Ficar tão agitado que é difícil sentar-se e ficar quieto", type: "scale", options: ["Nenhuma vez", "Vários dias", "Mais da metade dos dias", "Quase todos os dias"] },
      { text: "Ficar facilmente aborrecido ou irritável", type: "scale", options: ["Nenhuma vez", "Vários dias", "Mais da metade dos dias", "Quase todos os dias"] },
      { text: "Sentir medo como se algo horrível fosse acontecer", type: "scale", options: ["Nenhuma vez", "Vários dias", "Mais da metade dos dias", "Quase todos os dias"] },
    ]
  }
];

// GET /api/tests/templates
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
    console.error('Tests listing error:', err.message);
    res.json([]);
  }
});

// GET /api/tests/presets - get available preset templates
router.get('/presets', async (req, res) => {
  res.json(PRESET_TESTS);
});

// POST /api/tests/import-preset - import a preset test
router.post('/import-preset', async (req, res) => {
  try {
    const { presetIndex } = req.body;
    const preset = PRESET_TESTS[presetIndex];
    if (!preset) return res.status(400).json({ error: 'Preset inválido' });

    const template = await prisma.testTemplate.create({
      data: {
        professionalId: req.userId,
        title: preset.title,
        description: preset.description,
        category: preset.category,
        isPreset: true,
        scoringRules: preset.scoringRules,
        questions: {
          create: preset.questions.map((q, i) => ({
            text: q.text,
            type: q.type || 'scale',
            options: q.options || [],
            orderNum: i,
            weight: 1,
            reverseScored: q.reverseScored || false
          }))
        }
      },
      include: { questions: { orderBy: { orderNum: 'asc' } } }
    });
    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao importar preset', details: err.message });
  }
});

// POST /api/tests/import-json - import test from JSON
router.post('/import-json', async (req, res) => {
  try {
    const { title, description, category, scoringRules, questions } = req.body;
    if (!title || !questions?.length) {
      return res.status(400).json({ error: 'Título e perguntas são obrigatórios' });
    }

    const template = await prisma.testTemplate.create({
      data: {
        professionalId: req.userId,
        title,
        description,
        category,
        scoringRules: scoringRules || null,
        questions: {
          create: questions.map((q, i) => ({
            text: q.text,
            type: q.type || 'scale',
            options: q.options || [],
            orderNum: i,
            weight: q.weight || 1,
            reverseScored: q.reverseScored || false
          }))
        }
      },
      include: { questions: { orderBy: { orderNum: 'asc' } } }
    });
    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao importar JSON', details: err.message });
  }
});

// GET /api/tests/templates/:id/export - export test as JSON
router.get('/templates/:id/export', async (req, res) => {
  try {
    const template = await prisma.testTemplate.findFirst({
      where: { id: req.params.id, professionalId: req.userId },
      include: { questions: { orderBy: { orderNum: 'asc' } } }
    });
    if (!template) return res.status(404).json({ error: 'Teste não encontrado' });

    const exportData = {
      title: template.title,
      description: template.description,
      category: template.category,
      scoringRules: template.scoringRules,
      questions: template.questions.map(q => ({
        text: q.text,
        type: q.type,
        options: q.options,
        weight: q.weight,
        reverseScored: q.reverseScored
      }))
    };
    res.json(exportData);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao exportar teste' });
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
    const { title, description, category, scoringRules, questions, introText, completionMessage, questionsPerPage } = req.body;
    if (!title) return res.status(400).json({ error: 'Título é obrigatório' });

    const template = await prisma.testTemplate.create({
      data: {
        professionalId: req.userId,
        title,
        description,
        category,
        scoringRules: scoringRules || null,
        introText: introText || null,
        completionMessage: completionMessage || null,
        questionsPerPage: questionsPerPage || 1,
        questions: questions?.length ? {
          create: questions.map((q, i) => ({
            text: q.text,
            type: q.type || 'scale',
            options: q.options || [],
            orderNum: i,
            weight: q.weight || 1,
            reverseScored: q.reverseScored || false
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

    const { title, description, category, isActive, scoringRules, questions, introText, completionMessage, questionsPerPage } = req.body;
    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (category !== undefined) data.category = category;
    if (isActive !== undefined) data.isActive = isActive;
    if (scoringRules !== undefined) data.scoringRules = scoringRules;
    if (introText !== undefined) data.introText = introText;
    if (completionMessage !== undefined) data.completionMessage = completionMessage;
    if (questionsPerPage !== undefined) data.questionsPerPage = questionsPerPage;

    if (questions) {
      await prisma.testQuestion.deleteMany({ where: { templateId: req.params.id } });
      await prisma.testQuestion.createMany({
        data: questions.map((q, i) => ({
          templateId: req.params.id,
          text: q.text,
          type: q.type || 'scale',
          options: q.options || [],
          orderNum: i,
          weight: q.weight || 1,
          reverseScored: q.reverseScored || false
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

// DELETE /api/tests/templates/:id
router.delete('/templates/:id', async (req, res) => {
  try {
    await prisma.testTemplate.deleteMany({
      where: { id: req.params.id, professionalId: req.userId }
    });
    res.json({ message: 'Teste removido' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover teste' });
  }
});

// GET /api/tests/assignments (professional: list all assignments for their templates)
router.get('/assignments', async (req, res) => {
  try {
    const assignments = await prisma.testAssignment.findMany({
      where: {
        template: { professionalId: req.userId }
      },
      include: {
        template: { select: { title: true, description: true, category: true } },
        patient: { select: { id: true, name: true } },
        _count: { select: { responses: true } }
      },
      orderBy: { assignedAt: 'desc' }
    });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar atribuições', details: err.message });
  }
});

// DELETE /api/tests/assignments/:id
router.delete('/assignments/:id', async (req, res) => {
  try {
    const assignment = await prisma.testAssignment.findUnique({
      where: { id: req.params.id },
      include: { template: { select: { professionalId: true } } }
    });
    if (!assignment) return res.status(404).json({ error: 'Não encontrado' });
    if (assignment.template.professionalId !== req.userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    await prisma.testResponse.deleteMany({ where: { assignmentId: req.params.id } });
    await prisma.testAssignment.delete({ where: { id: req.params.id } });
    res.json({ message: 'Envio removido' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover envio', details: err.message });
  }
});

// POST /api/tests/assignments/:id/resend (reset status to pending)
router.post('/assignments/:id/resend', async (req, res) => {
  try {
    const assignment = await prisma.testAssignment.findUnique({
      where: { id: req.params.id },
      include: { template: { select: { professionalId: true } } }
    });
    if (!assignment) return res.status(404).json({ error: 'Não encontrado' });
    if (assignment.template.professionalId !== req.userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    // Delete old responses so patient can re-answer
    await prisma.testResponse.deleteMany({ where: { assignmentId: req.params.id } });

    const updated = await prisma.testAssignment.update({
      where: { id: req.params.id },
      data: { status: 'pending', completedAt: null, score: null, classification: null, assignedAt: new Date() }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao reenviar teste', details: err.message });
  }
});

// POST /api/tests/assign
router.post('/assign', async (req, res) => {
  try {
    const { templateId, patientId, coupleId } = req.body;
    if (!templateId) return res.status(400).json({ error: 'templateId é obrigatório' });

    // Get current user to check role/org
    const currentUser = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!currentUser) return res.status(401).json({ error: 'Usuário não encontrado' });

    const template = await prisma.testTemplate.findFirst({
      where: { id: templateId, professionalId: req.userId }
    });
    if (!template) return res.status(404).json({ error: 'Teste não encontrado' });

    // Look up patient by id, check org match or direct ownership
    // Simplified: look up patient by id, check org match or direct ownership
    const findPatient = async (pid) => {
      const p = await prisma.patient.findFirst({
        where: {
          id: pid,
          OR: [
            { professionalId: req.userId },
            ...(currentUser.organizationId
              ? [{ professional: { organizationId: currentUser.organizationId } }]
              : [])
          ]
        }
      });
      return p;
    };

    // If coupleId is provided, assign to both patients in the couple individually
    if (coupleId) {
      const coupleWhere = {
        id: coupleId,
        OR: [
          { professionalId: req.userId },
          ...(currentUser.organizationId
            ? [{ professional: { organizationId: currentUser.organizationId } }]
            : [])
        ]
      };
      const couple = await prisma.couple.findFirst({
        where: coupleWhere,
        include: { patient1: { select: { id: true, name: true } }, patient2: { select: { id: true, name: true } } }
      });
      if (!couple) return res.status(404).json({ error: 'Casal não encontrado' });

      const [a1, a2] = await Promise.all([
        prisma.testAssignment.create({
          data: { templateId, patientId: couple.patient1Id },
          include: { template: { select: { title: true } }, patient: { select: { name: true } } }
        }),
        prisma.testAssignment.create({
          data: { templateId, patientId: couple.patient2Id },
          include: { template: { select: { title: true } }, patient: { select: { name: true } } }
        })
      ]);

      return res.status(201).json({ assignments: [a1, a2], message: `Teste enviado para ${couple.patient1.name} e ${couple.patient2.name}` });
    }

    // Single patient assignment
    if (!patientId) return res.status(400).json({ error: 'patientId ou coupleId é obrigatório' });

    const patient = await findPatient(patientId);
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

// GET /api/tests/assignments/:id/results
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

    if (assignment.template.professionalId !== req.userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Calculate score if scoring rules exist
    let score = null;
    let classification = null;
    if (assignment.template.scoringRules && assignment.status === 'completed') {
      const rules = assignment.template.scoringRules;
      const questions = assignment.template.questions;
      let total = 0;
      
      for (const q of questions) {
        const resp = assignment.responses.find(r => r.questionId === q.id);
        if (resp) {
          let val = parseInt(resp.answer) || 0;
          if (q.reverseScored && q.options.length > 0) {
            val = q.options.length - 1 - val;
          }
          total += val * (q.weight || 1);
        }
      }
      
      score = total;
      if (rules.ranges) {
        const range = rules.ranges.find(r => total >= r.min && total <= r.max);
        classification = range?.label || 'Indefinido';
      }
    }

    res.json({ ...assignment, score, classification });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar resultados' });
  }
});

// PATCH /api/tests/assignments/:id/clinical-note
router.patch('/assignments/:id/clinical-note', async (req, res) => {
  try {
    const assignment = await prisma.testAssignment.findUnique({
      where: { id: req.params.id },
      include: { template: { select: { professionalId: true } } }
    });
    if (!assignment) return res.status(404).json({ error: 'Atribuição não encontrada' });
    if (assignment.template.professionalId !== req.userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { professionalAssessment, professionalConclusion, aiInterpretation } = req.body;
    const data = {};
    if (professionalAssessment !== undefined) data.professionalAssessment = professionalAssessment;
    if (professionalConclusion !== undefined) data.professionalConclusion = professionalConclusion;
    if (aiInterpretation !== undefined) data.aiInterpretation = aiInterpretation;

    const updated = await prisma.testAssignment.update({
      where: { id: req.params.id },
      data,
      include: {
        template: { select: { title: true } },
        patient: { select: { id: true, name: true } }
      }
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar nota clínica', details: err.message });
  }
});

// Also save score/classification when results are calculated
router.patch('/assignments/:id/save-score', async (req, res) => {
  try {
    const { score, classification } = req.body;
    const assignment = await prisma.testAssignment.findUnique({
      where: { id: req.params.id },
      include: { template: { select: { professionalId: true } } }
    });
    if (!assignment || assignment.template.professionalId !== req.userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    const updated = await prisma.testAssignment.update({
      where: { id: req.params.id },
      data: { score, classification }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar pontuação' });
  }
});

// ======== PATIENT ENDPOINTS ========


router.get('/my', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.patientId) return res.status(403).json({ error: 'Acesso negado' });

    const assignments = await prisma.testAssignment.findMany({
      where: { patientId: user.patientId },
      include: {
        template: { select: { title: true, category: true, introText: true, completionMessage: true, questionsPerPage: true } },
        _count: { select: { responses: true } }
      },
      orderBy: { assignedAt: 'desc' }
    });

    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar testes' });
  }
});

router.get('/my/:assignmentId', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.patientId) return res.status(403).json({ error: 'Acesso negado' });

    const assignment = await prisma.testAssignment.findFirst({
      where: { id: req.params.assignmentId, patientId: user.patientId },
      include: {
        template: { include: { questions: { orderBy: { orderNum: 'asc' } } } },
        responses: true
      }
    });

    if (!assignment) return res.status(404).json({ error: 'Teste não encontrado' });
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar teste' });
  }
});

router.post('/my/:assignmentId/respond', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.patientId) return res.status(403).json({ error: 'Acesso negado' });

    const assignment = await prisma.testAssignment.findFirst({
      where: { id: req.params.assignmentId, patientId: user.patientId, status: 'pending' },
      include: {
        template: {
          include: { questions: { orderBy: { orderNum: 'asc' } } }
        },
        patient: { select: { id: true, name: true, professionalId: true } }
      }
    });
    if (!assignment) return res.status(404).json({ error: 'Teste não encontrado ou já respondido' });

    const { responses } = req.body;
    if (!Array.isArray(responses) || !responses.length) {
      return res.status(400).json({ error: 'Respostas são obrigatórias' });
    }

    await prisma.testResponse.createMany({
      data: responses.map(r => ({
        assignmentId: req.params.assignmentId,
        questionId: r.questionId,
        answer: String(r.answer)
      }))
    });

    // Calculate score
    let score = null;
    let classification = null;
    const rules = assignment.template.scoringRules;
    if (rules) {
      let total = 0;
      for (const q of assignment.template.questions) {
        const resp = responses.find(r => r.questionId === q.id);
        if (resp) {
          let val = parseInt(resp.answer) || 0;
          if (q.reverseScored && q.options.length > 0) {
            val = q.options.length - 1 - val;
          }
          total += val * (q.weight || 1);
        }
      }
      score = total;
      if (rules.ranges) {
        const range = rules.ranges.find(r => total >= r.min && total <= r.max);
        classification = range?.label || 'Indefinido';
      }
    }

    // Build test summary for the record
    const answeredQuestions = assignment.template.questions.map(q => {
      const resp = responses.find(r => r.questionId === q.id);
      const answerIdx = resp ? parseInt(resp.answer) : null;
      const answerText = (answerIdx !== null && q.options[answerIdx]) ? q.options[answerIdx] : (resp?.answer || '—');
      return `• ${q.text}: ${answerText}`;
    }).join('\n');

    const scoreLine = score !== null ? `\n\nPontuação: ${score}${classification ? ` — ${classification}` : ''}` : '';
    const recordContent = `Resultado do teste: ${assignment.template.title}\n\n${answeredQuestions}${scoreLine}`;

    // Create a clinical record automatically
    const record = await prisma.record.create({
      data: {
        professionalId: assignment.patient.professionalId,
        patientId: assignment.patient.id,
        type: 'individual',
        date: new Date(),
        modality: 'test',
        content: recordContent,
        complaint: `Teste psicológico: ${assignment.template.title}`,
        keyPoints: classification ? `Classificação: ${classification}` : null,
        themes: [assignment.template.category || 'teste'].filter(Boolean),
      }
    });

    const updated = await prisma.testAssignment.update({
      where: { id: req.params.assignmentId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        score,
        classification,
        clinicalRecordId: record.id
      }
    });

    res.json(updated);
  } catch (err) {
    console.error('Test respond error:', err);
    res.status(500).json({ error: 'Erro ao enviar respostas', details: err.message });
  }
});

module.exports = router;
