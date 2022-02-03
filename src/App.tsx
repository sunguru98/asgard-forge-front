import { useWallet } from '@saberhq/use-solana';
import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ForgePage from './pages/ForgePage';
import HomePage from './pages/HomePage';

function App() {
  return (
    <div className='App'>
      <BrowserRouter>
        <Routes>
          <Route index element={<HomePage />} />
          <Route path='/forge' element={<ForgePage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
