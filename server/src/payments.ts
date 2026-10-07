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
          ? await tx.customer.findUnique({ where: { id: input.customerId }, include: { sales: true, payments: true } })
          : await tx.dealer.findUnique({ where: { id: input.dealerId }, include: { purchases: true, payments: true } });
        if (!party) throw new PaymentError(404, `${customer ? 'Customer' : 'Dealer'} not found`);
        const invoices: AccountInvoice[] = 'sales' in party ? party.sales : party.purchases;
        const before = accountProjection(party.openingBalance, invoices, party.payments, input.direction);
        if (settlementOnly && new Prisma.Decimal(input.amount).greaterThan(before.balance)) {
          throw new PaymentError(409, `Payment exceeds the current amount due (${Math.max(0, before.balance).toFixed(2)}). Refresh the account and try again.`);
        }
        const payment = await tx.payment.create({ data: {
          ...input, reference: input.reference || serial(customer ? 'RCPT' : 'PAY'),
          amount: new Prisma.Decimal(input.amount)
        } });
        const after = accountProjection(party.openingBalance, invoices, [...party.payments, payment], input.direction);
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
