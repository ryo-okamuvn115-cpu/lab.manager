import { AlertCircle, Plus, TrendingUp } from 'lucide-react';
import { useData } from '../hooks/useData';
import { storageAPI } from '../lib/storage';

export default function HomePage() {
  const { data: inventory, loading: invLoading } = useData(() => storageAPI.getInventory());
  const { data: orders, loading: ordLoading } = useData(() => storageAPI.getOrders());
  const { data: protocols, loading: protLoading } = useData(() => storageAPI.getProtocols());

  // 在庫アラート（在庫が少ないアイテム）
  const lowStockItems = (inventory || []).filter(
    (item) => item.quantity <= item.minQuantity
  );

  // 最近の発注書
  const recentOrders = (orders || [])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  const isLoading = invLoading || ordLoading || protLoading;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* ダッシュボード統計 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">在庫アイテム</p>
              <p className="text-3xl font-bold text-gray-900">{inventory?.length || 0}</p>
            </div>
            <Package className="text-blue-500" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">発注書</p>
              <p className="text-3xl font-bold text-gray-900">{orders?.length || 0}</p>
            </div>
            <FileText className="text-green-500" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">プロトコル</p>
              <p className="text-3xl font-bold text-gray-900">{protocols?.length || 0}</p>
            </div>
            <BookOpen className="text-purple-500" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">在庫アラート</p>
              <p className="text-3xl font-bold text-red-600">{lowStockItems.length}</p>
            </div>
            <AlertCircle className="text-red-500" size={32} />
          </div>
        </div>
      </div>

      {/* クイックアクション */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">クイックアクション</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center gap-2 transition">
            <Plus size={20} />
            在庫を追加
          </button>
          <button className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center gap-2 transition">
            <Plus size={20} />
            発注書を作成
          </button>
        </div>
      </div>

      {/* 在庫アラート */}
      {lowStockItems.length > 0 && (
        <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-yellow-600 mt-1" size={24} />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-2">在庫アラート</h3>
              <ul className="space-y-1">
                {lowStockItems.map((item) => (
                  <li key={item.id} className="text-sm text-yellow-800">
                    • {item.name}: {item.quantity} {item.unit} (最小: {item.minQuantity} {item.unit})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 最近の発注書 */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">最近の発注書</h2>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">読み込み中...</div>
        ) : recentOrders.length > 0 ? (
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">¥{order.totalAmount.toLocaleString()}</p>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      order.status === 'received' ? 'bg-green-100 text-green-800' :
                      order.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status === 'draft' ? '下書き' :
                       order.status === 'submitted' ? '申請済み' :
                       order.status === 'approved' ? '承認済み' :
                       '受領済み'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">発注書がまだありません</div>
        )}
      </div>

      {/* 最終更新時刻 */}
      <div className="mt-8 text-center text-xs text-gray-500">
        最終更新: {new Date().toLocaleTimeString('ja-JP')}
      </div>
    </div>
  );
}

// 簡易的なアイコンコンポーネント
function Package({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
      <line x1="12" y1="22.08" x2="12" y2="12"></line>
    </svg>
  );
}

function FileText({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="12" y1="13" x2="12" y2="17"></line>
      <line x1="10" y1="15" x2="14" y2="15"></line>
    </svg>
  );
}

function BookOpen({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
    </svg>
  );
}
