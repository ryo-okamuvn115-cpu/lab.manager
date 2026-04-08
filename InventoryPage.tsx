import { useState } from 'react';
import { Plus, Trash2, Edit2, Search } from 'lucide-react';
import { useData } from '../hooks/useData';
import { storageAPI } from '../lib/storage';

export default function InventoryPage() {
  const { data: inventory, loading, refetch } = useData(() => storageAPI.getInventory());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredItems = (inventory || []).filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', 'protein', 'antibody', 'reagent', 'other'];
  const categoryLabels: Record<string, string> = {
    all: 'すべて',
    protein: 'タンパク質',
    antibody: '抗体',
    reagent: '試薬',
    other: 'その他',
  };

  const handleDelete = (id: string) => {
    if (confirm('このアイテムを削除しますか？')) {
      storageAPI.deleteInventoryItem(id);
      refetch();
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">在庫管理</h1>
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition">
          <Plus size={20} />
          新しい在庫を追加
        </button>
      </div>

      {/* 検索・フィルター */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="在庫名で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {categoryLabels[cat]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 在庫一覧 */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">読み込み中...</div>
      ) : filteredItems.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">名前</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">カテゴリ</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">数量</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">最小数量</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">有効期限</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">場所</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                      {categoryLabels[item.category]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {item.quantity} {item.unit}
                    {item.quantity <= item.minQuantity && (
                      <span className="ml-2 text-red-600 font-semibold">⚠️ 少</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.minQuantity} {item.unit}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(item.expiryDate).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.location}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <button className="text-blue-600 hover:text-blue-800 transition">
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-800 transition"
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
      ) : (
        <div className="text-center py-12 text-gray-500">
          <p>在庫がまだありません</p>
        </div>
      )}

      {/* 最終更新時刻 */}
      <div className="mt-8 text-center text-xs text-gray-500">
        最終更新: {new Date().toLocaleTimeString('ja-JP')}
      </div>
    </div>
  );
}
