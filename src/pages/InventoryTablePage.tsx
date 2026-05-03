import { useCallback, useMemo, useState } from 'react';
import { Edit2, Plus, Search, Trash2 } from 'lucide-react';
import ErrorBanner from '@/components/ErrorBanner';
import { useData } from '@/hooks/useData';
import { storageAPI } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { matchesInventorySearch } from '@/lib/inventorySearch';
import {
  INVENTORY_CATEGORY_LABELS,
  INVENTORY_FILTERS,
  type InventoryCategory,
} from '@/lib/types';

function showFeatureNotice() {
  window.alert('This update focuses on shared sync. Add and edit forms can be added next.');
}

export default function InventoryTablePage() {
  const fetchInventory = useCallback(() => storageAPI.getInventory(), []);
  const { data: inventory, loading, error, refetch } = useData(fetchInventory, { refreshInterval: 4000 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory | 'all'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const items = inventory ?? [];
    const normalizedSearch = searchTerm.trim();

    return items.filter((item) => {
      const matchesSearch = matchesInventorySearch(item, normalizedSearch);
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchTerm, selectedCategory]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this item?')) {
      return;
    }

    try {
      setDeletingId(id);
      await storageAPI.deleteInventoryItem(id);
      await refetch();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Delete failed.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
        <button
          onClick={showFeatureNotice}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus size={20} />
          New Item
        </button>
      </div>

      {error && <ErrorBanner message={error.message} />}

      <div className="mb-6 rounded-lg bg-white p-4 shadow">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by item, location, or note..."
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
        <div className="py-12 text-center text-gray-500">Loading...</div>
      ) : filteredItems.length > 0 ? (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Category</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Quantity</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Min</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Expiry</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Location</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
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
                        <span className="ml-2 font-semibold text-red-600">Low</span>
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
                          aria-label={`Edit ${item.name}`}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => void handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="text-red-600 transition hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Delete ${item.name}`}
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
        <div className="py-12 text-center text-gray-500">No inventory items match this filter</div>
      )}

      <div className="mt-8 text-center text-xs text-gray-500">Shared data syncs automatically every 4 seconds</div>
    </div>
  );
}
