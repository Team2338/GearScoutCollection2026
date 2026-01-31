import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import DataCollection from './pages/DataCollection';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/data-collection" element={<DataCollection />} />
      </Routes>
    </Router>
  );
};

export default App;
