import React, { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface PinLockScreenProps {
  onAuthenticated: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({ onAuthenticated }) => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const CORRECT_PIN = "0810";

  const handleInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only numbers

    const newPin = [...pin];
    newPin[index] = value.slice(-1); // Take last char if multiple
    setPin(newPin);
    setError(false);

    // Auto focus next
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const enteredPin = pin.join('');
    
    if (enteredPin === CORRECT_PIN) {
      sessionStorage.setItem('auth', 'true');
      onAuthenticated();
    } else {
      setError(true);
      setShake(true);
      setPin(['', '', '', '']);
      inputRefs.current[0]?.focus();
      setTimeout(() => setShake(false), 500);
    }
  };

  // Auto submit when 4 digits filled
  useEffect(() => {
    if (pin.every(digit => digit !== '')) {
      handleSubmit();
    }
  }, [pin]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className={`max-w-md w-full bg-white rounded-3xl shadow-xl p-8 md:p-12 text-center transition-transform duration-100 ${shake ? 'translate-x-[-10px]' : ''} ${shake ? 'translate-x-[10px]' : ''}`}>
        
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 transition-colors duration-300 ${error ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
          {error ? <AlertCircle className="w-10 h-10" /> : <Lock className="w-10 h-10" />}
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-2">Zugriff geschützt</h1>
        <p className="text-slate-500 mb-8">Bitte gib den 4-stelligen PIN ein, um fortzufahren.</p>

        <div className="flex justify-center gap-3 mb-8">
          {pin.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text" // using text to handle behavior better than number
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInput(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`w-14 h-16 text-center text-3xl font-bold rounded-xl border-2 outline-none transition-all
                ${error 
                  ? 'border-red-200 bg-red-50 text-red-500 focus:border-red-400' 
                  : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/20'
                }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-sm font-medium mb-6 animate-pulse">
            Falscher PIN. Bitte versuche es erneut.
          </p>
        )}

        <div className="text-xs text-slate-400">
          EcoStudy Security Gate
        </div>
      </div>
    </div>
  );
};