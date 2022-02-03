import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ForgePage from './pages/ForgePage';
import HomePage from './pages/HomePage';

function App() {
  useEffect(() => {
    const soldierMints = localStorage.getItem('soldierMints');
    const weaponMints = localStorage.getItem('weaponMints');

    if (!soldierMints) {
      fetch(`https://asgardforge.b-cdn.net/mint_list/soldiers.json`)
        .then((res) => res.json())
        .then((res) =>
          localStorage.setItem('soldierMints', JSON.stringify(res))
        );
    }

    if (!weaponMints) {
      fetch(`https://asgardforge.b-cdn.net/mint_list/weapons.json`)
        .then((res) => res.json())
        .then((res) =>
          localStorage.setItem('weaponMints', JSON.stringify(res))
        );
    }
  }, []);

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
