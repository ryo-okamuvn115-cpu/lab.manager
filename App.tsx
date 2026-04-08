import { useState } from 'react';
import './index.css';
import HomePage from './pages/HomePage';
import InventoryPage from './pages/InventoryPage';
import OrderPage from './pages/OrderPage';
import ProtocolPage from './pages/ProtocolPage';
import Navigation from './components/Navigation';

type Page = 'home' | 'inventory' | 'orders' | 'protocols';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'inventory':
        return <InventoryPage />;
      case 'orders':
        return <OrderPage />;
      case 'protocols':
        return <ProtocolPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Lab Manager</h1>
          <p className="text-sm text-gray-500">研究室の在庫・発注書・プロトコルを一元管理</p>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
        <main className="flex-1 overflow-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;
