import { Prisma } from '@prisma/client';

type Money = Prisma.Decimal.Value;
export type AccountInvoice = { id: string; date: Date | string; totalAmount: Money; saleNo?: string; purchaseNo?: string };
type Invoice = AccountInvoice;
type Payment = { amount: Money; direction: string; reference?: string | null };
const decimal = (value: Money) => new Prisma.Decimal(value);

// Payment records are the source of truth. Linked invoice receipts are allocated
// first, then unallocated receipts settle opening dues and the oldest invoices.
export function accountProjection<T extends Invoice>(opening: Money, invoices: T[], payments: Payment[], direction: 'RECEIVED' | 'PAID') {
  const openingBalance = decimal(opening);
  const received = payments.filter(payment => payment.direction === direction);
  const totalInvoiced = invoices.reduce((sum, invoice) => sum.plus(invoice.totalAmount), decimal(0));
  const totalPaid = received.reduce((sum, payment) => sum.plus(payment.amount), decimal(0));
  const allocated = new Map(invoices.map(invoice => [invoice.id, decimal(0)]));
  const byReference = new Map(invoices.map(invoice => [invoice.saleNo || invoice.purchaseNo, invoice]));
  let available = Prisma.Decimal.max(openingBalance.negated(), 0);
  for (const payment of received) {
    const invoice = payment.reference ? byReference.get(payment.reference) : undefined;
    if (!invoice) { available = available.plus(payment.amount); continue; }
    const remaining = decimal(invoice.totalAmount).minus(allocated.get(invoice.id)!);
    const amount = Prisma.Decimal.min(remaining, payment.amount);
    allocated.set(invoice.id, allocated.get(invoice.id)!.plus(amount));
    available = available.plus(decimal(payment.amount).minus(amount));
  }
  const openingSettled = Prisma.Decimal.min(available, Prisma.Decimal.max(openingBalance, 0));
  available = available.minus(openingSettled);
  const oldestFirst = [...invoices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id.localeCompare(b.id));
  for (const invoice of oldestFirst) {
    const remaining = decimal(invoice.totalAmount).minus(allocated.get(invoice.id)!);
    const amount = Prisma.Decimal.min(remaining, available);
    allocated.set(invoice.id, allocated.get(invoice.id)!.plus(amount));
    available = available.minus(amount);
  }
  return {
    totalInvoiced: totalInvoiced.toNumber(), totalPaid: totalPaid.toNumber(),
    balance: openingBalance.plus(totalInvoiced).minus(totalPaid).toNumber(),
    openingDue: Prisma.Decimal.max(openingBalance, 0).minus(openingSettled).toNumber(),
    invoices: invoices.map(invoice => ({ ...invoice,
      settledAmount: allocated.get(invoice.id)!.toNumber(),
      pendingAmount: decimal(invoice.totalAmount).minus(allocated.get(invoice.id)!).toNumber()
    }))
  };
}

export function customerAccount<T extends { openingBalance: Money; sales: Invoice[]; payments: Payment[] }>(customer: T) {
  const { sales, payments, ...record } = customer;
  const account = accountProjection(customer.openingBalance, sales, payments, 'RECEIVED');
  return { ...record, totalSales: account.totalInvoiced, totalReceived: account.totalPaid,
    outstanding: account.balance, outstandingBalance: account.balance, openingDue: account.openingDue,
    sales: account.invoices.map(invoice => ({ ...invoice, receivedAmount: invoice.settledAmount })),
    payments: payments.filter(payment => payment.direction === 'RECEIVED') };
}

export function dealerAccount<T extends { openingBalance: Money; purchases: Invoice[]; payments: Payment[] }>(dealer: T) {
  const { purchases, payments, ...record } = dealer;
  const account = accountProjection(dealer.openingBalance, purchases, payments, 'PAID');
  return { ...record, totalPurchases: account.totalInvoiced, totalPaid: account.totalPaid,
    payable: account.balance, balanceDue: account.balance, openingDue: account.openingDue,
    purchases: account.invoices.map(invoice => ({ ...invoice, paidAmount: invoice.settledAmount })),
    payments: payments.filter(payment => payment.direction === 'PAID') };
}
