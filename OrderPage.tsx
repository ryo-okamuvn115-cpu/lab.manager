import { Plus, Trash2, Edit2 } from 'lucide-react';
import { useData } from '../hooks/useData';
import { storageAPI } from '../lib/storage';
import type { Order } from '../types';

export default function OrderPage() {
  const { data: orders, loading, refetch } = useData(() => storageAPI.getOrders());

  const handleDelete = (id: string) => {
    if (confirm('この発注書を削除しますか？')) {
      storageAPI.deleteOrder(id);
      refetch();
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'received':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: Order['status']) => {
    switch (status) {
      case 'draft':
        return '下書き';
      case 'submitted':
        return '申請済み';
      case 'approved':
        return '承認済み';
      case 'received':
        return '受領済み';
      default:
        return status;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">発注書</h1>
        <button className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition">
          <Plus size={20} />
          新しい発注書を作成
        </button>
      </div>

      {/* 発注書一覧 */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">読み込み中...</div>
      ) : (orders || []).length > 0 ? (
        <div className="space-y-4">
          {orders!.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow hover:shadow-md transition p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{order.orderNumber}</h3>
                  <p className="text-sm text-gray-500">
                    作成日: {new Date(order.createdAt).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <span className={`text-sm font-semibold px-3 py-1 rounded ${getStatusColor(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>

              {/* 発注アイテム */}
              <div className="mb-4 bg-gray-50 rounded p-4">
                <h4 className="font-semibold text-gray-900 mb-2">発注内容</h4>
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm text-gray-700">
                      <span>{item.itemName} × {item.quantity}</span>
                      <span>¥{item.totalPrice.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 合計金額と操作 */}
              <div className="flex items-center justify-between">
                <div className="text-right">
                  <p className="text-sm text-gray-600">合計金額</p>
                  <p className="text-2xl font-bold text-gray-900">¥{order.totalAmount.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="text-blue-600 hover:text-blue-800 transition p-2 hover:bg-blue-50 rounded">
                    <Edit2 size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(order.id)}
                    className="text-red-600 hover:text-red-800 transition p-2 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              {order.notes && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">備考:</span> {order.notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <p>発注書がまだありません</p>
        </div>
      )}

      {/* 最終更新時刻 */}
      <div className="mt-8 text-center text-xs text-gray-500">
        最終更新: {new Date().toLocaleTimeString('ja-JP')}
      </div>
    </div>
  );
}
