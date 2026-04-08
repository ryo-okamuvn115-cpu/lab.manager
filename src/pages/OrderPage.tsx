import { useCallback, useState } from 'react';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import ErrorBanner from '@/components/ErrorBanner';
import { useData } from '@/hooks/useData';
import { storageAPI } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';
import { ORDER_STATUS_LABELS, type Order } from '@/lib/types';

const ORDER_STATUS_COLORS: Record<Order['status'], string> = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  received: 'bg-green-100 text-green-800',
};

function showFeatureNotice() {
  window.alert('今回の更新では共有同期を優先しているため、追加・編集フォームは次の段階で実装できます。');
}

export default function OrderPage() {
  const fetchOrders = useCallback(() => storageAPI.getOrders(), []);
  const { data: orders, loading, error, refetch } = useData(fetchOrders, { refreshInterval: 4000 });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!window.confirm('この発注書を削除しますか？')) {
      return;
    }

    try {
      setDeletingId(id);
      await storageAPI.deleteOrder(id);
      await refetch();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '削除に失敗しました。');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">発注書</h1>
        <button
          onClick={showFeatureNotice}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white transition hover:bg-green-700"
        >
          <Plus size={20} />
          新しい発注書を作成
        </button>
      </div>

      {error && <ErrorBanner message={error.message} />}

      {loading ? (
        <div className="py-12 text-center text-gray-500">読み込み中...</div>
      ) : (orders ?? []).length > 0 ? (
        <div className="space-y-4">
          {orders!.map((order) => (
            <div key={order.id} className="rounded-lg bg-white p-6 shadow transition hover:shadow-md">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{order.orderNumber}</h3>
                  <p className="text-sm text-gray-500">作成日: {formatDate(order.createdAt)}</p>
                </div>
                <span
                  className={`inline-flex rounded px-3 py-1 text-sm font-semibold ${ORDER_STATUS_COLORS[order.status]}`}
                >
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </div>

              <div className="mb-4 rounded bg-gray-50 p-4">
                <h4 className="mb-2 font-semibold text-gray-900">発注内容</h4>
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between gap-4 text-sm text-gray-700">
                      <span>
                        {item.itemName} × {item.quantity}
                      </span>
                      <span>{formatCurrency(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-600">合計金額</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(order.totalAmount)}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={showFeatureNotice}
                    className="rounded p-2 text-blue-600 transition hover:bg-blue-50 hover:text-blue-800"
                    aria-label={`${order.orderNumber} を編集`}
                  >
                    <Edit2 size={20} />
                  </button>
                  <button
                    onClick={() => void handleDelete(order.id)}
                    disabled={deletingId === order.id}
                    className="rounded p-2 text-red-600 transition hover:bg-red-50 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`${order.orderNumber} を削除`}
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              {order.notes && (
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">メモ:</span> {order.notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-gray-500">発注書はまだありません</div>
      )}

      <div className="mt-8 text-center text-xs text-gray-500">共有データは4秒ごとに自動同期されます</div>
    </div>
  );
}
