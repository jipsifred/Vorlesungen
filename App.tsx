import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { StudyView } from './components/StudyView';
import { PinLockScreen } from './components/PinLockScreen';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check session storage on load
    const auth = sessionStorage.getItem('auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
    setIsChecking(false);
  }, []);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  if (isChecking) {
    return null; // or a spinner
  }

  if (!isAuthenticated) {
    return <PinLockScreen onAuthenticated={handleAuthSuccess} />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/study/:id" element={<StudyView />} />
      </Routes>
    </Router>
  );
}

export default App;