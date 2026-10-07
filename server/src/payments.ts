import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { accountProjection, type AccountInvoice } from './accounting.js';
import { prisma, serial } from './lib.js';

export class PaymentError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const paymentFields = z.object({
  amount: z.coerce.number().finite().positive().max(9999999999.99)
    .refine(value => new Prisma.Decimal(value).decimalPlaces() <= 2, 'Use at most two decimal places'),
  mode: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER']).default('CASH'),
  date: z.coerce.date().optional(), reference: z.string().trim().max(200).optional(), notes: z.string().trim().max(1000).optional()
});
export const paymentInput = paymentFields.extend({
  direction: z.enum(['RECEIVED', 'PAID']), customerId: z.string().min(1).optional(), dealerId: z.string().min(1).optional()
}).refine(input => input.direction === 'RECEIVED' ? !!input.customerId && !input.dealerId : !!input.dealerId && !input.customerId,
  'Choose the correct customer or dealer');

export async function recordPayment(input: z.infer<typeof paymentInput>, settlementOnly = false, database = prisma) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await database.$transaction(async tx => {
        const customer = input.direction === 'RECEIVED';
        const party = customer
          ? await tx.customer.findUnique({ where: { id: input.customerId }, include: { sales: true, payments: true, adjustments: true } })
          : await tx.dealer.findUnique({ where: { id: input.dealerId }, include: { purchases: true, payments: true, adjustments: true } });
        if (!party) throw new PaymentError(404, `${customer ? 'Customer' : 'Dealer'} not found`);
        const invoices: AccountInvoice[] = 'sales' in party ? party.sales : party.purchases;
        const before = accountProjection(party.openingBalance, invoices, party.payments, input.direction, party.adjustments);
        if (settlementOnly && new Prisma.Decimal(input.amount).greaterThan(before.balance)) {
          throw new PaymentError(409, `Payment exceeds the current amount due (${Math.max(0, before.balance).toFixed(2)}). Refresh the account and try again.`);
        }
        const payment = await tx.payment.create({ data: {
          ...input, reference: input.reference || serial(customer ? 'RCPT' : 'PAY'),
          amount: new Prisma.Decimal(input.amount)
        } });
        const after = accountProjection(party.openingBalance, invoices, [...party.payments, payment], input.direction, party.adjustments);
        for (const invoice of after.invoices) {
          if (customer) await tx.sale.update({ where: { id: invoice.id }, data: { receivedAmount: invoice.settledAmount, pendingAmount: invoice.pendingAmount } });
          else await tx.purchase.update({ where: { id: invoice.id }, data: { paidAmount: invoice.settledAmount, pendingAmount: invoice.pendingAmount } });
        }
        return { ...payment, accountBalance: after.balance };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 2) continue;
      throw error;
    }
  }
  throw new PaymentError(409, 'The account changed while saving. Refresh and retry.');
}

const signedMoney = z.coerce.number().finite().min(-9999999999.99).max(9999999999.99)
  .refine(value => new Prisma.Decimal(value).decimalPlaces() <= 2, 'Use at most two decimal places');
export const paymentEditInput = paymentFields.extend({
  amount: signedMoney.refine(value => value >= 0, 'Payment cannot be negative'),
  expectedVersion: z.number().int().nonnegative(), reason: z.string().trim().min(3).max(500)
});
export const balanceInput = z.object({
  operation: z.enum(['ADD_DUE', 'REDUCE_DUE', 'SET_BALANCE']), amount: signedMoney,
  expectedBalance: signedMoney, date: z.coerce.date(), reason: z.string().trim().min(3).max(500)
}).refine(input => input.operation === 'SET_BALANCE' || input.amount > 0, 'Adjustment amount must be positive');

async function changeAccount<T>(kind: 'customer' | 'dealer', id: string,
  change: (tx: Prisma.TransactionClient, party: NonNullable<Awaited<ReturnType<typeof getAccount>>>) => Promise<T>, database = prisma) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await database.$transaction(async tx => {
        const party = await getAccount(tx, kind, id);
        if (!party) throw new PaymentError(404, 'Account not found');
        return change(tx, party);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 2) continue;
      throw error;
    }
  }
  throw new PaymentError(409, 'The account changed. Refresh and retry.');
}
function getAccount(tx: Prisma.TransactionClient, kind: 'customer' | 'dealer', id: string) {
  return kind === 'customer'
    ? tx.customer.findUnique({ where: { id }, include: { sales: true, payments: true, adjustments: true } })
    : tx.dealer.findUnique({ where: { id }, include: { purchases: true, payments: true, adjustments: true } });
}
async function syncInvoices(tx: Prisma.TransactionClient, kind: 'customer' | 'dealer', projection: ReturnType<typeof accountProjection>) {
  for (const invoice of projection.invoices) {
    if (kind === 'customer') await tx.sale.update({ where: { id: invoice.id }, data: { receivedAmount: invoice.settledAmount, pendingAmount: invoice.pendingAmount } });
    else await tx.purchase.update({ where: { id: invoice.id }, data: { paidAmount: invoice.settledAmount, pendingAmount: invoice.pendingAmount } });
  }
}
const snapshot = (payment: { amount: Prisma.Decimal; mode: string; date: Date; reference: string | null; notes: string | null; version: number }) => ({
  amount: payment.amount.toString(), mode: payment.mode, date: payment.date.toISOString(), reference: payment.reference, notes: payment.notes, version: payment.version
});

export async function editPayment(kind: 'customer' | 'dealer', id: string, paymentId: string,
  input: z.infer<typeof paymentEditInput>, actorId: string, database = prisma) {
  return changeAccount(kind, id, async (tx, party) => {
    const direction = kind === 'customer' ? 'RECEIVED' : 'PAID';
    const existing = party.payments.find(row => row.id === paymentId && row.direction === direction);
    if (!existing) throw new PaymentError(404, 'Payment not found for this account');
    if (existing.version !== input.expectedVersion) throw new PaymentError(409, 'This payment was already edited. Refresh the account before editing again.');
    const { expectedVersion, reason, ...fields } = input;
    const payment = await tx.payment.update({ where: { id: paymentId }, data: { ...fields, version: { increment: 1 } } });
    await tx.paymentEdit.create({ data: { paymentId, createdById: actorId, reason, before: snapshot(existing), after: snapshot(payment) } });
    const invoices: AccountInvoice[] = 'sales' in party ? party.sales : party.purchases;
    const after = accountProjection(party.openingBalance, invoices, party.payments.map(row => row.id === paymentId ? payment : row), direction, party.adjustments);
    await syncInvoices(tx, kind, after);
    return { ...payment, accountBalance: after.balance };
  }, database);
}

export async function adjustBalance(kind: 'customer' | 'dealer', id: string, input: z.infer<typeof balanceInput>, actorId: string, database = prisma) {
  return changeAccount(kind, id, async (tx, party) => {
    const direction = kind === 'customer' ? 'RECEIVED' : 'PAID';
    const invoices: AccountInvoice[] = 'sales' in party ? party.sales : party.purchases;
    const before = accountProjection(party.openingBalance, invoices, party.payments, direction, party.adjustments);
    if (input.operation === 'SET_BALANCE' && !new Prisma.Decimal(before.balance).equals(input.expectedBalance)) {
      throw new PaymentError(409, 'The account balance changed. Refresh it before setting the current balance.');
    }
    const amount = input.operation === 'SET_BALANCE' ? new Prisma.Decimal(input.amount).minus(before.balance)
      : new Prisma.Decimal(input.amount).times(input.operation === 'ADD_DUE' ? 1 : -1);
    if (amount.isZero()) throw new PaymentError(409, 'The requested balance is already current.');
    if (amount.abs().greaterThan(9999999999.99)) throw new PaymentError(400, 'Balance adjustment is too large');
    const adjustment = await tx.balanceAdjustment.create({ data: {
      [kind === 'customer' ? 'customerId' : 'dealerId']: id, amount, date: input.date, reason: input.reason, createdById: actorId
    } });
    const after = accountProjection(party.openingBalance, invoices, party.payments, direction, [...party.adjustments, adjustment]);
    await syncInvoices(tx, kind, after);
    return { ...adjustment, accountBalance: after.balance };
  }, database);
}
