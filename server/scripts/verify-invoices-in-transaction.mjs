import assert from 'node:assert/strict';
import { editInvoice } from '../dist/invoice-edits.js';
import { customerAccount } from '../dist/accounting.js';

export async function verifyInvoiceEdits(tx, database, actorId, marker) {
  const first = await tx.customer.create({data:{name:`${marker}-invoice-customer`}});
  const second = await tx.customer.create({data:{name:`${marker}-invoice-customer`}});
  const dealer = await tx.dealer.create({data:{name:`${marker}-invoice-dealer`}});
  const product = await tx.product.create({data:{name:`${marker}-fruit`,currentStock:12,avgCost:6.67,purchaseRate:10}});
  const purchase = await tx.purchase.create({data:{purchaseNo:`${marker}-edit-purchase`,dealerId:dealer.id,totalAmount:100,paidAmount:0,pendingAmount:100,
    items:{create:[{productId:product.id,quantity:10,rate:10,amount:100}]}}});
  const sale = await tx.sale.create({data:{saleNo:`${marker}-edit-sale`,customerId:first.id,totalAmount:360,receivedAmount:50,pendingAmount:310,costAmount:120.06,
    items:{create:[{productId:product.id,quantity:18,rate:20,amount:360,costRate:6.67}]}}});
  const times=['2026-01-01','2026-01-02','2026-01-03'].map(value=>new Date(value+'T00:00:00Z'));
  await tx.stockTransaction.createMany({data:[
    {productId:product.id,type:'OPENING',quantity:20,unitCost:5,date:times[0],createdAt:times[0]},
    {productId:product.id,type:'PURCHASE',quantity:10,unitCost:10,reference:purchase.purchaseNo,date:times[1],createdAt:times[1]},
    {productId:product.id,type:'SALE',quantity:-18,unitCost:6.67,reference:sale.saleNo,date:times[2],createdAt:times[2]}
  ]});
  const linked = await tx.payment.create({data:{direction:'RECEIVED',customerId:first.id,amount:50,reference:sale.saleNo}});
  const later = await tx.payment.create({data:{direction:'RECEIVED',customerId:first.id,amount:30,reference:'Later account payment'}});
  const input={partyId:second.id,date:new Date('2026-01-04T00:00:00Z'),invoiceNo:'CORRECTED-001',expectedUpdatedAt:sale.updatedAt.toISOString(),reason:'Correct quantity and customer',items:[{productId:product.id,quantity:16,rate:20}]};
  const edited = await editInvoice('sale',sale.id,input,actorId,database);
  assert.equal(edited.id,sale.id);assert.equal(edited.saleNo,sale.saleNo);assert.equal(edited.totalAmount.toNumber(),320);
  assert.equal(edited.receivedAmount.toNumber(),50);assert.equal(edited.pendingAmount.toNumber(),270);
  assert.equal((await tx.product.findUniqueOrThrow({where:{id:product.id}})).currentStock.toNumber(),14);
  assert.equal((await tx.payment.findUniqueOrThrow({where:{id:linked.id}})).customerId,second.id);
  assert.equal((await tx.payment.findUniqueOrThrow({where:{id:later.id}})).customerId,first.id);
  assert.equal(await tx.payment.count({where:{id:{in:[linked.id,later.id]}}}),2);
  const oldAccount=customerAccount(await tx.customer.findUniqueOrThrow({where:{id:first.id},include:{sales:true,payments:true,adjustments:true}}));
  assert.equal(oldAccount.outstanding,-30);
  assert.equal(await tx.paymentEdit.count({where:{paymentId:linked.id}}),1);
  await assert.rejects(editInvoice('sale',sale.id,input,actorId,database),error=>error.status===409);
  const bought = await editInvoice('purchase',purchase.id,{...input,partyId:dealer.id,expectedUpdatedAt:purchase.updatedAt.toISOString(),reason:'Correct quantity and purchase rate',items:[{productId:product.id,quantity:8,rate:15}]},actorId,database);
  assert.equal(bought.totalAmount.toNumber(),120);assert.equal(bought.pendingAmount.toNumber(),120);
  const finalProduct=await tx.product.findUniqueOrThrow({where:{id:product.id}});
  assert.equal(finalProduct.currentStock.toNumber(),12);assert.equal(finalProduct.avgCost.toNumber(),7.86);
  assert.equal((await tx.sale.findUniqueOrThrow({where:{id:sale.id}})).costAmount.toNumber(),125.76);
  const fresh=await tx.sale.findUniqueOrThrow({where:{id:sale.id}});
  await assert.rejects(editInvoice('sale',sale.id,{...input,expectedUpdatedAt:fresh.updatedAt.toISOString(),items:[{productId:product.id,quantity:100,rate:20}]},actorId,database),error=>error.status===409);
  assert.equal((await tx.product.findUniqueOrThrow({where:{id:product.id}})).currentStock.toNumber(),12);
  assert.equal((await tx.sale.findUniqueOrThrow({where:{id:sale.id}})).totalAmount.toNumber(),320);
  assert.equal(await tx.sale.count({where:{saleNo:sale.saleNo}}),1);assert.equal(await tx.purchase.count({where:{purchaseNo:purchase.purchaseNo}}),1);
}
