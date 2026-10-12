import assert from 'node:assert/strict';
import test from 'node:test';
import { invoiceEditInput, invoiceLines, replayStock } from '../server/dist/invoice-edits.js';

test('invoice corrections validate quantities, dates, stale-edit token and exact line amounts', () => {
  const input = {partyId:'customer',date:'2026-10-01',expectedUpdatedAt:'2026-10-01T00:00:00.000Z',reason:'Wrong crate quantity',items:[{productId:'fruit',quantity:1.125,rate:10.25}]};
  assert.ok(invoiceEditInput.safeParse(input).success);
  for(const patch of [{items:[]},{reason:''},{expectedUpdatedAt:''},{items:[{productId:'fruit',quantity:0,rate:10}]},{items:[{productId:'fruit',quantity:1.0001,rate:10}]},{items:[{productId:'fruit',quantity:1,rate:10.001}]}]) assert.equal(invoiceEditInput.safeParse({...input,...patch}).success,false);
  const bill=invoiceLines([{productId:'a',quantity:1.125,rate:10.25},{productId:'a',quantity:2,rate:3.10}]);
  assert.equal(bill.items[0].amount.toString(),'11.53'); assert.equal(bill.total.toString(),'17.73');
});

test('purchase quantity/rate edits recalculate stock and later sale cost, without replaying a sale twice', () => {
  const result=replayStock([{type:'OPENING',quantity:20,unitCost:5},{type:'PURCHASE',quantity:8,unitCost:15},{type:'SALE',quantity:-16,unitCost:6.67}],0,5);
  assert.equal(result.quantity.toNumber(),12);assert.equal(result.average.toNumber(),7.86);assert.equal(result.costs[2].times(16).toDecimalPlaces(2).toNumber(),125.76);
});

test('sale quantity edits return stock and preserve legacy opening stock', () => {
  const result=replayStock([{type:'PURCHASE',quantity:10,unitCost:10},{type:'SALE',quantity:-16}],20,5);
  assert.equal(result.quantity.toNumber(),14);assert.equal(result.average.toNumber(),6.67);
});

test('rejects an impossible historic purchase reduction even if later purchases leave positive final stock', () => {
  assert.throws(()=>replayStock([{type:'PURCHASE',quantity:5,unitCost:10},{type:'SALE',quantity:-10},{type:'PURCHASE',quantity:10,unitCost:12}],0,0),/historical stock negative/);
});
