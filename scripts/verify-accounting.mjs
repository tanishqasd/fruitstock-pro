import assert from 'node:assert/strict';
import test from 'node:test';
import { accountProjection, customerAccount, dealerAccount } from '../server/dist/accounting.js';
import { paymentFields, paymentInput, paymentEditInput, balanceInput } from '../server/dist/payments.js';

const invoice = (id, totalAmount, date = '2026-01-01') => ({ id, totalAmount, date, saleNo: id });
const receipt = (amount, reference, direction = 'RECEIVED') => ({ amount, reference, direction });

test('partial and full settlements allocate opening dues first without double-counting invoice receipts', () => {
  const invoices = [invoice('new', 500, '2026-01-02'), invoice('old', 1000)];
  const payments = [receipt(200, 'old'), receipt(450, 'UPI')];
  const partial = accountProjection(100, invoices, payments, 'RECEIVED');
  assert.equal(partial.balance, 950);
  assert.equal(partial.openingDue, 0);
  assert.equal(partial.invoices.find(row => row.id === 'old').settledAmount, 550);
  assert.equal(partial.invoices.find(row => row.id === 'old').pendingAmount, 450);
  const complete = accountProjection(100, invoices, [...payments, receipt(950)], 'RECEIVED');
  assert.equal(complete.balance, 0);
  assert.ok(complete.invoices.every(row => row.pendingAmount === 0));
});

test('money uses decimal arithmetic; credit does not turn invoice dues negative', () => {
  assert.equal(accountProjection('0.10', [invoice('cent', '0.20')], [receipt('0.30')], 'RECEIVED').balance, 0);
  const credit = accountProjection(-10, [invoice('small', 5)], [], 'RECEIVED');
  assert.equal(credit.balance, -5);
  assert.equal(credit.invoices[0].pendingAmount, 0);
});

test('customer/dealer mappings use the correct direction, preserve IDs and share list/profile balance fields', () => {
  const c = customerAccount({ id: 'customer-a', name: 'Same name', openingBalance: 0,
    sales: [invoice('bill', 100)], payments: [receipt(30), receipt(999, undefined, 'PAID')] });
  assert.equal(c.id, 'customer-a');
  assert.equal(c.outstanding, 70);
  assert.equal(c.outstandingBalance, c.outstanding);
  assert.equal(c.sales[0].receivedAmount, 30);
  assert.equal(c.payments.length, 1);
  const d = dealerAccount({ id: 'dealer-b', name: 'Same name', openingBalance: 20,
    purchases: [invoice('purchase', 100)], payments: [receipt(50, undefined, 'PAID'), receipt(900)] });
  assert.equal(d.id, 'dealer-b');
  assert.equal(d.payable, 70);
  assert.equal(d.balanceDue, d.payable);
  assert.equal(d.purchases[0].paidAmount, 30);
});

test('a bill-specific receipt is matched within its own account rather than allocated by row position', () => {
  const account = accountProjection(0, [invoice('old', 500), invoice('new', 600, '2026-01-02')], [receipt(400, 'new')], 'RECEIVED');
  assert.equal(account.invoices[0].settledAmount, 0);
  assert.equal(account.invoices[1].settledAmount, 400);
});

test('payment inputs reject wrong-party associations and invalid money, including fractional paise', () => {
  for (const amount of [0, -1, Infinity, NaN, 0.001, 10000000000]) {
    assert.equal(paymentFields.safeParse({ amount }).success, false);
  }
  assert.equal(paymentFields.safeParse({ amount: '500.25', mode: 'UPI' }).success, true);
  for (const input of [
    { direction: 'RECEIVED', dealerId: 'dealer' },
    { direction: 'PAID', customerId: 'customer' },
    { direction: 'RECEIVED', customerId: 'customer', dealerId: 'dealer' },
    { direction: 'RECEIVED' }
  ]) assert.equal(paymentInput.safeParse({ ...input, amount: 10 }).success, false);
});

test('dated balance adjustments change account dues without creating cash receipts', () => {
  const adjusted = accountProjection(100, [invoice('bill', 1000)], [receipt(200, 'bill')], 'RECEIVED', [{ amount: 50.25 }, { amount: -10 }]);
  assert.equal(adjusted.balance, 940.25); assert.equal(adjusted.totalPaid, 200); assert.equal(adjusted.adjustmentTotal, 40.25);
  const credit = accountProjection(0, [invoice('bill', 100)], [receipt(10)], 'RECEIVED', [{ amount: -120 }]);
  assert.equal(credit.balance, -30); assert.equal(credit.invoices[0].pendingAmount, 0);
  const input = { operation: 'SET_BALANCE', amount: -50.25, expectedBalance: 200, date: '2025-01-01', reason: 'Historic credit correction' };
  assert.equal(balanceInput.safeParse(input).success, true);
  assert.equal(balanceInput.safeParse({ ...input, operation: 'ADD_DUE' }).success, false);
  assert.equal(paymentEditInput.safeParse({ amount: 0, expectedVersion: 0, reason: 'Reverse wrong receipt' }).success, true);
  assert.equal(paymentEditInput.safeParse({ amount: 20, reason: 'Missing version' }).success, false);
});
