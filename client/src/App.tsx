import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { api } from './api';
import Layout from './Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import { Purchases, Sales } from './pages/Transactions';
import { Customers, Dealers } from './pages/Entities';
import Payments from './pages/Payments';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { TransactionHistory } from './pages/TransactionHistory';
import { Loader, LoadError } from './components';

type User = { id: string; name: string; email: string; businessName: string };

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(() => {
    const token = localStorage.getItem('fruitstock_token');
    return token ? undefined : null;
  });

  const [isSigningUp, setIsSigningUp] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('fruitstock_token');
    if (token) {
      api<User>('/me')
        .then(setUser)
        .catch(error => {
          setError(error.message);
        });
    } else {
      setUser(null);
    }
  }, []);

  if (error) return <LoadError message={error}/>;
  if (user === undefined) return <Loader/>;
  if (!user) {
    if (isSigningUp) {
      return <Signup onSwitchToLogin={() => setIsSigningUp(false)} />;
    }
    return (
      <Login
        onLogin={(result: any) => {
          localStorage.setItem('fruitstock_token', result.token);
          setUser(result.user);
        }}
        onSwitchToSignup={() => setIsSigningUp(true)}
      />
    );
  }

  return (
    <Layout
      user={user}
      logout={() => {
        localStorage.removeItem('fruitstock_token');
        setUser(null);
      }}
    >
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/transactions" element={<TransactionHistory />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/dealers" element={<Dealers />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
