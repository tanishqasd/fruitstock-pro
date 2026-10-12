import { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, CalendarDays, Edit2, PackagePlus, Plus, Search, ShoppingCart, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, dueInr, inr, post, shortDate, todayDate } from '../api';
import type { Customer, Dealer, Product, Purchase, Sale } from '../types';
import { Field, FruitAvatar, Loader, LoadError, Modal, PageHeader, SearchBox, Status } from '../components';

type DraftLine = { key: number; productId: string; quantity: number; rate: number };

function Transactions({ kind }: { kind: 'sale' | 'purchase' }) {
  const [error, setError] = useState('');
  const saleMode = kind === 'sale';
  const [params] = useSearchParams();
  const [products, setProducts] = useState<Product[]>();
  const [parties, setParties] = useState<(Customer | Dealer)[]>([]);
  const [records, setRecords] = useState<(Sale | Purchase)[]>([]);
  const [open, setOpen] = useState(params.get('new') === '1');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<(Sale | Purchase) | null>(null);
  const [checkingId, setCheckingId] = useState('');
  const [reason, setReason] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [search, setSearch] = useState('');
  const [partyId, setPartyId] = useState('');
  const [payment, setPayment] = useState(0);
  const [mode, setMode] = useState('CASH');
  const [date, setDate] = useState(todayDate());
  const [lines, setLines] = useState<DraftLine[]>([{ key: 1, productId: '', quantity: 1, rate: 0 }]);

  const load = async () => {
    const [p, a, r] = await Promise.all([
      api<Product[]>('/products'),
      api<(Customer | Dealer)[]>(saleMode ? '/customers' : '/dealers'),
      api<(Sale | Purchase)[]>(saleMode ? '/sales' : '/purchases')
    ]);
    setProducts(p);
    setParties(a);
    setRecords(r);
  };

  useEffect(() => { setError(''); load().catch(error => setError(error.message)); }, [saleMode]);

  const total = useMemo(() => lines.reduce((s, l) => s + l.quantity * l.rate, 0), [lines]);
  const updateLine = (key: number, values: Partial<DraftLine>) =>
    setLines(ls => ls.map(l => l.key === key ? { ...l, ...values } : l));

  const selectProduct = (line: DraftLine, productId: string) => {
    const p = products?.find(x => x.id === productId);
    updateLine(line.key, { productId, rate: Number(saleMode ? p?.sellingRate : p?.purchaseRate) || 0 });
  };

  function reset() {
    setEditing(null); setReason(''); setInvoiceNo(''); setMode('CASH');
    setPartyId('');
    setPayment(0);
    setLines([{ key: Date.now(), productId: '', quantity: 1, rate: 0 }]);
    setDate(todayDate());
  }

  async function edit(record: Sale | Purchase) {
    if (checkingId || busy) return;
    setCheckingId(record.id);
    try {
      const fresh = await api<Sale | Purchase>(`${saleMode ? '/sales' : '/purchases'}/${record.id}`);
      setEditing(fresh); setReason(''); setInvoiceNo(fresh.invoiceNo || '');
      setPartyId(saleMode ? (fresh as Sale).customer?.id || '' : (fresh as Purchase).dealer.id);
      setPayment(Number(saleMode ? (fresh as Sale).receivedAmount : (fresh as Purchase).paidAmount));
      setDate(fresh.date.slice(0, 10));
      setLines(fresh.items.map((line, index) => ({ key: index + 1, productId: line.productId, quantity: Number(line.quantity), rate: Number(line.rate) })));
      setOpen(true);
    } catch (error) { toast.error((error as Error).message); }
    finally { setCheckingId(''); }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (lines.some(l => !l.productId)) {
      toast.error('Choose a fruit on every line');
      return;
    }
    setBusy(true);
    try {
      const endpoint = saleMode ? '/sales' : '/purchases';
      const items = lines.map(({ productId, quantity, rate }) => ({ productId, quantity, rate }));
      if (editing) await api(`${endpoint}/${editing.id}`, { method: 'PUT', body: JSON.stringify({
        partyId: partyId || null, date, invoiceNo, items, reason, expectedUpdatedAt: editing.updatedAt
      }) });
      else await post(endpoint, {
        [saleMode ? 'customerId' : 'dealerId']: partyId || undefined,
        [saleMode ? 'receivedAmount' : 'paidAmount']: payment,
        paymentMode: mode,
        date,
        invoiceNo, items
      });
    } catch (e) {
      toast.error((e as Error).message); setBusy(false); return;
    }
    toast.success(editing ? 'Invoice corrected; stock and balances updated' : saleMode ? 'Sale saved and stock reduced' : 'Purchase saved and stock increased');
    setOpen(false); reset();
    try { await load(); } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }

  if (error) return <LoadError message={error}/>;
  if (!products) return <Loader />;

  const filtered = records.filter(r => {
    const party = saleMode ? (r as Sale).customer?.name : (r as Purchase).dealer.name;
    const no = saleMode ? (r as Sale).saleNo : (r as Purchase).purchaseNo;
    return `${party} ${no}`.toLowerCase().includes(search.toLowerCase());
  });

  const pendingTotal = records.reduce((s, r) => s + Number(r.pendingAmount), 0);
  const gross = records.reduce((s, r) => s + Number(r.totalAmount), 0);

  return (
    <>
      <PageHeader
        eyebrow={saleMode ? 'Revenue' : 'Stock inflow'}
        title={saleMode ? 'Sales' : 'Purchases'}
        subtitle={saleMode ? 'Create invoices, collect payment, and keep customer credit visible.' : 'Record incoming fruit, dealer cost, and partial payments.'}
        action={
          <button className="btn primary" disabled={busy || Boolean(checkingId)} onClick={() => { reset(); setOpen(true); }}>
            <Plus size={17} />{saleMode ? 'New sale' : 'New purchase'}
          </button>
        }
      />
      <div className="summary-row">
        <div>
          {saleMode ? <ShoppingCart /> : <PackagePlus />}
          <span>Total {saleMode ? 'sales' : 'purchases'}<strong>{inr(gross)}</strong></span>
        </div>
        <div>
          {saleMode ? <ArrowDownToLine /> : <ArrowUpFromLine />}
          <span>{saleMode ? 'Receivable' : 'Payable'}<strong className="negative">{dueInr(pendingTotal)}</strong></span>
        </div>
        <div>
          <CalendarDays />
          <span>Total entries<strong>{records.length}</strong></span>
        </div>
      </div>
      <section className="panel table-panel">
        <div className="table-toolbar">
          <SearchBox value={search} onChange={setSearch} placeholder={`Search ${saleMode ? 'sale or customer' : 'purchase or dealer'}...`} />
          <button className="btn compact secondary"><CalendarDays size={15} />This month</button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{saleMode ? 'Sale' : 'Purchase'} no.</th>
                <th>Date</th>
                <th>{saleMode ? 'Customer' : 'Dealer'}</th>
                <th>Items</th>
                <th>Total</th>
                <th>{saleMode ? 'Received' : 'Paid'}</th>
                <th>Pending</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const sale = r as Sale, purchase = r as Purchase, pending = Number(r.pendingAmount);
                return (
                  <tr key={r.id}>
                    <td><strong className="ref">{saleMode ? sale.saleNo : purchase.purchaseNo}</strong></td>
                    <td>{shortDate(r.date)}</td>
                    <td><strong>{saleMode ? sale.customer?.name || 'Walk-in' : purchase.dealer.name}</strong></td>
                    <td>
                      <div className="fruit-stack">
                        {r.items.slice(0, 3).map((l, i) => (
                          <FruitAvatar key={i} name={l.product?.name || '?'} size="small" />
                        ))}
                        <span>{r.items.length} {r.items.length === 1 ? 'item' : 'items'}</span>
                      </div>
                    </td>
                    <td><strong>{inr(r.totalAmount)}</strong></td>
                    <td className="positive">{inr(saleMode ? sale.receivedAmount : purchase.paidAmount)}</td>
                    <td className={pending ? 'negative' : ''}>{dueInr(pending)}</td>
                    <td><Status tone={pending ? 'warn' : 'good'}>{pending ? 'Part paid' : 'Paid'}</Status></td>
                    <td><button className="btn compact secondary" disabled={Boolean(checkingId) || busy} aria-label={`Edit ${saleMode ? 'sale' : 'purchase'} ${saleMode ? sale.saleNo : purchase.purchaseNo}`} onClick={() => void edit(r)}><Edit2 size={15}/>{checkingId === r.id ? 'Loading…' : 'Edit'}</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <Modal wide title={editing ? `Edit ${saleMode ? 'sale' : 'purchase'} — ${saleMode ? (editing as Sale).saleNo : (editing as Purchase).purchaseNo}` : saleMode ? 'Create new sale' : 'Record a purchase'} subtitle={editing ? 'Saving recalculates stock and account balances. Existing payments are retained.' : saleMode ? 'Inventory will reduce when you save this invoice.' : 'Inventory and weighted cost will update when saved.'} open={open} onClose={() => { if (!busy) { setOpen(false); reset(); } }}>
        <form onSubmit={save}>
          <fieldset disabled={busy} className="invoice-form-fields">
          <div className="transaction-meta">
            <Field label={saleMode ? 'Customer' : 'Dealer'}>
              <select required={!saleMode || payment < total} value={partyId} onChange={e => setPartyId(e.target.value)}>
                <option value="">{saleMode ? 'Walk-in / choose customer' : 'Choose dealer'}</option>
                {parties.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Transaction date"><input required type="date" value={date} onInput={e => setDate(e.currentTarget.value)} /></Field>
            <Field label="Invoice number (optional)"><input maxLength={200} value={invoiceNo} onChange={event => setInvoiceNo(event.target.value)} /></Field>
          </div>
          <div className="line-editor">
            <div className="line-head"><span>Fruit</span><span>Quantity</span><span>Rate</span><span>Amount</span><span /></div>
            {lines.map(line => {
              const p = products.find(x => x.id === line.productId);
              return (
                <div className="line-row" key={line.key}>
                  <div className="product-select">
                    <Search size={16} />
                    <select value={line.productId} onChange={e => selectProduct(line, e.target.value)}>
                      <option value="">Choose fruit</option>
                      {products.map(x => <option value={x.id} key={x.id}>{x.name} · {Number(x.currentStock)} {x.unit}</option>)}
                    </select>
                  </div>
                  <div className="with-unit">
                    <input required min=".001" step=".001" type="number" value={line.quantity} onChange={e => updateLine(line.key, { quantity: +e.target.value })} />
                    <span>{p?.unit || 'unit'}</span>
                  </div>
                  <div className="input-money">
                    <span>₹</span>
                    <input required min="0" step=".01" type="number" value={line.rate} onChange={e => updateLine(line.key, { rate: +e.target.value })} />
                  </div>
                  <strong>{inr(line.quantity * line.rate)}</strong>
                  <button type="button" className="remove-line" disabled={lines.length === 1} onClick={() => setLines(ls => ls.filter(x => x.key !== line.key))}><Trash2 /></button>
                </div>
              );
            })}
            <button type="button" className="add-line" onClick={() => setLines(ls => [...ls, { key: Date.now(), productId: '', quantity: 1, rate: 0 }])}><Plus />Add another fruit</button>
          </div>
          <div className="transaction-bottom">
            <div className="payment-fields">
              <Field label={editing ? 'Previously allocated payments' : saleMode ? 'Received now' : 'Paid now'}>
                <div className="input-money large"><span>₹</span><input disabled={Boolean(editing)} type="number" min="0" max={editing ? undefined : total} step=".01" value={payment} onChange={e => setPayment(+e.target.value)} /></div>
              </Field>
              {!editing && <Field label="Payment mode">
                <select value={mode} onChange={e => setMode(e.target.value)}>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="OTHER">Other</option>
                </select>
              </Field>}
              {editing && <p className="balance-explanation">Existing payments are kept. To change a receipt or payout, use account History → Edit payment. Bill-linked payments follow a corrected party.</p>}
            </div>
            <div className="bill-summary">
              <p><span>Subtotal</span><strong>{inr(total)}</strong></p>
              <p><span>{saleMode ? 'Received' : 'Paid'}</span><strong className="positive">− {inr(payment)}</strong></p>
              <hr />
              {editing ? <p>Account dues recalculate on save.</p> : <p className="balance"><span>{saleMode ? 'Customer due' : 'Dealer due'}</span><strong>{dueInr(Math.max(0, total - payment))}</strong></p>}
            </div>
          </div>
          {editing && <Field label="Reason for invoice correction"><input required minLength={3} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} placeholder="Wrong quantity, rate, date, or account" /></Field>}
          </fieldset>
          <div className="modal-actions">
            <button type="button" className="btn secondary" disabled={busy} onClick={() => { setOpen(false); reset(); }}>Cancel</button>
            <button disabled={busy || total <= 0} className="btn primary">{busy ? 'Saving transaction...' : editing ? 'Save changes' : saleMode ? 'Save sale & update stock' : 'Save purchase & update stock'}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// Ensure these two named exports exist at the bottom:
export const Sales = () => <Transactions kind="sale" />;
export const Purchases = () => <Transactions kind="purchase" />;
