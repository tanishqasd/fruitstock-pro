import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo seeding deletes existing data and is disabled in production. Use npm run db:owner to create an owner.');
  await prisma.$transaction([
    prisma.stockTransaction.deleteMany(), prisma.payment.deleteMany(), prisma.expense.deleteMany(),
    prisma.purchaseItem.deleteMany(), prisma.saleItem.deleteMany(), prisma.purchase.deleteMany(), prisma.sale.deleteMany(),
    prisma.product.deleteMany(), prisma.customer.deleteMany(), prisma.dealer.deleteMany(), prisma.user.deleteMany()
  ]);

  await prisma.user.create({ data: { name: 'Arjun Mehta', email: 'owner@fruitstock.in', passwordHash: await bcrypt.hash('demo123', 12), businessName: 'FreshMandi Wholesale' } });
  const [apple, mango, banana, orange, grapes, pomegranate] = await Promise.all([
    prisma.product.create({ data: { name: 'Apple', variety: 'Washington', unit: 'kg', purchaseRate: 82, sellingRate: 105, avgCost: 80, currentStock: 186, minStock: 60 } }),
    prisma.product.create({ data: { name: 'Mango', variety: 'Kesar', unit: 'kg', purchaseRate: 64, sellingRate: 84, avgCost: 62, currentStock: 234, minStock: 80 } }),
    prisma.product.create({ data: { name: 'Banana', variety: 'Robusta', unit: 'dozen', purchaseRate: 34, sellingRate: 48, avgCost: 33, currentStock: 42, minStock: 50 } }),
    prisma.product.create({ data: { name: 'Orange', variety: 'Nagpur', unit: 'kg', purchaseRate: 55, sellingRate: 72, avgCost: 54, currentStock: 118, minStock: 55 } }),
    prisma.product.create({ data: { name: 'Grapes', variety: 'Green Seedless', unit: 'kg', purchaseRate: 74, sellingRate: 96, avgCost: 72, currentStock: 31, minStock: 40 } }),
    prisma.product.create({ data: { name: 'Pomegranate', variety: 'Bhagwa', unit: 'kg', purchaseRate: 108, sellingRate: 138, avgCost: 106, currentStock: 82, minStock: 35 } })
  ]);
  const [ramesh, sunrise, maharashtra] = await Promise.all([
    prisma.dealer.create({ data: { name: 'Ramesh Fruit Supplier', phone: '+91 98201 42791', contactPerson: 'Ramesh Patel', address: 'Vashi APMC, Navi Mumbai', gstNumber: '27AABCR1188F1Z5' } }),
    prisma.dealer.create({ data: { name: 'Sunrise Produce Co.', phone: '+91 97684 11520', contactPerson: 'Nitin Shah', address: 'Market Yard, Pune' } }),
    prisma.dealer.create({ data: { name: 'Maharashtra Orchards', phone: '+91 98921 82410', contactPerson: 'Akash More', address: 'Nashik, Maharashtra' } })
  ]);
  const [sharma, gupta, greenBasket, metro] = await Promise.all([
    prisma.customer.create({ data: { name: 'Sharma Traders', phone: '+91 98765 12048', address: 'Andheri East, Mumbai', creditLimit: 100000, paymentTerms: 7 } }),
    prisma.customer.create({ data: { name: 'Gupta Fruits', phone: '+91 98193 22840', address: 'Dadar West, Mumbai', creditLimit: 75000, paymentTerms: 10 } }),
    prisma.customer.create({ data: { name: 'Green Basket', phone: '+91 99877 31904', address: 'Bandra, Mumbai', creditLimit: 50000, paymentTerms: 5 } }),
    prisma.customer.create({ data: { name: 'Metro Fresh Mart', phone: '+91 97021 66048', address: 'Powai, Mumbai', creditLimit: 125000, paymentTerms: 14 } })
  ]);
  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const twoDays = new Date(now); twoDays.setDate(now.getDate() - 2);

  await prisma.purchase.create({ data: { purchaseNo: 'PUR-1042', dealerId: ramesh.id, date: now, totalAmount: 25250, paidAmount: 15000, pendingAmount: 10250, items: { create: [
    { productId: apple.id, quantity: 100, rate: 80, amount: 8000 }, { productId: mango.id, quantity: 200, rate: 60, amount: 12000 }, { productId: banana.id, quantity: 150, rate: 35, amount: 5250 }
  ] } } });
  await prisma.purchase.create({ data: { purchaseNo: 'PUR-1041', dealerId: sunrise.id, date: yesterday, totalAmount: 19600, paidAmount: 19600, pendingAmount: 0, items: { create: [
    { productId: orange.id, quantity: 200, rate: 55, amount: 11000 }, { productId: grapes.id, quantity: 120, rate: 71.67, amount: 8600 }
  ] } } });
  await prisma.purchase.create({ data: { purchaseNo: 'PUR-1040', dealerId: maharashtra.id, date: twoDays, totalAmount: 21600, paidAmount: 10000, pendingAmount: 11600, items: { create: [{ productId: pomegranate.id, quantity: 200, rate: 108, amount: 21600 }] } } });

  await prisma.sale.create({ data: { saleNo: 'SAL-2208', customerId: sharma.id, date: now, totalAmount: 8000, receivedAmount: 5000, pendingAmount: 3000, costAmount: 6300, items: { create: [
    { productId: apple.id, quantity: 40, rate: 100, amount: 4000, costRate: 80 }, { productId: mango.id, quantity: 50, rate: 80, amount: 4000, costRate: 62 }
  ] } } });
  await prisma.sale.create({ data: { saleNo: 'SAL-2207', customerId: greenBasket.id, date: now, totalAmount: 5480, receivedAmount: 5480, pendingAmount: 0, costAmount: 4170, items: { create: [
    { productId: orange.id, quantity: 40, rate: 72, amount: 2880, costRate: 54 }, { productId: banana.id, quantity: 50, rate: 52, amount: 2600, costRate: 33 }
  ] } } });
  await prisma.sale.create({ data: { saleNo: 'SAL-2206', customerId: gupta.id, date: yesterday, totalAmount: 12000, receivedAmount: 7000, pendingAmount: 5000, costAmount: 9100, items: { create: [
    { productId: grapes.id, quantity: 50, rate: 96, amount: 4800, costRate: 72 }, { productId: pomegranate.id, quantity: 50, rate: 144, amount: 7200, costRate: 110 }
  ] } } });
  await prisma.sale.create({ data: { saleNo: 'SAL-2205', customerId: metro.id, date: twoDays, totalAmount: 18200, receivedAmount: 8000, pendingAmount: 10200, costAmount: 14200, items: { create: [{ productId: apple.id, quantity: 175, rate: 104, amount: 18200, costRate: 81.14 }] } } });

  await prisma.payment.createMany({ data: [
    { direction: 'PAID', dealerId: ramesh.id, amount: 15000, mode: 'UPI', date: now, reference: 'PUR-1042' },
    { direction: 'PAID', dealerId: sunrise.id, amount: 19600, mode: 'BANK_TRANSFER', date: yesterday, reference: 'PUR-1041' },
    { direction: 'PAID', dealerId: maharashtra.id, amount: 10000, mode: 'BANK_TRANSFER', date: twoDays, reference: 'PUR-1040' },
    { direction: 'RECEIVED', customerId: sharma.id, amount: 5000, mode: 'CASH', date: now, reference: 'SAL-2208' },
    { direction: 'RECEIVED', customerId: greenBasket.id, amount: 5480, mode: 'UPI', date: now, reference: 'SAL-2207' },
    { direction: 'RECEIVED', customerId: gupta.id, amount: 7000, mode: 'UPI', date: yesterday, reference: 'SAL-2206' },
    { direction: 'RECEIVED', customerId: metro.id, amount: 8000, mode: 'BANK_TRANSFER', date: twoDays, reference: 'SAL-2205' }
  ] });
  await prisma.stockTransaction.createMany({ data: [
    { productId: apple.id, type: 'PURCHASE', quantity: 100, unitCost: 80, reference: 'PUR-1042', date: now },
    { productId: mango.id, type: 'PURCHASE', quantity: 200, unitCost: 60, reference: 'PUR-1042', date: now },
    { productId: banana.id, type: 'PURCHASE', quantity: 150, unitCost: 35, reference: 'PUR-1042', date: now },
    { productId: apple.id, type: 'SALE', quantity: -40, unitCost: 80, reference: 'SAL-2208', date: now },
    { productId: mango.id, type: 'SALE', quantity: -50, unitCost: 62, reference: 'SAL-2208', date: now },
    { productId: orange.id, type: 'SALE', quantity: -40, unitCost: 54, reference: 'SAL-2207', date: now },
    { productId: grapes.id, type: 'DAMAGE', quantity: -5, unitCost: 72, reference: 'ADJ-021', reason: 'Spoiled', date: yesterday }
  ] });
  await prisma.expense.createMany({ data: [
    { title: 'Delivery tempo', category: 'Transport', amount: 1250, paymentMode: 'CASH', date: now },
    { title: 'Market loading charges', category: 'Labour', amount: 600, paymentMode: 'CASH', date: now }
  ] });
  console.log('Seeded FruitStock. Login: owner@fruitstock.in / demo123');
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
