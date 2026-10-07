import { useState } from 'react';
import toast from 'react-hot-toast';
import { dueInr, post, todayDate } from '../api';
import type { Customer, Dealer } from '../types';
import { Field, Modal } from '../components';

export default function BalanceAdjustmentDialog({ kind, party, onClose, onSaved }: {
  kind: 'customer' | 'dealer'; party: Customer | Dealer; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const balance = Number(kind === 'customer' ? (party as Customer).outstanding : (party as Dealer).payable);
  const [operation, setOperation] = useState('SET_BALANCE');
  const [credit, setCredit] = useState(balance < 0);
  const [amount, setAmount] = useState(String(Math.abs(balance)));
  const [date, setDate] = useState(todayDate());
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const value = Number(amount || 0);
  const target = operation === 'SET_BALANCE' ? value * (credit ? -1 : 1) : balance + value * (operation === 'ADD_DUE' ? 1 : -1);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (busy) return; setError(''); setBusy(true);
    try {
      await post(`/${kind === 'customer' ? 'customers' : 'dealers'}/${party.id}/balance-adjustments`, {
        operation, amount: operation === 'SET_BALANCE' ? value * (credit ? -1 : 1) : value, expectedBalance: balance, date, reason
      });
    } catch (error) { setError((error as Error).message); setBusy(false); return; }
    toast.success('Balance updated'); onClose(); await onSaved();
  }
  return <Modal title="Adjust balance" subtitle="Set the current balance or add a dated adjustment. This records no cash payment." open onClose={() => { if (!busy) onClose(); }}>
    <form onSubmit={save}>
      <div className="payment-account"><strong>{party.name}</strong><span>Current {balance < 0 ? 'credit' : 'due'} <b className={balance > 0 ? 'negative' : 'positive'}>{dueInr(balance)}</b></span></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <Field label="Balance action"><select value={operation} disabled={busy} onChange={event => { setOperation(event.target.value); setAmount(event.target.value === 'SET_BALANCE' ? String(Math.abs(balance)) : ''); }}>
        <option value="SET_BALANCE">Set current balance</option><option value="ADD_DUE">Add amount to dues</option><option value="REDUCE_DUE">Reduce dues / add credit</option>
      </select></Field>
      {operation === 'SET_BALANCE' && <Field label="Balance type"><select value={credit ? 'CREDIT' : 'DUE'} disabled={busy} onChange={event => setCredit(event.target.value === 'CREDIT')}><option value="DUE">Due (negative display)</option><option value="CREDIT">Credit (positive display)</option></select></Field>}
      <div className="form-grid"><Field label={operation === 'SET_BALANCE' ? 'New balance amount (₹)' : 'Adjustment amount (₹)'}><input autoFocus required type="number" min={operation === 'SET_BALANCE' ? 0 : 0.01} max="9999999999.99" step="0.01" inputMode="decimal" value={amount} disabled={busy} onChange={event => setAmount(event.target.value)} /></Field>
        <Field label="Effective date"><input required type="date" value={date} disabled={busy} onInput={event => setDate(event.currentTarget.value)} /></Field></div>
      <Field label="Reason for adjustment"><textarea required minLength={3} maxLength={500} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} placeholder="Opening dues, missing past balance, or correction" /></Field>
      <p className="payment-preview">{target < 0 ? 'Credit after adjustment' : 'Due after adjustment'} <strong className={target > 0 ? 'negative' : 'positive'}>{dueInr(target)}</strong></p>
      <div className="modal-actions"><button type="button" className="btn secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save balance'}</button></div>
    </form>
  </Modal>;
}
