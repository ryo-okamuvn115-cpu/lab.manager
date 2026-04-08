import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import DashboardPage from '@/pages/DashboardPage';
import InventoryManagerPage from '@/pages/InventoryManagerPage';
import OrdersManagerPage from '@/pages/OrdersManagerPage';
import ProtocolsManagerPage from '@/pages/ProtocolsManagerPage';
import { useLabManager } from '@/hooks/useLabManager';
import type { Page } from '@/lib/types';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const {
    snapshot,
    loading,
    saving,
    error,
    createInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    createOrder,
    updateOrder,
    deleteOrder,
    createProtocol,
    updateProtocol,
    deleteProtocol,
  } = useLabManager();

  useEffect(() => {
    document.title = '研究室管理 - 共有在庫システム';
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <DashboardPage
            snapshot={snapshot}
            loading={loading}
            saving={saving}
            error={error}
            onNavigate={setCurrentPage}
          />
        );
      case 'inventory':
        return (
          <InventoryManagerPage
            items={snapshot?.inventory ?? []}
            loading={loading}
            saving={saving}
            error={error}
            lastSyncAt={snapshot?.updatedAt ?? null}
            onCreate={createInventoryItem}
            onUpdate={updateInventoryItem}
            onDelete={deleteInventoryItem}
          />
        );
      case 'orders':
        return (
          <OrdersManagerPage
            orders={snapshot?.orders ?? []}
            loading={loading}
            saving={saving}
            error={error}
            lastSyncAt={snapshot?.updatedAt ?? null}
            onCreate={createOrder}
            onUpdate={updateOrder}
            onDelete={deleteOrder}
          />
        );
      case 'protocols':
        return (
          <ProtocolsManagerPage
            protocols={snapshot?.protocols ?? []}
            loading={loading}
            saving={saving}
            error={error}
            lastSyncAt={snapshot?.updatedAt ?? null}
            onCreate={createProtocol}
            onUpdate={updateProtocol}
            onDelete={deleteProtocol}
          />
        );
      default:
        return (
          <DashboardPage
            snapshot={snapshot}
            loading={loading}
            saving={saving}
            error={error}
            onNavigate={setCurrentPage}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">研究室管理</h1>
          <p className="text-sm text-gray-500">
            試薬・発注・プロトコルを研究室で共有管理
          </p>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col md:min-h-[calc(100vh-81px)] md:flex-row">
        <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
        <main className="flex-1">{renderPage()}</main>
      </div>
    </div>
  );
}

export default App;
