import { useCallback, useMemo, useState } from 'react';
import { Edit2, Plus, Search, Trash2 } from 'lucide-react';
import ErrorBanner from '@/components/ErrorBanner';
import { useData } from '@/hooks/useData';
import { storageAPI } from '@/lib/api';
import { formatDate } from '@/lib/format';
import {
  INVENTORY_CATEGORY_LABELS,
  INVENTORY_FILTERS,
  type InventoryCategory,
} from '@/lib/types';

function showFeatureNotice() {
  window.alert('今回の更新では共有同期を優先しているため、追加・編集フォームは次の段階で実装できます。');
}

export default function InventoryPage() {
  const fetchInventory = useCallback(() => storageAPI.getInventory(), []);
  const { data: inventory, loading, error, refetch } = useData(fetchInventory, { refreshInterval: 4000 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory | 'all'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const items = inventory ?? [];
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        item.location.toLowerCase().includes(normalizedSearch) ||
        item.notes.toLowerCase().includes(normalizedSearch);
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchTerm, selectedCategory]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('このアイテムを削除しますか？')) {
      return;
    }

    try {
      setDeletingId(id);
      await storageAPI.deleteInventoryItem(id);
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
        <h1 className="text-3xl font-bold text-gray-900">在庫管理</h1>
        <button
          onClick={showFeatureNotice}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus size={20} />
          新しい在庫を追加
        </button>
      </div>

      {error && <ErrorBanner message={error.message} />}

      <div className="mb-6 rounded-lg bg-white p-4 shadow">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="試薬名・保管場所・メモで検索..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value as InventoryCategory | 'all')}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {INVENTORY_FILTERS.map((category) => (
              <option key={category} value={category}>
                {INVENTORY_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500">読み込み中...</div>
      ) : filteredItems.length > 0 ? (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">名称</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">カテゴリ</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">数量</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">最小数量</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">使用期限</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">保管場所</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                        {INVENTORY_CATEGORY_LABELS[item.category]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.quantity} {item.unit}
                      {item.quantity <= item.minQuantity && (
                        <span className="ml-2 font-semibold text-red-600">在庫少</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.minQuantity} {item.unit}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(item.expiryDate)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.location}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={showFeatureNotice}
                          className="text-blue-600 transition hover:text-blue-800"
                          aria-label={`${item.name} を編集`}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => void handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="text-red-600 transition hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`${item.name} を削除`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-gray-500">条件に一致する在庫はありません</div>
      )}

      <div className="mt-8 text-center text-xs text-gray-500">共有データは4秒ごとに自動同期されます</div>
    </div>
  );
}
