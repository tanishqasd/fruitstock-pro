import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../dist/lib.js';
import { recordPayment, PaymentError } from '../dist/payments.js';
import { customerAccount, dealerAccount } from '../dist/accounting.js';

// All fixtures live inside one transaction that is ALWAYS rolled back. This
// checks real PostgreSQL writes without adding rows to the business database.
const marker = `payment-check-${randomUUID()}`;
const rollback = new Error('ROLLBACK_PAYMENT_VERIFICATION');
let verified = false;
const fixtures = [];
try {
  await prisma.$transaction(async tx => {
    const c = await tx.customer.create({ data: { name: marker, openingBalance: 100 } });
    const sameName = await tx.customer.create({ data: { name: marker, openingBalance: 75 } });
    const d = await tx.dealer.create({ data: { name: marker, openingBalance: 50 } });
    fixtures.push(c.id, sameName.id, d.id);
    const sale = await tx.sale.create({ data: { saleNo: `${marker}-sale`, customerId: c.id, totalAmount: 1000,
      receivedAmount: 200, pendingAmount: 800, costAmount: 0 } });
    const purchase = await tx.purchase.create({ data: { purchaseNo: `${marker}-purchase`, dealerId: d.id,
      totalAmount: 500, paidAmount: 100, pendingAmount: 400 } });
    await tx.payment.createMany({ data: [
      { customerId: c.id, direction: 'RECEIVED', amount: 200, mode: 'CASH', reference: sale.saleNo },
      { dealerId: d.id, direction: 'PAID', amount: 100, mode: 'CASH', reference: purchase.purchaseNo }
    ] });
    // Invoke the exact payment service inside the outer real database
    // transaction. It must not commit its fixtures independently.
    const database = { $transaction: callback => callback(tx) };
    const partial = await recordPayment({ direction: 'RECEIVED', customerId: c.id, amount: 300,
      mode: 'UPI', reference: `${marker}-UTR`, date: new Date('2026-01-03T00:00:00Z') }, true, database);
    assert.equal(partial.accountBalance, 600);
    const persistedSale = await tx.sale.findUniqueOrThrow({ where: { id: sale.id } });
    assert.equal(persistedSale.receivedAmount.toNumber(), 400);
    assert.equal(persistedSale.pendingAmount.toNumber(), 600);
    const countBefore = await tx.payment.count({ where: { customerId: c.id } });
    await assert.rejects(recordPayment({ direction: 'RECEIVED', customerId: c.id, amount: 600.01, mode: 'CASH' }, true, database),
      error => error instanceof PaymentError && error.status === 409);
    assert.equal(await tx.payment.count({ where: { customerId: c.id } }), countBefore);
    await assert.rejects(recordPayment({ direction: 'PAID', dealerId: `${marker}-missing`, amount: 10, mode: 'CASH' }, true, database),
      error => error instanceof PaymentError && error.status === 404);
    assert.equal((await recordPayment({ direction: 'RECEIVED', customerId: c.id, amount: 600, mode: 'CASH' }, true, database)).accountBalance, 0);
    assert.equal((await tx.sale.findUniqueOrThrow({ where: { id: sale.id } })).pendingAmount.toNumber(), 0);
    assert.equal((await recordPayment({ direction: 'PAID', dealerId: d.id, amount: 100, mode: 'UPI' }, true, database)).accountBalance, 350);
    assert.equal((await recordPayment({ direction: 'PAID', dealerId: d.id, amount: 350, mode: 'CASH' }, true, database)).accountBalance, 0);
    assert.equal((await tx.purchase.findUniqueOrThrow({ where: { id: purchase.id } })).pendingAmount.toNumber(), 0);
    const customer = customerAccount(await tx.customer.findUniqueOrThrow({ where: { id: c.id }, include: { sales: true, payments: true } }));
    assert.equal(customer.outstanding, 0);
    assert.equal(customer.totalReceived, 1100);
    assert.equal(customer.sales[0].pendingAmount, 0);
    assert.equal(customer.payments.find(row => row.reference === `${marker}-UTR`).date.toISOString(), '2026-01-03T00:00:00.000Z');
    const untouched = customerAccount(await tx.customer.findUniqueOrThrow({ where: { id: sameName.id }, include: { sales: true, payments: true } }));
    assert.equal(untouched.outstanding, 75);
    assert.equal(untouched.payments.length, 0);
    const dealer = dealerAccount(await tx.dealer.findUniqueOrThrow({ where: { id: d.id }, include: { purchases: true, payments: true } }));
    assert.equal(dealer.payable, 0);
    assert.equal(dealer.totalPaid, 550);
    // General ledger receipts continue to support advances as account credit.
    assert.equal((await recordPayment({ direction: 'RECEIVED', customerId: c.id, amount: 20, mode: 'CASH' }, false, database)).accountBalance, -20);
    verified = true;
    throw rollback;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 });
} catch (error) {
  if (error !== rollback) throw error;
} finally {
  if (verified) {
    assert.equal(await prisma.customer.count({ where: { id: { in: fixtures } } }), 0);
    assert.equal(await prisma.dealer.count({ where: { id: { in: fixtures } } }), 0);
    console.log('PASS: customer/dealer partial and full payments, invoice reconciliation, same-name isolation, overpayment rejection and credit; all test rows rolled back.');
  }
  await prisma.$disconnect();
}
assert.ok(verified, 'Database payment verification did not complete');
