const base = import.meta.env.VITE_API_URL || '/api';

// Initial baseline data seed
const initialSeed = {
  products: [
    { id: 'p1', name: 'Apple', variety: 'Washington', unit: 'kg', purchaseRate: 80, sellingRate: 110, avgCost: 80, currentStock: 180, minStock: 50 },
    { id: 'p2', name: 'Mango', variety: 'Ratnagiri Alphonso', unit: 'kg', purchaseRate: 140, sellingRate: 185, avgCost: 140, currentStock: 420, minStock: 80 },
    { id: 'p3', name: 'Orange', variety: 'Nagpur Santra', unit: 'kg', purchaseRate: 35, sellingRate: 50, avgCost: 35, currentStock: 650, minStock: 100 },
    { id: 'p4', name: 'Banana', variety: 'Robusta', unit: 'dozen', purchaseRate: 30, sellingRate: 45, avgCost: 30, currentStock: 150, minStock: 60 }
  ],
  customers: [
    { id: 'c1', name: 'Sharma Traders', phone: '+91 98221 44556', address: 'Chhatrapati Sambhajinagar', totalSales: 340000, totalReceived: 340000, outstanding: 0, creditLimit: 100000, paymentTerms: 7 },
    { id: 'c2', name: 'Metro Fresh Mart', phone: '+91 98902 33112', address: 'Pune APMC', totalSales: 520000, totalReceived: 450000, outstanding: 70000, creditLimit: 150000, paymentTerms: 14 }
  ],
  dealers: [
    { id: 'd1', name: 'Ramesh Fruit Supplier', phone: '+91 98201 42791', address: 'Vashi APMC, Navi Mumbai', totalPurchases: 680000, totalPaid: 600000, payable: 80000 },
    { id: 'd2', name: 'Sunrise Produce Co.', phone: '+91 97684 11520', address: 'Market Yard, Pune', totalPurchases: 420000, totalPaid: 420000, payable: 0 }
  ],
  sales: [
    { id: 's1', saleNo: 'SAL-2208', date: new Date().toISOString(), totalAmount: 48000, receivedAmount: 48000, pendingAmount: 0, costAmount: 38000, customer: { id: 'c1', name: 'Sharma Traders' }, items: [{ product: { name: 'Apple' }, quantity: 400, rate: 120 }] }
  ],
  purchases: [
    { id: 'pur1', purchaseNo: 'PUR-1042', date: new Date().toISOString(), totalAmount: 64000, paidAmount: 64000, pendingAmount: 0, dealer: { id: 'd1', name: 'Ramesh Fruit Supplier' }, items: [{ product: { name: 'Apple' }, quantity: 800, rate: 80 }] }
  ],
  payments: [
    { id: 'pay1', direction: 'RECEIVED', amount: 48000, mode: 'UPI', date: new Date().toISOString(), reference: 'UPI-98124', customer: { name: 'Sharma Traders' } }
  ],
  expenses: [
    { id: 'e1', title: 'Delivery Tempo', category: 'Transport', amount: 1250, date: new Date().toISOString(), paymentMode: 'CASH', notes: 'Mandi dispatch' }
  ],
  stockLedger: [
    { id: 'sl1', date: new Date().toISOString(), product: { name: 'Apple', variety: 'Washington', unit: 'kg' }, type: 'PURCHASE', quantity: 100, reference: 'PUR-1042', unitCost: 80 }
  ]
};

// Initialize persistent state in localStorage
function getDb() {
  const existing = localStorage.getItem('fruitstock_db');
  if (!existing) {
    localStorage.setItem('fruitstock_db', JSON.stringify(initialSeed));
    return initialSeed;
  }
  try {
    return JSON.parse(existing);
  } catch {
    return initialSeed;
  }
}

function saveDb(data: any) {
  localStorage.setItem('fruitstock_db', JSON.stringify(data));
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('fruitstock_token');
  
  // Try remote backend first
  try {
    const res = await fetch(`${base}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    if (res.ok) {
      return (await res.json()) as T;
    }
  } catch {
    // Continue to local persistent engine if backend is offline
  }

  const db = getDb();
  const endpoint = path.split('?')[0];

  if (endpoint === '/me') {
    return { id: 'u-1', name: 'Arjun Mehta', email: 'owner@fruitstock.in', businessName: 'FreshMandi Wholesale' } as unknown as T;
  }

  if (endpoint === '/dashboard') {
    const totalSales = db.sales.reduce((s: number, x: any) => s + Number(x.totalAmount || 0), 0);
    const totalPurchases = db.purchases.reduce((s: number, x: any) => s + Number(x.totalAmount || 0), 0);
    const cashReceived = db.sales.reduce((s: number, x: any) => s + Number(x.receivedAmount || 0), 0);
    const paymentsMade = db.purchases.reduce((s: number, x: any) => s + Number(x.paidAmount || 0), 0);
    const receivables = db.customers.reduce((s: number, x: any) => s + Number(x.outstanding || 0), 0);
    const payables = db.dealers.reduce((s: number, x: any) => s + Number(x.payable || 0), 0);
    const stockVal = db.products.reduce((s: number, x: any) => s + (Number(x.currentStock) * Number(x.avgCost)), 0);
    const totalExp = db.expenses.reduce((s: number, x: any) => s + Number(x.amount || 0), 0);

    return {
      metrics: {
        todaySales: totalSales,
        todayPurchases: totalPurchases,
        cashReceived,
        paymentsMade,
        receivables,
        payables,
        stockValue: stockVal,
        todayProfit: Math.max(0, totalSales * 0.18 - totalExp)
      },
      lowStock: db.products.filter((p: any) => Number(p.currentStock) <= Number(p.minStock)),
      recentSales: db.sales.slice(0, 5),
      recentPurchases: db.purchases.slice(0, 5)
    } as unknown as T;
  }

  if (endpoint === '/products') return db.products as unknown as T;
  if (endpoint === '/customers') return db.customers as unknown as T;
  if (endpoint === '/dealers') return db.dealers as unknown as T;
  if (endpoint === '/sales') return db.sales as unknown as T;
  if (endpoint === '/purchases') return db.purchases as unknown as T;
  if (endpoint === '/payments') return db.payments as unknown as T;
  if (endpoint === '/expenses') return db.expenses as unknown as T;
  if (endpoint === '/stock-ledger') return db.stockLedger as unknown as T;

  return [] as unknown as T;
}

export const post = async <T>(path: string, body: any): Promise<T> => {
  const token = localStorage.getItem('fruitstock_token');
  try {
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (res.ok) return (await res.json()) as T;
  } catch {
    // Offline local persistence fallback
  }

  const db = getDb();
  const endpoint = path.split('?')[0];

  if (endpoint === '/sales') {
    const items = body.items || [];
    let totalAmt = 0;
    
    // Decrement product inventory and calculate line totals
    items.forEach((item: any) => {
      const p = db.products.find((prod: any) => prod.id === item.productId);
      const qty = Number(item.quantity);
      const rate = Number(item.rate);
      totalAmt += qty * rate;
      if (p) {
        p.currentStock = Math.max(0, Number(p.currentStock) - qty);
        db.stockLedger.unshift({
          id: `sl-${Date.now()}-${Math.random()}`,
          date: body.date || new Date().toISOString(),
          product: p,
          type: 'SALE',
          quantity: -qty,
          reference: `SAL-${Date.now().toString().slice(-4)}`,
          unitCost: p.avgCost
        });
      }
    });

    const recAmt = Number(body.receivedAmount || 0);
    const pendAmt = Math.max(0, totalAmt - recAmt);
    const customer = db.customers.find((c: any) => c.id === body.customerId);

    const newSale = {
      id: `s-${Date.now()}`,
      saleNo: `SAL-${Date.now().toString().slice(-4)}`,
      date: body.date || new Date().toISOString(),
      totalAmount: totalAmt,
      receivedAmount: recAmt,
      pendingAmount: pendAmt,
      costAmount: totalAmt * 0.8,
      customer: customer || { name: 'Walk-in Customer' },
      items: items.map((it: any) => ({
        ...it,
        product: db.products.find((p: any) => p.id === it.productId) || { name: 'Fruit Item' }
      }))
    };

    db.sales.unshift(newSale);

    // Update customer outstanding dues
    if (customer) {
      customer.totalSales = Number(customer.totalSales || 0) + totalAmt;
      customer.totalReceived = Number(customer.totalReceived || 0) + recAmt;
      customer.outstanding = Number(customer.outstanding || 0) + pendAmt;
    }

    if (recAmt > 0) {
      db.payments.unshift({
        id: `pay-${Date.now()}`,
        direction: 'RECEIVED',
        amount: recAmt,
        mode: body.paymentMode || 'CASH',
        date: body.date || new Date().toISOString(),
        reference: newSale.saleNo,
        customer
      });
    }

    saveDb(db);
    return newSale as unknown as T;
  }

  if (endpoint === '/purchases') {
    const items = body.items || [];
    let totalAmt = 0;

    // Increment product inventory and update weighted cost
    items.forEach((item: any) => {
      const p = db.products.find((prod: any) => prod.id === item.productId);
      const qty = Number(item.quantity);
      const rate = Number(item.rate);
      totalAmt += qty * rate;
      if (p) {
        const oldStock = Number(p.currentStock);
        const newStock = oldStock + qty;
        p.avgCost = newStock > 0 ? ((oldStock * Number(p.avgCost)) + (qty * rate)) / newStock : rate;
        p.currentStock = newStock;
        p.purchaseRate = rate;

        db.stockLedger.unshift({
          id: `sl-${Date.now()}-${Math.random()}`,
          date: body.date || new Date().toISOString(),
          product: p,
          type: 'PURCHASE',
          quantity: qty,
          reference: `PUR-${Date.now().toString().slice(-4)}`,
          unitCost: rate
        });
      }
    });

    const paidAmt = Number(body.paidAmount || 0);
    const pendAmt = Math.max(0, totalAmt - paidAmt);
    const dealer = db.dealers.find((d: any) => d.id === body.dealerId);

    const newPurchase = {
      id: `pur-${Date.now()}`,
      purchaseNo: `PUR-${Date.now().toString().slice(-4)}`,
      date: body.date || new Date().toISOString(),
      totalAmount: totalAmt,
      paidAmount: paidAmt,
      pendingAmount: pendAmt,
      dealer: dealer || { name: 'Direct Mandi Farmer' },
      items: items.map((it: any) => ({
        ...it,
        product: db.products.find((p: any) => p.id === it.productId) || { name: 'Fruit Produce' }
      }))
    };

    db.purchases.unshift(newPurchase);

    if (dealer) {
      dealer.totalPurchases = Number(dealer.totalPurchases || 0) + totalAmt;
      dealer.totalPaid = Number(dealer.totalPaid || 0) + paidAmt;
      dealer.payable = Number(dealer.payable || 0) + pendAmt;
    }

    saveDb(db);
    return newPurchase as unknown as T;
  }

  if (endpoint === '/customers') {
    const newCust = {
      id: `c-${Date.now()}`,
      ...body,
      totalSales: 0,
      totalReceived: 0,
      outstanding: Number(body.openingBalance || 0)
    };
    db.customers.unshift(newCust);
    saveDb(db);
    return newCust as unknown as T;
  }

  if (endpoint === '/dealers') {
    const newDealer = {
      id: `d-${Date.now()}`,
      ...body,
      totalPurchases: 0,
      totalPaid: 0,
      payable: Number(body.openingBalance || 0)
    };
    db.dealers.unshift(newDealer);
    saveDb(db);
    return newDealer as unknown as T;
  }

  if (endpoint === '/products') {
    const newProduct = {
      id: `p-${Date.now()}`,
      ...body,
      avgCost: Number(body.purchaseRate || 0),
      currentStock: Number(body.currentStock || 0)
    };
    db.products.unshift(newProduct);
    saveDb(db);
    return newProduct as unknown as T;
  }

  if (endpoint === '/expenses') {
    const newExp = {
      id: `e-${Date.now()}`,
      ...body
    };
    db.expenses.unshift(newExp);
    saveDb(db);
    return newExp as unknown as T;
  }

  if (endpoint === '/payments') {
    const newPay = {
      id: `pay-${Date.now()}`,
      ...body,
      customer: db.customers.find((c: any) => c.id === body.customerId),
      dealer: db.dealers.find((d: any) => d.id === body.dealerId)
    };
    db.payments.unshift(newPay);
    saveDb(db);
    return newPay as unknown as T;
  }

  if (endpoint === '/stock-adjustments') {
    const p = db.products.find((prod: any) => prod.id === body.productId);
    const qty = Number(body.quantity);
    if (p) {
      p.currentStock = Math.max(0, Number(p.currentStock) + qty);
      db.stockLedger.unshift({
        id: `sl-${Date.now()}`,
        date: body.date || new Date().toISOString(),
        product: p,
        type: qty < 0 ? 'DAMAGE' : 'ADJUSTMENT',
        quantity: qty,
        reason: body.reason,
        reference: `ADJ-${Date.now().toString().slice(-4)}`
      });
    }
    saveDb(db);
    return { success: true } as unknown as T;
  }

  return { success: true } as unknown as T;
};

export const inr = (value: number | string | undefined, compact = false) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
    notation: compact ? 'compact' : 'standard',
  }).format(Number(value || 0));

export const shortDate = (date: string | Date) =>
  new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));