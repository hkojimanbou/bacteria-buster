import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { AutoThoughtCatch } from './pages/AutoThoughtCatch';
import { CognitiveRestructuring } from './pages/CognitiveRestructuring';
import { HistoryList } from './pages/HistoryList';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/training/auto-thought" element={<AutoThoughtCatch />} />
          <Route path="/training/auto-thought/:id" element={<AutoThoughtCatch />} />
          <Route path="/training/cognitive" element={<CognitiveRestructuring />} />
          <Route path="/training/cognitive/:id" element={<CognitiveRestructuring />} />
          <Route path="/history/:type" element={<HistoryList />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
