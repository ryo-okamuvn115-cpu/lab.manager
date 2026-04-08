import { useCallback } from 'react';
import { AlertCircle, BookOpen, FileText, Package, Plus, TrendingUp } from 'lucide-react';
import ErrorBanner from '@/components/ErrorBanner';
import { useData } from '@/hooks/useData';
import { storageAPI } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { ORDER_STATUS_LABELS, type Page } from '@/lib/types';

interface HomePageProps {
  onNavigate: (page: Page) => void;
}

const ORDER_STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  received: 'bg-green-100 text-green-800',
} as const;

export default function HomePage({ onNavigate }: HomePageProps) {
  const fetchSnapshot = useCallback(() => storageAPI.getSnapshot(), []);
  const { data: snapshot, loading, error } = useData(fetchSnapshot, { refreshInterval: 4000 });

  const inventory = snapshot?.inventory ?? [];
  const orders = snapshot?.orders ?? [];
  const protocols = snapshot?.protocols ?? [];
  const lowStockItems = inventory.filter((item) => item.quantity <= item.minQuantity);
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      {error && <ErrorBanner message={error.message} />}

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">在庫アイテム</p>
              <p className="text-3xl font-bold text-gray-900">{inventory.length}</p>
            </div>
            <Package className="text-blue-500" size={32} />
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">発注書</p>
              <p className="text-3xl font-bold text-gray-900">{orders.length}</p>
            </div>
            <FileText className="text-green-500" size={32} />
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">プロトコル</p>
              <p className="text-3xl font-bold text-gray-900">{protocols.length}</p>
            </div>
            <BookOpen className="text-purple-500" size={32} />
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">在庫アラート</p>
              <p className="text-3xl font-bold text-red-600">{lowStockItems.length}</p>
            </div>
            <AlertCircle className="text-red-500" size={32} />
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-4 text-xl font-bold text-gray-900">クイックアクション</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <button
            onClick={() => onNavigate('inventory')}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus size={20} />
            在庫一覧を開く
          </button>
          <button
            onClick={() => onNavigate('orders')}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700"
          >
            <TrendingUp size={20} />
            発注状況を確認
          </button>
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <div className="mb-8 rounded-lg border border-yellow-200 bg-yellow-50 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-1 text-yellow-600" size={24} />
            <div>
              <h3 className="mb-2 font-semibold text-yellow-900">在庫アラート</h3>
              <ul className="space-y-1">
                {lowStockItems.map((item) => (
                  <li key={item.id} className="text-sm text-yellow-800">
                    ・{item.name}: {item.quantity} {item.unit} (最小 {item.minQuantity} {item.unit})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-4 text-xl font-bold text-gray-900">最近の発注書</h2>
        {loading ? (
          <div className="py-8 text-center text-gray-500">読み込み中...</div>
        ) : recentOrders.length > 0 ? (
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <div key={order.id} className="rounded-lg bg-white p-4 shadow transition hover:shadow-md">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatCurrency(order.totalAmount)}</p>
                    <span
                      className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${ORDER_STATUS_COLORS[order.status]}`}
                    >
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">発注書はまだありません</div>
        )}
      </div>

      <div className="mt-8 text-center text-xs text-gray-500">
        {snapshot ? `共有データ最終更新: ${formatDateTime(snapshot.updatedAt)}` : '共有サーバーを待機中'}
      </div>
    </div>
  );
}
