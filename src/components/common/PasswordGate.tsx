import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface PasswordGateProps {
  children: React.ReactNode;
  storageKey: string;
}

export default function PasswordGate({ children, storageKey }: PasswordGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    const isAuthed = sessionStorage.getItem(`curbily_auth_${storageKey}`);
    if (isAuthed === 'true') {
      setIsAuthenticated(true);
    }
  }, [storageKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'curbily2026') {
      sessionStorage.setItem(`curbily_auth_${storageKey}`, 'true');
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border-2 border-slate-900">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-6 mx-auto">
          <Lock className="w-6 h-6 text-slate-800" />
        </div>
        <h2 className="text-2xl font-black text-center mb-2">Password Required</h2>
        <p className="text-slate-500 text-center text-sm mb-6">
          This page contains confidential information for investors and the internal team.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="password"
              placeholder="Enter password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={error ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {error && <p className="text-red-500 text-xs font-bold mt-2 uppercase tracking-widest">Incorrect Password</p>}
          </div>
          <Button type="submit" className="w-full font-bold uppercase tracking-widest bg-black text-white hover:bg-slate-800">
            Access Page
          </Button>
        </form>
      </div>
    </div>
  );
}
