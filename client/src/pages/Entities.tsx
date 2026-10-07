import { useEffect, useRef, useState } from 'react';
import { CreditCard, Edit2, History, Plus, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, dueInr, inr, post, shortDate } from '../api';
import type { Customer, Dealer, Payment, Purchase, Sale } from '../types';
import { Field, Loader, LoadError, Modal, PageHeader, SearchBox } from '../components';
import AccountPaymentDialog from '../components/AccountPaymentDialog';

type Party = Customer | Dealer;
type Details = Party & { sales?: Sale[]; purchases?: Purchase[]; payments: Payment[]; openingDue?: number };
const emptyForm = { name: '', phone: '', address: '', creditLimit: 0, gstNumber: '', bankDetails: '' };

function EntitiesView({ kind }: { kind: 'customer' | 'dealer' }) {
  const isCustomer = kind === 'customer';
  const endpoint = isCustomer ? '/customers' : '/dealers';
  const balanceOf = (party: Party) => Number(isCustomer ? (party as Customer).outstanding : (party as Dealer).payable);
  const [error, setError] = useState('');
  const [entities, setEntities] = useState<Party[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Party | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Details | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<Party | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [checkingId, setCheckingId] = useState('');
  const request = useRef(0);

  async function load() {
    setError('');
    try { setEntities(await api<Party[]>(endpoint)); }
    catch (error) { setError((error as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); return () => { request.current++; }; }, [endpoint]);

  function openEdit(party: Party) {
    setForm({ name: party.name, phone: party.phone || '', address: party.address || '',
      creditLimit: Number((party as Customer).creditLimit || 0),
      gstNumber: (party as Dealer).gstNumber || '', bankDetails: (party as Dealer).bankDetails || '' });
    setEditTarget(party);
  }

  async function openAccount(party: Party, action: 'history' | 'payment') {
    const current = ++request.current;
    setCheckingId(party.id);
    try {
      const details = await api<Details>(`${endpoint}/${party.id}`);
      if (current !== request.current) return;
      if (action === 'history') setHistoryTarget(details);
      else if (balanceOf(details) <= 0) { toast('This account has no outstanding dues'); await load(); }
      else setPaymentTarget(details);
    } catch (error) { if (current === request.current) toast.error((error as Error).message); }
    finally { if (current === request.current) setCheckingId(''); }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const payload = isCustomer
        ? { name: form.name.trim(), phone: form.phone, address: form.address, creditLimit: form.creditLimit }
        : { name: form.name.trim(), phone: form.phone, address: form.address, gstNumber: form.gstNumber, bankDetails: form.bankDetails };
      if (editTarget) await api(`${endpoint}/${editTarget.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await post(endpoint, payload);
      toast.success(editTarget ? 'Account details updated' : 'Account registered');
      setCreateOpen(false); setEditTarget(null);
      await load();
    } catch (error) { toast.error((error as Error).message); }
    finally { setBusy(false); }
  }

  async function paymentSaved() {
    await load();
    if (historyTarget) {
      try { setHistoryTarget(await api<Details>(`${endpoint}/${historyTarget.id}`)); }
      catch (error) { setHistoryTarget(null); toast.error((error as Error).message); }
    }
  }

  if (error) return <LoadError message={error} />;
  if (loading) return <Loader />;
  const filtered = entities.filter(party => `${party.name} ${party.phone || ''} ${party.address || ''}`.toLowerCase().includes(search.toLowerCase()));
  const invoices = isCustomer ? historyTarget?.sales : historyTarget?.purchases;
  const historyBalance = historyTarget ? balanceOf(historyTarget) : 0;

  return <>
    <PageHeader eyebrow={isCustomer ? 'Buyer directory' : 'Supplier network'} title={isCustomer ? 'Customers' : 'Dealers'}
      subtitle={isCustomer ? 'View customer dues and record received payments.' : 'View supplier dues and record dealer payouts.'}
      action={<button className="btn primary" onClick={() => { setForm(emptyForm); setCreateOpen(true); }}><Plus size={17} /> Add {isCustomer ? 'Customer' : 'Dealer'}</button>} />
    <section className="panel table-panel">
      <div className="table-toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search name, phone or address…" /></div>
      <p className="balance-explanation">Dues appear in red with a minus sign. A positive balance is account credit.</p>
      <div className="table-scroll">
        <table className="party-table"><thead><tr><th>Party name</th><th>Contact</th><th>Address</th>
          <th>{isCustomer ? 'Credit limit' : 'GST / Tax ID'}</th><th className="align-right">Balance</th><th>Actions</th></tr></thead>
          <tbody>{filtered.map(party => {
            const balance = balanceOf(party);
            return <tr key={party.id}>
              <td data-label="Party name"><button className="party-name" onClick={() => void openAccount(party, 'history')}>{party.name}</button></td>
              <td data-label="Contact">{party.phone || '—'}</td>
              <td data-label="Address">{party.address || '—'}</td>
              <td data-label={isCustomer ? 'Credit limit' : 'GST / Tax ID'}>{isCustomer ? inr((party as Customer).creditLimit) : (party as Dealer).gstNumber || '—'}</td>
              <td data-label="Balance" className={`align-right ${balance > 0 ? 'negative' : 'positive'}`}>
                <strong>{dueInr(balance)}</strong><small className="balance-caption">{balance > 0 ? 'Due' : balance < 0 ? 'Credit' : 'Settled'}</small>
              </td>
              <td data-label="Actions" className="party-actions-cell"><div className="party-actions">
                <button className="btn compact primary" disabled={balance <= 0 || Boolean(checkingId)} onClick={() => void openAccount(party, 'payment')}
                  aria-label={`Record payment for ${party.name}`}><CreditCard size={16} />{checkingId === party.id ? 'Checking…' : 'Record payment'}</button>
                <button className="btn compact secondary" disabled={Boolean(checkingId)} onClick={() => void openAccount(party, 'history')}><History size={16} /> History</button>
                <button className="btn compact secondary" onClick={() => openEdit(party)}><Edit2 size={16} /> Edit details</button>
              </div></td>
            </tr>;
          })}{filtered.length === 0 && <tr><td colSpan={6} className="empty-row">No {isCustomer ? 'customers' : 'dealers'} found.</td></tr>}</tbody>
        </table>
      </div>
    </section>

    <Modal title={`${editTarget ? 'Edit' : 'Register'} ${isCustomer ? 'customer' : 'dealer'}`} subtitle="Manage this account’s contact details."
      open={createOpen || Boolean(editTarget)} onClose={() => { if (!busy) { setCreateOpen(false); setEditTarget(null); } }}>
      <form onSubmit={save}><Field label="Full name"><input required minLength={2} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></Field>
        <div className="form-grid"><Field label="Contact phone"><input type="tel" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} /></Field>
          <Field label="Address"><input value={form.address} onChange={event => setForm({ ...form, address: event.target.value })} /></Field>
          {isCustomer ? <Field label="Credit limit (₹)"><input type="number" min="0" step="0.01" value={form.creditLimit} onChange={event => setForm({ ...form, creditLimit: Number(event.target.value) })} /></Field> : <>
            <Field label="GST number (optional)"><input value={form.gstNumber} onChange={event => setForm({ ...form, gstNumber: event.target.value })} /></Field>
            <Field label="Bank details / UPI"><input value={form.bankDetails} onChange={event => setForm({ ...form, bankDetails: event.target.value })} /></Field>
          </>}
        </div><div className="modal-actions"><button type="button" className="btn secondary" disabled={busy} onClick={() => { setCreateOpen(false); setEditTarget(null); }}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : editTarget ? 'Save changes' : 'Register'}</button></div>
      </form>
    </Modal>

    <Modal wide title={`${historyTarget?.name || 'Account'} — Transaction history`} subtitle={`Contact: ${historyTarget?.phone || 'Not provided'} | ${historyTarget?.address || 'No address'}`}
      open={Boolean(historyTarget) && !paymentTarget} onClose={() => setHistoryTarget(null)}>
      <div className="account-history">
        <div className="account-history-heading"><div className="summary-row"><div><Users /><span>Account balance<strong className={historyBalance > 0 ? 'negative' : 'positive'}>{dueInr(historyBalance)}</strong></span></div></div>
          <button className="btn primary" disabled={historyBalance <= 0 || Boolean(checkingId)} onClick={() => historyTarget && void openAccount(historyTarget, 'payment')}><CreditCard size={17} /> Record payment</button></div>
        <div className="account-totals"><span>Opening balance <b>{dueInr(historyTarget?.openingBalance)}</b></span>
          <span>Total {isCustomer ? 'sales' : 'purchases'} <b>{inr(isCustomer ? (historyTarget as Customer | null)?.totalSales : (historyTarget as Dealer | null)?.totalPurchases)}</b></span>
          <span>Total {isCustomer ? 'received' : 'paid'} <b>{inr(isCustomer ? (historyTarget as Customer | null)?.totalReceived : (historyTarget as Dealer | null)?.totalPaid)}</b></span></div>
        <p className="balance-explanation">Balance = opening balance + {isCustomer ? 'sales' : 'purchases'} − payments. Later payments settle opening dues first, then the oldest bills.</p>
        <h3>Invoices and vouchers</h3>
        <div className="table-scroll"><table><thead><tr><th>Date</th><th>Bill number</th><th>Total</th><th>{isCustomer ? 'Received' : 'Paid'}</th><th>Due</th></tr></thead>
          <tbody>{invoices?.map(invoice => <tr key={invoice.id}><td>{shortDate(invoice.date)}</td><td className="ref">{'saleNo' in invoice ? invoice.saleNo : invoice.purchaseNo}</td>
            <td>{inr(invoice.totalAmount)}</td><td className="positive">{inr('receivedAmount' in invoice ? invoice.receivedAmount : invoice.paidAmount)}</td>
            <td className={Number(invoice.pendingAmount) > 0 ? 'negative' : 'positive'}>{dueInr(invoice.pendingAmount)}</td></tr>)}
            {!invoices?.length && <tr><td colSpan={5} className="empty-row">No invoices recorded yet.</td></tr>}</tbody></table></div>
        <h3>Payment records</h3>
        <div className="table-scroll"><table><thead><tr><th>Payment date</th><th>Mode</th><th>Reference</th><th>Amount settled</th></tr></thead><tbody>
          {historyTarget?.payments.map(payment => <tr key={payment.id}><td>{shortDate(payment.date)}</td><td>{payment.mode.replaceAll('_', ' ')}</td><td>{payment.reference || 'Settlement'}</td><td className="positive">{inr(payment.amount)}</td></tr>)}
          {!historyTarget?.payments.length && <tr><td colSpan={4} className="empty-row">No payments recorded yet.</td></tr>}
        </tbody></table></div>
      </div>
    </Modal>
    {paymentTarget && <AccountPaymentDialog key={`${kind}:${paymentTarget.id}`} kind={kind} party={paymentTarget} onClose={() => setPaymentTarget(null)} onSaved={paymentSaved} />}
  </>;
}

export const Customers = () => <EntitiesView kind="customer" />;
export const Dealers = () => <EntitiesView kind="dealer" />;
