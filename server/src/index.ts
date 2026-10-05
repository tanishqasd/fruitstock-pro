import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { access } from 'node:fs/promises';
import { asyncRoute, auth, money, prisma, serial } from './lib.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
const clientIndex = path.join(clientDist, 'index.html');

if (process.env.NODE_ENV === 'production') {
  for (const name of ['DATABASE_URL', 'JWT_SECRET']) {
    if (!process.env[name]?.trim()) throw new Error(`Missing required environment variable: ${name}`);
  }
  await access(clientIndex).catch(() => {
    throw new Error('Built frontend is missing. Run npm run build from the repository root.');
  });
}

app.use(cors({ origin: process.env.CLIENT_URL?.split(',') || true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', asyncRoute(async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    await access(clientIndex);
    // Validate every business model so a partial migration cannot pass readiness.
    await Promise.all([
      prisma.user.findFirst(), prisma.product.findFirst(), prisma.dealer.findFirst(),
      prisma.customer.findFirst(), prisma.purchase.findFirst(), prisma.purchaseItem.findFirst(),
      prisma.sale.findFirst(), prisma.saleItem.findFirst(), prisma.payment.findFirst(),
      prisma.stockTransaction.findFirst(), prisma.expense.findFirst()
    ]);
    res.json({ status: 'ok', service: 'fruitstock-api', database: 'ok', frontend: 'ok' });
  } catch {
    res.status(503).json({ status: 'unavailable', service: 'fruitstock-api' });
  }
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const { email, password } = z.object({ email: z.string().email(), password: z.string().min(6) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'development-only-secret', { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, businessName: user.businessName } });
}));

// This service manages one business; owner access is provisioned by its administrator.
app.post('/api/auth/signup', (_req, res) => res.status(403).json({
  message: 'Public registration is disabled. Ask your administrator to create an owner account.'
}));

app.use('/api', auth);

app.get('/api/me', asyncRoute(async (req, res) => {
  const id = (req as typeof req & { user: { id: string } }).user.id;
  const user = await prisma.user.findUniqueOrThrow({ where: { id }, select: { id: true, name: true, email: true, businessName: true } });
  res.json(user);
}));

app.get('/api/dashboard', asyncRoute(async (_req, res) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const [todaySales, todayPurchases, todayReceived, todayPaid, salesAll, purchasesAll, receivedAll, paidAll, customerOpening, dealerOpening, products, recentSales, recentPurchases, expenses] = await Promise.all([
    prisma.sale.aggregate({ where: { date: { gte: start } }, _sum: { totalAmount: true, costAmount: true } }),
    prisma.purchase.aggregate({ where: { date: { gte: start } }, _sum: { totalAmount: true } }),
    prisma.payment.aggregate({ where: { direction: 'RECEIVED', date: { gte: start } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { direction: 'PAID', date: { gte: start } }, _sum: { amount: true } }),
    prisma.sale.aggregate({ _sum: { totalAmount: true } }),
    prisma.purchase.aggregate({ _sum: { totalAmount: true } }),
    prisma.payment.aggregate({ where: { direction: 'RECEIVED' }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { direction: 'PAID' }, _sum: { amount: true } }),
    prisma.customer.aggregate({ _sum: { openingBalance: true } }),
    prisma.dealer.aggregate({ _sum: { openingBalance: true } }),
    prisma.product.findMany({ orderBy: { currentStock: 'asc' } }),
    prisma.sale.findMany({ take: 5, orderBy: { date: 'desc' }, include: { customer: true, items: { include: { product: true } } } }),
    prisma.purchase.findMany({ take: 5, orderBy: { date: 'desc' }, include: { dealer: true, items: { include: { product: true } } } }),
    prisma.expense.aggregate({ where: { date: { gte: start } }, _sum: { amount: true } })
  ]);

  const stockValue = products.reduce((sum, p) => sum + money(p.currentStock) * money(p.avgCost), 0);
  res.json({
    metrics: {
      todaySales: money(todaySales._sum.totalAmount), todayPurchases: money(todayPurchases._sum.totalAmount),
      cashReceived: money(todayReceived._sum.amount), paymentsMade: money(todayPaid._sum.amount),
      receivables: Math.max(0, money(customerOpening._sum.openingBalance) + money(salesAll._sum.totalAmount) - money(receivedAll._sum.amount)),
      payables: Math.max(0, money(dealerOpening._sum.openingBalance) + money(purchasesAll._sum.totalAmount) - money(paidAll._sum.amount)),
      stockValue, todayProfit: money(todaySales._sum.totalAmount) - money(todaySales._sum.costAmount) - money(expenses._sum.amount)
    },
    lowStock: products.filter(p => money(p.currentStock) <= money(p.minStock)).slice(0, 5),
    recentSales, recentPurchases
  });
}));

app.get('/api/products', asyncRoute(async (_req, res) => {
  res.json(await prisma.product.findMany({ orderBy: [{ name: 'asc' }, { variety: 'asc' }] }));
}));

app.post('/api/products', asyncRoute(async (req, res) => {
  const input = z.object({
    name: z.string().min(2), variety: z.string().optional(), unit: z.string().default('kg'),
    purchaseRate: z.coerce.number().nonnegative(), sellingRate: z.coerce.number().nonnegative(),
    currentStock: z.coerce.number().nonnegative().default(0), minStock: z.coerce.number().nonnegative().default(0)
  }).parse(req.body);
  const product = await prisma.$transaction(async tx => {
    const created = await tx.product.create({ data: { ...input, avgCost: input.purchaseRate } });
    if (input.currentStock > 0) await tx.stockTransaction.create({ data: { productId: created.id, type: 'OPENING', quantity: input.currentStock, unitCost: input.purchaseRate, reference: 'Opening stock' } });
    return created;
  });
  res.status(201).json(product);
}));

app.patch('/api/products/:id', asyncRoute(async (req, res) => {
  const input = z.object({ name: z.string().min(2).optional(), variety: z.string().nullable().optional(), unit: z.string().optional(), purchaseRate: z.coerce.number().nonnegative().optional(), sellingRate: z.coerce.number().nonnegative().optional(), minStock: z.coerce.number().nonnegative().optional() }).parse(req.body);
  res.json(await prisma.product.update({ where: { id: String(req.params.id) }, data: input }));
}));

app.get('/api/customers', asyncRoute(async (_req, res) => {
  const rows = await prisma.customer.findMany({ include: { _count: { select: { sales: true } }, sales: { select: { totalAmount: true } }, payments: { select: { amount: true } } }, orderBy: { name: 'asc' } });
  res.json(rows.map(({ sales, payments, ...c }) => ({ ...c, totalSales: sales.reduce((s, x) => s + money(x.totalAmount), 0), totalReceived: payments.reduce((s, x) => s + money(x.amount), 0), outstanding: money(c.openingBalance) + sales.reduce((s, x) => s + money(x.totalAmount), 0) - payments.reduce((s, x) => s + money(x.amount), 0) })));
}));

app.post('/api/customers', asyncRoute(async (req, res) => {
  const input = z.object({ name: z.string().min(2), phone: z.string().optional(), address: z.string().optional(), gstNumber: z.string().optional(), creditLimit: z.coerce.number().nonnegative().default(0), openingBalance: z.coerce.number().default(0), paymentTerms: z.coerce.number().int().nonnegative().default(7) }).parse(req.body);
  res.status(201).json(await prisma.customer.create({ data: input }));
}));

app.get('/api/customers/:id', asyncRoute(async (req, res) => {
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: String(req.params.id) }, include: {
    sales: { orderBy: { date: 'desc' }, include: { items: { include: { product: true } } } },
    payments: { orderBy: { date: 'desc' } }
  } });
  const outstandingBalance = money(customer.openingBalance)
    + customer.sales.reduce((sum, sale) => sum + money(sale.totalAmount), 0)
    - customer.payments.reduce((sum, payment) => sum + money(payment.amount), 0);
  res.json({ ...customer, outstandingBalance, outstanding: outstandingBalance });
}));

app.put('/api/customers/:id', asyncRoute(async (req, res) => {
  const input = z.object({ name: z.string().min(2).optional(), phone: z.string().optional(), address: z.string().optional(),
    gstNumber: z.string().optional(), creditLimit: z.coerce.number().nonnegative().optional(),
    paymentTerms: z.coerce.number().int().nonnegative().optional() }).parse(req.body);
  res.json(await prisma.customer.update({ where: { id: String(req.params.id) }, data: input }));
}));

app.get('/api/dealers', asyncRoute(async (_req, res) => {
  const rows = await prisma.dealer.findMany({ include: { _count: { select: { purchases: true } }, purchases: { select: { totalAmount: true } }, payments: { select: { amount: true } } }, orderBy: { name: 'asc' } });
  res.json(rows.map(({ purchases, payments, ...d }) => ({ ...d, totalPurchases: purchases.reduce((s, x) => s + money(x.totalAmount), 0), totalPaid: payments.reduce((s, x) => s + money(x.amount), 0), payable: money(d.openingBalance) + purchases.reduce((s, x) => s + money(x.totalAmount), 0) - payments.reduce((s, x) => s + money(x.amount), 0) })));
}));

app.post('/api/dealers', asyncRoute(async (req, res) => {
  const input = z.object({ name: z.string().min(2), phone: z.string().optional(), address: z.string().optional(), gstNumber: z.string().optional(), bankDetails: z.string().optional(), contactPerson: z.string().optional(), openingBalance: z.coerce.number().default(0) }).parse(req.body);
  res.status(201).json(await prisma.dealer.create({ data: input }));
}));

app.get('/api/dealers/:id', asyncRoute(async (req, res) => {
  const dealer = await prisma.dealer.findUniqueOrThrow({ where: { id: String(req.params.id) }, include: {
    purchases: { orderBy: { date: 'desc' }, include: { items: { include: { product: true } } } },
    payments: { orderBy: { date: 'desc' } }
  } });
  const balanceDue = money(dealer.openingBalance)
    + dealer.purchases.reduce((sum, purchase) => sum + money(purchase.totalAmount), 0)
    - dealer.payments.reduce((sum, payment) => sum + money(payment.amount), 0);
  res.json({ ...dealer, balanceDue, payable: balanceDue });
}));

app.put('/api/dealers/:id', asyncRoute(async (req, res) => {
  const input = z.object({ name: z.string().min(2).optional(), phone: z.string().optional(), address: z.string().optional(),
    gstNumber: z.string().optional(), bankDetails: z.string().optional(), contactPerson: z.string().optional() }).parse(req.body);
  res.json(await prisma.dealer.update({ where: { id: String(req.params.id) }, data: input }));
}));

const lineSchema = z.object({ productId: z.string(), quantity: z.coerce.number().positive(), rate: z.coerce.number().nonnegative() });

app.get('/api/purchases', asyncRoute(async (_req, res) => {
  res.json(await prisma.purchase.findMany({ include: { dealer: true, items: { include: { product: true } } }, orderBy: { date: 'desc' } }));
}));

app.post('/api/purchases', asyncRoute(async (req, res) => {
  const input = z.object({ dealerId: z.string(), date: z.coerce.date().optional(), invoiceNo: z.string().optional(), paidAmount: z.coerce.number().nonnegative().default(0), notes: z.string().optional(), paymentMode: z.enum(['CASH','UPI','BANK_TRANSFER','CHEQUE','OTHER']).default('CASH'), items: z.array(lineSchema).min(1) }).parse(req.body);
  const result = await prisma.$transaction(async tx => {
    const products = await tx.product.findMany({ where: { id: { in: input.items.map(i => i.productId) } } });
    if (products.length !== new Set(input.items.map(i => i.productId)).size) throw new Error('One or more fruits were not found');
    const total = input.items.reduce((s, i) => s + i.quantity * i.rate, 0);
    if (input.paidAmount > total) throw new Error('Paid amount cannot exceed purchase total');
    const purchaseNo = serial('PUR');
    const purchase = await tx.purchase.create({ data: { dealerId: input.dealerId, date: input.date, invoiceNo: input.invoiceNo, paidAmount: input.paidAmount, pendingAmount: total - input.paidAmount, totalAmount: total, purchaseNo, notes: input.notes, items: { create: input.items.map(i => ({ productId: i.productId, quantity: i.quantity, rate: i.rate, amount: i.quantity * i.rate })) } } });
    for (const item of input.items) {
      const product = products.find(p => p.id === item.productId)!;
      const oldQty = money(product.currentStock); const newQty = oldQty + item.quantity;
      const newAvg = newQty ? ((oldQty * money(product.avgCost)) + (item.quantity * item.rate)) / newQty : item.rate;
      await tx.product.update({ where: { id: item.productId }, data: { currentStock: { increment: item.quantity }, avgCost: newAvg, purchaseRate: item.rate } });
      await tx.stockTransaction.create({ data: { productId: item.productId, type: 'PURCHASE', quantity: item.quantity, unitCost: item.rate, reference: purchaseNo, date: input.date } });
    }
    if (input.paidAmount > 0) await tx.payment.create({ data: { direction: 'PAID', dealerId: input.dealerId, amount: input.paidAmount, mode: input.paymentMode, date: input.date, reference: purchaseNo } });
    return purchase;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  res.status(201).json(result);
}));

app.get('/api/sales', asyncRoute(async (_req, res) => {
  res.json(await prisma.sale.findMany({ include: { customer: true, items: { include: { product: true } } }, orderBy: { date: 'desc' } }));
}));

app.post('/api/sales', asyncRoute(async (req, res) => {
  const input = z.object({ customerId: z.string().optional(), date: z.coerce.date().optional(), invoiceNo: z.string().optional(), receivedAmount: z.coerce.number().nonnegative().default(0), notes: z.string().optional(), paymentMode: z.enum(['CASH','UPI','BANK_TRANSFER','CHEQUE','OTHER']).default('CASH'), items: z.array(lineSchema).min(1) }).parse(req.body);
  const result = await prisma.$transaction(async tx => {
    const products = await tx.product.findMany({ where: { id: { in: input.items.map(i => i.productId) } } });
    if (products.length !== new Set(input.items.map(i => i.productId)).size) throw new Error('One or more fruits were not found');
    for (const item of input.items) { const p = products.find(x => x.id === item.productId)!; if (money(p.currentStock) < item.quantity) throw new Error(`Insufficient stock for ${p.name}. Available: ${p.currentStock} ${p.unit}`); }
    const total = input.items.reduce((s, i) => s + i.quantity * i.rate, 0);
    if (input.receivedAmount > total) throw new Error('Received amount cannot exceed sale total');
    if (!input.customerId && input.receivedAmount < total) throw new Error('A customer is required for a credit sale');
    const cost = input.items.reduce((s, i) => s + i.quantity * money(products.find(p => p.id === i.productId)!.avgCost), 0);
    const saleNo = serial('SAL');
    const sale = await tx.sale.create({ data: { customerId: input.customerId, date: input.date, invoiceNo: input.invoiceNo, receivedAmount: input.receivedAmount, pendingAmount: total - input.receivedAmount, totalAmount: total, costAmount: cost, saleNo, notes: input.notes, items: { create: input.items.map(i => ({ productId: i.productId, quantity: i.quantity, rate: i.rate, amount: i.quantity * i.rate, costRate: products.find(p => p.id === i.productId)!.avgCost })) } } });
    for (const item of input.items) {
      const product = products.find(p => p.id === item.productId)!;
      await tx.product.update({ where: { id: item.productId }, data: { currentStock: { decrement: item.quantity }, sellingRate: item.rate } });
      await tx.stockTransaction.create({ data: { productId: item.productId, type: 'SALE', quantity: -item.quantity, unitCost: product.avgCost, reference: saleNo, date: input.date } });
    }
    if (input.receivedAmount > 0) await tx.payment.create({ data: { direction: 'RECEIVED', customerId: input.customerId, amount: input.receivedAmount, mode: input.paymentMode, date: input.date, reference: saleNo } });
    return sale;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  res.status(201).json(result);
}));

app.get('/api/payments', asyncRoute(async (_req, res) => {
  res.json(await prisma.payment.findMany({ include: { customer: true, dealer: true }, orderBy: { date: 'desc' } }));
}));

app.post('/api/payments', asyncRoute(async (req, res) => {
  const input = z.object({ direction: z.enum(['RECEIVED','PAID']), customerId: z.string().optional(), dealerId: z.string().optional(), amount: z.coerce.number().positive(), mode: z.enum(['CASH','UPI','BANK_TRANSFER','CHEQUE','OTHER']).default('CASH'), date: z.coerce.date().optional(), reference: z.string().optional(), notes: z.string().optional() }).refine(x => x.direction === 'RECEIVED' ? !!x.customerId && !x.dealerId : !!x.dealerId && !x.customerId, 'Choose the correct customer or dealer').parse(req.body);
  res.status(201).json(await prisma.payment.create({ data: input }));
}));

app.get('/api/stock-ledger', asyncRoute(async (req, res) => {
  const productId = typeof req.query.productId === 'string' ? req.query.productId : undefined;
  res.json(await prisma.stockTransaction.findMany({ where: { productId }, include: { product: true }, orderBy: { date: 'desc' }, take: 200 }));
}));

app.post('/api/stock-adjustments', asyncRoute(async (req, res) => {
  const input = z.object({ productId: z.string(), quantity: z.coerce.number().refine(v => v !== 0), reason: z.string().min(2), date: z.coerce.date().optional() }).parse(req.body);
  const product = await prisma.product.findUniqueOrThrow({ where: { id: input.productId } });
  if (money(product.currentStock) + input.quantity < 0) return res.status(400).json({ message: 'Adjustment would make stock negative' });
  const reference = serial('ADJ');
  await prisma.$transaction([
    prisma.product.update({ where: { id: input.productId }, data: { currentStock: { increment: input.quantity } } }),
    prisma.stockTransaction.create({ data: { ...input, type: input.quantity < 0 ? 'DAMAGE' : 'ADJUSTMENT', reference, unitCost: product.avgCost } })
  ]);
  res.status(201).json({ reference });
}));

app.get('/api/expenses', asyncRoute(async (_req, res) => res.json(await prisma.expense.findMany({ orderBy: { date: 'desc' } }))));
app.post('/api/expenses', asyncRoute(async (req, res) => {
  const input = z.object({ title: z.string().min(2), category: z.string().min(2), amount: z.coerce.number().positive(), date: z.coerce.date().optional(), paymentMode: z.enum(['CASH','UPI','BANK_TRANSFER','CHEQUE','OTHER']).default('CASH'), notes: z.string().optional() }).parse(req.body);
  res.status(201).json(await prisma.expense.create({ data: input }));
}));

app.get('/api/transactions', asyncRoute(async (_req, res) => {
  const [sales, purchases, expenses, payments] = await Promise.all([
    prisma.sale.findMany({ include: { customer: true } }),
    prisma.purchase.findMany({ include: { dealer: true } }),
    prisma.expense.findMany(),
    prisma.payment.findMany({ select: { reference: true, mode: true } })
  ]);
  const paymentMode = (reference: string) => payments.find(payment => payment.reference === reference)?.mode || 'UNPAID';
  const rows = [
    ...sales.map(sale => ({ id: sale.id, transactionType: 'SALE', date: sale.date, partyName: sale.customer?.name || 'Walk-in customer',
      category: 'Sale', amount: money(sale.totalAmount), paymentMode: paymentMode(sale.saleNo), reference: sale.saleNo, direction: 'IN' })),
    ...purchases.map(purchase => ({ id: purchase.id, transactionType: 'PURCHASE', date: purchase.date, partyName: purchase.dealer.name,
      category: 'Purchase', amount: money(purchase.totalAmount), paymentMode: paymentMode(purchase.purchaseNo), reference: purchase.purchaseNo, direction: 'OUT' })),
    ...expenses.map(expense => ({ id: expense.id, transactionType: 'EXPENSE', date: expense.date, partyName: expense.title,
      category: expense.category, amount: money(expense.amount), paymentMode: expense.paymentMode, reference: expense.id, direction: 'OUT' }))
  ];
  res.json(rows.sort((a, b) => b.date.getTime() - a.date.getTime()));
}));

app.use('/api', (_req, res) => res.status(404).json({ message: 'API endpoint not found' }));
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  // Missing JavaScript/CSS must return 404, not index.html with a 200 status.
  if (req.path.startsWith('/assets/') || path.extname(req.path)) return next();
  res.set('Cache-Control', 'no-cache');
  res.sendFile(clientIndex);
});
app.use((_req, res) => res.status(404).json({ message: 'Resource not found' }));

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  if (err instanceof z.ZodError) return res.status(400).json({ message: err.issues[0]?.message || 'Invalid request', issues: err.issues });
  if (err instanceof Prisma.PrismaClientInitializationError) return res.status(503).json({ message: 'The database is temporarily unavailable. Please try again.' });
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return res.status(409).json({ message: 'A record with these details already exists' });
  res.status(500).json({ message: err instanceof Error ? err.message : 'Something went wrong' });
});

const server = app.listen(port, '0.0.0.0', () => console.log(`FruitStock running on port ${port}`));

function shutdown() {
  const timeout = setTimeout(() => process.exit(1), 10000);
  timeout.unref();
  server.close(async () => {
    await prisma.$disconnect();
    clearTimeout(timeout);
    process.exit(0);
  });
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
