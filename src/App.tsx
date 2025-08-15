
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from './components/ui';
import ChessGame from './components/chess/ChessGame';
import './index.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen gradient-bg">
        <Routes>
          <Route path="/" element={<ChessGame />} />
        </Routes>
        <Toaster />
      </div>
    </Router>
  );
}

export default App;
