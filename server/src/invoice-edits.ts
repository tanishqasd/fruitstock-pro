import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from './lib.js';
import { PaymentError } from './payments.js';
import { customerAccount, dealerAccount } from './accounting.js';

const decimal = (value: Prisma.Decimal.Value) => new Prisma.Decimal(value);
const money = z.coerce.number().finite().nonnegative().max(9999999999.99)
  .refine(value => decimal(value).decimalPlaces() <= 2, 'Use at most two decimal places for rates');
export const invoiceEditInput = z.object({
  partyId: z.string().min(1).nullable(), date: z.coerce.date(), invoiceNo: z.string().trim().max(200).default(''),
  expectedUpdatedAt: z.string().datetime(), reason: z.string().trim().min(3).max(500),
  items: z.array(z.object({ productId: z.string().min(1), rate: money,
    quantity: z.coerce.number().finite().positive().max(999999999.999)
      .refine(value => decimal(value).decimalPlaces() <= 3, 'Use at most three decimal places for quantities') })).min(1).max(100)
});
export function invoiceLines(input: z.infer<typeof invoiceEditInput>['items']) {
  const items = input.map(item => ({ ...item, amount: decimal(item.quantity).times(item.rate).toDecimalPlaces(2) }));
  const total = items.reduce((sum, item) => sum.plus(item.amount), decimal(0));
  if (total.lessThanOrEqualTo(0) || total.greaterThan(9999999999.99)) throw new PaymentError(400, 'Invoice total must be positive and within the supported amount');
  return { items, total };
}

export function replayStock(movements: { quantity: Prisma.Decimal.Value; unitCost?: Prisma.Decimal.Value | null; type: string }[], baseline: Prisma.Decimal.Value, startingAverage: Prisma.Decimal.Value, name = 'this fruit') {
  let quantity = decimal(baseline);
  if (quantity.isNegative()) throw new PaymentError(409, `Stock ledger for ${name} needs reconciliation before editing this bill`);
  let average = decimal(startingAverage);
  let purchaseRate: Prisma.Decimal | undefined;
  const costs: Prisma.Decimal[] = [];
  for (const movement of movements) {
    costs.push(average);
    const delta = decimal(movement.quantity);
    const next = quantity.plus(delta);
    if (next.isNegative()) throw new PaymentError(409, `This correction would make historical stock negative for ${name}. Correct later sales or stock entries first.`);
    if (delta.greaterThan(0)) {
      const cost = movement.unitCost == null ? average : decimal(movement.unitCost);
      average = next.isZero() ? decimal(0) : quantity.times(average).plus(delta.times(cost)).div(next).toDecimalPlaces(2);
      if (movement.type === 'PURCHASE') purchaseRate = cost;
    }
    quantity = next;
  }
  if (quantity.greaterThan(999999999.999)) throw new PaymentError(400, 'Resulting stock quantity is too large');
  return { quantity, average, purchaseRate, costs };
}

// Replay physical stock movements in their original entry order. Bill dates are
// document dates; changing one does not change when fruit physically moved.
async function rebuildProduct(tx: Prisma.TransactionClient, productId: string, touchedSales: Set<string>) {
  const product = await tx.product.findUniqueOrThrow({ where: { id: productId } });
  const movements = await tx.stockTransaction.findMany({ where: { productId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
  const recorded = movements.reduce((sum, row) => sum.plus(row.quantity), decimal(0));
  const baseline = product.currentStock.minus(recorded);
  // Missing opening stock has no reliable historic purchase cost. Do not invent
  // a valuation from today's average when replaying a corrected invoice.
  if (baseline.greaterThan(0)) throw new PaymentError(409, `Opening stock ledger for ${product.name} is incomplete. Reconcile it before editing this bill.`);
  const projection = replayStock(movements, baseline, product.avgCost, product.name);
  for (let index = 0; index < movements.length; index++) {
    const movement = movements[index];
    if (movement.type === 'SALE' && movement.reference) {
      const average = projection.costs[index];
      await tx.stockTransaction.update({ where: { id: movement.id }, data: { unitCost: average } });
      const sale = await tx.sale.findUnique({ where: { saleNo: movement.reference }, select: { id: true } });
      if (sale) {
        await tx.saleItem.updateMany({ where: { saleId: sale.id, productId }, data: { costRate: average } });
        touchedSales.add(sale.id);
      }
    }
  }
  await tx.product.update({ where: { id: productId }, data: { currentStock: projection.quantity, avgCost: projection.average, purchaseRate: projection.purchaseRate || product.purchaseRate } });
}

async function reconcileAccount(tx: Prisma.TransactionClient, kind: 'sale' | 'purchase', id: string | null) {
  if (!id) return;
  if (kind === 'sale') {
    const party = await tx.customer.findUniqueOrThrow({ where: { id }, include: { sales: true, payments: true, adjustments: true } });
    for (const invoice of customerAccount(party).sales) await tx.sale.update({ where: { id: invoice.id }, data: { receivedAmount: invoice.receivedAmount, pendingAmount: invoice.pendingAmount } });
  } else {
    const party = await tx.dealer.findUniqueOrThrow({ where: { id }, include: { purchases: true, payments: true, adjustments: true } });
    for (const invoice of dealerAccount(party).purchases) await tx.purchase.update({ where: { id: invoice.id }, data: { paidAmount: invoice.paidAmount, pendingAmount: invoice.pendingAmount } });
  }
}

export async function editInvoice(kind: 'sale' | 'purchase', id: string, input: z.infer<typeof invoiceEditInput>, actorId: string, database = prisma) {
  const { items, total } = invoiceLines(input.items);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await database.$transaction(async tx => {
        const bill = kind === 'sale'
          ? await tx.sale.findUnique({ where: { id }, include: { items: true } })
          : await tx.purchase.findUnique({ where: { id }, include: { items: true } });
        if (!bill) throw new PaymentError(404, 'Invoice not found');
        if (bill.updatedAt.toISOString() !== input.expectedUpdatedAt) throw new PaymentError(409, 'This invoice has changed. Reopen the editor before saving.');
        const oldParty = 'customerId' in bill ? bill.customerId : bill.dealerId;
        const reference = 'saleNo' in bill ? bill.saleNo : bill.purchaseNo;
        const direction = kind === 'sale' ? 'RECEIVED' : 'PAID';
        if (kind === 'purchase' && !input.partyId) throw new PaymentError(400, 'Choose a dealer');
        if (input.partyId) {
          const party = kind === 'sale' ? await tx.customer.findUnique({ where: { id: input.partyId } }) : await tx.dealer.findUnique({ where: { id: input.partyId } });
          if (!party) throw new PaymentError(404, 'Selected account not found');
        }
        const linkedPayments = await tx.payment.findMany({ where: { reference, direction,
          ...(kind === 'sale' ? { customerId: oldParty } : { dealerId: oldParty }) } });
        const paid = linkedPayments.reduce((sum, row) => sum.plus(row.amount), decimal(0));
        if (kind === 'sale' && !input.partyId && !paid.equals(total)) throw new PaymentError(400, 'A walk-in sale must exactly match its recorded payments. Choose a customer for a due or credit balance.');
        const productIds = [...new Set([...bill.items.map(row => row.productId), ...items.map(row => row.productId)])];
        const products = await tx.product.findMany({ where: { id: { in: productIds } } });
        if (products.length !== productIds.length) throw new PaymentError(404, 'One or more fruits were not found');
        const originalMovements = await tx.stockTransaction.findMany({ where: { reference, type: kind === 'sale' ? 'SALE' : 'PURCHASE' }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
        // Old invoices must have a complete stock trail before stock is replayed.
        for (const productId of productIds) {
          const oldQty = bill.items.filter(row => row.productId === productId).reduce((sum, row) => sum.plus(row.quantity), decimal(0));
          const matching = originalMovements.filter(row => row.productId === productId);
          const ledgerQty = matching.reduce((sum, row) => sum.plus(row.quantity), decimal(0)).abs();
          if (!ledgerQty.equals(oldQty)) throw new PaymentError(409, 'The original invoice stock trail is incomplete. Reconcile its stock ledger before editing.');
          const newItems = items.filter(row => row.productId === productId);
          const newQty = newItems.reduce((sum, row) => sum.plus(row.quantity), decimal(0));
          const signed = newQty.times(kind === 'sale' ? -1 : 1);
          const oldSigned = oldQty.times(kind === 'sale' ? -1 : 1);
          const product = products.find(row => row.id === productId)!;
          const finalStock = product.currentStock.plus(signed.minus(oldSigned));
          if (finalStock.isNegative()) throw new PaymentError(409, `Insufficient stock for ${product.name}. This correction would leave ${finalStock} ${product.unit}.`);
          if (finalStock.greaterThan(999999999.999)) throw new PaymentError(400, 'Resulting stock quantity is too large');
          const unitCost = kind === 'purchase' && !newQty.isZero()
            ? newItems.reduce((sum, row) => sum.plus(row.amount), decimal(0)).div(newQty).toDecimalPlaces(2) : product.avgCost;
          const reason = `Invoice correction by ${actorId}: ${input.reason}; quantity ${oldQty} → ${newQty}; total ${bill.totalAmount} → ${total}`;
          if (matching.length) {
            for (let index = 0; index < matching.length; index++) await tx.stockTransaction.update({ where: { id: matching[index].id }, data: {
              quantity: index === 0 ? signed : 0, unitCost, date: input.date, reason: [matching[index].reason, reason].filter(Boolean).join('\n')
            } });
          } else if (!newQty.isZero()) await tx.stockTransaction.create({ data: {
            productId, type: kind === 'sale' ? 'SALE' : 'PURCHASE', quantity: signed, unitCost, reference, date: input.date,
            createdAt: originalMovements[0]?.createdAt || bill.createdAt, reason
          } });
          // Keep the legacy baseline stable when changing ledger quantities.
          await tx.product.update({ where: { id: productId }, data: { currentStock: finalStock } });
        }
        const notes = [bill.notes, `[Correction ${new Date().toISOString()} by ${actorId}] ${input.reason}; party ${oldParty || 'walk-in'} → ${input.partyId || 'walk-in'}; date ${bill.date.toISOString().slice(0, 10)} → ${input.date.toISOString().slice(0, 10)}; total ${bill.totalAmount} → ${total}`].filter(Boolean).join('\n');
        if (kind === 'sale') {
          await tx.saleItem.deleteMany({ where: { saleId: id } });
          await tx.sale.update({ where: { id }, data: { customerId: input.partyId, date: input.date, invoiceNo: input.invoiceNo || null, totalAmount: total, notes,
            items: { create: items.map(row => ({ ...row, costRate: products.find(product => product.id === row.productId)!.avgCost })) } } });
        } else {
          await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
          await tx.purchase.update({ where: { id }, data: { dealerId: input.partyId!, date: input.date, invoiceNo: input.invoiceNo || null, totalAmount: total, notes, items: { create: items } } });
        }
        if (oldParty !== input.partyId) for (const payment of linkedPayments) {
          const updated = await tx.payment.update({ where: { id: payment.id }, data: {
            ...(kind === 'sale' ? { customerId: input.partyId } : { dealerId: input.partyId }), version: { increment: 1 }
          } });
          const snapshot = (row: typeof payment) => ({ amount: row.amount.toString(), date: row.date.toISOString(), customerId: row.customerId, dealerId: row.dealerId, version: row.version });
          await tx.paymentEdit.create({ data: { paymentId: payment.id, createdById: actorId, reason: `Invoice ${reference} account correction: ${input.reason}`, before: snapshot(payment), after: snapshot(updated) } });
        }
        const touchedSales = new Set<string>(kind === 'sale' ? [id] : []);
        for (const productId of productIds) await rebuildProduct(tx, productId, touchedSales);
        for (const saleId of touchedSales) {
          const saleItems = await tx.saleItem.findMany({ where: { saleId } });
          const costAmount = saleItems.reduce((sum, row) => sum.plus(row.quantity.times(row.costRate)), decimal(0)).toDecimalPlaces(2);
          await tx.sale.update({ where: { id: saleId }, data: { costAmount } });
        }
        await reconcileAccount(tx, kind, oldParty);
        if (input.partyId !== oldParty) await reconcileAccount(tx, kind, input.partyId);
        if (kind === 'sale' && !input.partyId) await tx.sale.update({ where: { id }, data: { receivedAmount: paid, pendingAmount: 0 } });
        return kind === 'sale' ? tx.sale.findUniqueOrThrow({ where: { id }, include: { items: true, customer: true } }) : tx.purchase.findUniqueOrThrow({ where: { id }, include: { items: true, dealer: true } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 2) continue;
      throw error;
    }
  }
  throw new PaymentError(409, 'The invoice changed while saving. Reopen the editor and retry.');
}
