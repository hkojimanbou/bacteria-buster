import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { AutoThoughtCatch } from './pages/AutoThoughtCatch';
import { CognitiveRestructuring } from './pages/CognitiveRestructuring';
import { HistoryList } from './pages/HistoryList';
import { TrashList } from './pages/TrashList';
import { AuthProvider } from './hooks/useAuth';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 text-gray-800 font-sans selection:bg-indigo-100 selection:text-indigo-900">
          <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl overflow-hidden relative">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/training/auto-thought" element={<AutoThoughtCatch />} />
              <Route path="/training/auto-thought/:id" element={<AutoThoughtCatch />} />
              <Route path="/training/cognitive" element={<CognitiveRestructuring />} />
              <Route path="/training/cognitive/:id" element={<CognitiveRestructuring />} />
              <Route path="/history/:type" element={<HistoryList />} />
              <Route path="/trash" element={<TrashList />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
