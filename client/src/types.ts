export type Product = { id: string; name: string; variety?: string; unit: string; purchaseRate: number; sellingRate: number; avgCost: number; currentStock: number; minStock: number };
export type Customer = { id: string; name: string; phone?: string; address?: string; creditLimit: number; paymentTerms: number; totalSales: number; totalReceived: number; outstanding: number; _count?: { sales: number } };
export type Dealer = { id: string; name: string; phone?: string; address?: string; contactPerson?: string; totalPurchases: number; totalPaid: number; payable: number; _count?: { purchases: number } };
export type Line = { id: string; productId: string; quantity: number; rate: number; amount?: number; product?: Product };
export type Sale = { id: string; saleNo: string; date: string; totalAmount: number; receivedAmount: number; pendingAmount: number; costAmount: number; customer?: Customer; items: Line[] };
export type Purchase = { id: string; purchaseNo: string; date: string; totalAmount: number; paidAmount: number; pendingAmount: number; dealer: Dealer; items: Line[] };
export type Payment = { id: string; direction: 'RECEIVED'|'PAID'; amount: number; mode: string; date: string; reference?: string; customer?: Customer; dealer?: Dealer };
export type StockEntry = { id: string; type: string; quantity: number; unitCost?: number; reference?: string; reason?: string; date: string; product: Product };
export type Dashboard = { metrics: { todaySales: number; todayPurchases: number; cashReceived: number; paymentsMade: number; receivables: number; payables: number; stockValue: number; todayProfit: number }; lowStock: Product[]; recentSales: Sale[]; recentPurchases: Purchase[] };
export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  paymentMode: 'CASH' | 'UPI' | 'BANK_TRANSFER' | string;
  notes?: string;
}
