import React from 'react';
import LandingPage from './modules/components/LandingPage';
import PriorOptimizationViewer from './modules/components/PriorOptimizationViewer';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route
            path="/"
            element={<LandingPage />}
          />

          <Route
            path="/programmer"
            element={<PriorOptimizationViewer />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
