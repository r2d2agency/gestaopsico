const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// POST /api/import/csv - Import CSV bank statement
router.post('/csv', async (req, res) => {
  try {
    const { rows, bankName, accountName } = req.body;
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Nenhuma transação encontrada no arquivo' });
    }

    const created = [];
    for (const row of rows) {
      const value = Math.abs(parseFloat(row.value) || 0);
      if (value === 0) continue;

      const isExpense = parseFloat(row.value) < 0;
      const account = await prisma.account.create({
        data: {
          professionalId: req.userId,
          type: isExpense ? 'payable' : 'receivable',
          description: row.description || 'Transação importada',
          value,
          dueDate: row.date ? new Date(row.date) : new Date(),
          status: 'paid',
          paidAt: row.date ? new Date(row.date) : new Date(),
          category: row.category || (isExpense ? 'Importado - Saída' : 'Importado - Entrada'),
          notes: `Importado de ${bankName || 'extrato'}${accountName ? ` - ${accountName}` : ''}`,
        }
      });
      created.push(account);
    }

    res.json({
      imported: created.length,
      total: rows.length,
      message: `${created.length} transações importadas com sucesso`
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao importar transações', details: err.message });
  }
});

// POST /api/import/ofx - Import OFX bank statement
router.post('/ofx', async (req, res) => {
  try {
    const { content, bankName } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Conteúdo OFX não fornecido' });
    }

    // Simple OFX parser
    const transactions = [];
    const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;
    while ((match = stmtTrnRegex.exec(content)) !== null) {
      const block = match[1];
      const getField = (name) => {
        const r = new RegExp(`<${name}>([^<\\n]+)`, 'i');
        const m = block.match(r);
        return m ? m[1].trim() : null;
      };

      const trnType = getField('TRNTYPE');
      const dtPosted = getField('DTPOSTED');
      const trnAmt = getField('TRNAMT');
      const memo = getField('MEMO') || getField('NAME') || 'Transação OFX';

      if (trnAmt) {
        const value = parseFloat(trnAmt.replace(',', '.'));
        let date = new Date();
        if (dtPosted && dtPosted.length >= 8) {
          date = new Date(
            parseInt(dtPosted.substring(0, 4)),
            parseInt(dtPosted.substring(4, 6)) - 1,
            parseInt(dtPosted.substring(6, 8))
          );
        }
        transactions.push({ value, date, description: memo, type: trnType });
      }
    }

    // Also try to get balance
    let balance = null;
    const balAmtMatch = content.match(/<BALAMT>([^<\n]+)/i);
    if (balAmtMatch) {
      balance = parseFloat(balAmtMatch[1].replace(',', '.'));
    }

    const created = [];
    for (const txn of transactions) {
      const absValue = Math.abs(txn.value);
      if (absValue === 0) continue;

      const isExpense = txn.value < 0;
      const account = await prisma.account.create({
        data: {
          professionalId: req.userId,
          type: isExpense ? 'payable' : 'receivable',
          description: txn.description,
          value: absValue,
          dueDate: txn.date,
          status: 'paid',
          paidAt: txn.date,
          category: isExpense ? 'Importado - Saída' : 'Importado - Entrada',
          notes: `Importado OFX${bankName ? ` - ${bankName}` : ''}`,
        }
      });
      created.push(account);
    }

    res.json({
      imported: created.length,
      total: transactions.length,
      balance,
      message: `${created.length} transações importadas com sucesso`
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao importar OFX', details: err.message });
  }
});

module.exports = router;
