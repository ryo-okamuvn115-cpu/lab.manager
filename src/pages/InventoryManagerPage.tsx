import { useDeferredValue, useMemo, useState } from 'react';
import { Edit3, Plus, Search, Trash2 } from 'lucide-react';
import ErrorBanner from '@/components/ErrorBanner';
import FormField from '@/components/FormField';
import Modal from '@/components/Modal';
import { formatDate, formatDateTime, formatRelativeDays } from '@/lib/format';
import {
  INVENTORY_CATEGORY_LABELS,
  INVENTORY_FILTERS,
  createEmptyInventoryDraft,
  type InventoryCategory,
  type InventoryItem,
  type InventoryItemDraft,
} from '@/lib/types';

interface InventoryManagerPageProps {
  items: InventoryItem[];
  loading: boolean;
  saving: boolean;
  error: Error | null;
  lastSyncAt: string | null;
  onCreate: (payload: InventoryItemDraft) => Promise<unknown>;
  onUpdate: (id: string, payload: InventoryItemDraft) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100';

function toDraft(item: InventoryItem): InventoryItemDraft {
  return {
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    minQuantity: item.minQuantity,
    expiryDate: item.expiryDate ?? '',
    location: item.location,
    notes: item.notes,
  };
}

export default function InventoryManagerPage({
  items,
  loading,
  saving,
  error,
  lastSyncAt,
  onCreate,
  onUpdate,
  onDelete,
}: InventoryManagerPageProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<InventoryCategory | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<InventoryItemDraft>(createEmptyInventoryDraft());

  const deferredSearch = useDeferredValue(search);

  const filteredItems = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();

    return [...items]
      .filter((item) => category === 'all' || item.category === category)
      .filter((item) => {
        if (!keyword) {
          return true;
        }

        return [item.name, item.location, item.notes]
          .join(' ')
          .toLowerCase()
          .includes(keyword);
      })
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  }, [category, deferredSearch, items]);

  const openCreateModal = () => {
    setEditingItem(null);
    setForm(createEmptyInventoryDraft());
    setIsModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setForm(toDraft(item));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setIsModalOpen(false);
    setEditingItem(null);
    setForm(createEmptyInventoryDraft());
  };

  const updateField = <K extends keyof InventoryItemDraft,>(field: K, value: InventoryItemDraft[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitForm = async () => {
    if (!form.name.trim()) {
      window.alert('試薬名は必須です。');
      return;
    }

    if (!form.unit.trim()) {
      window.alert('単位は必須です。');
      return;
    }

    if (form.quantity < 0 || form.minQuantity < 0) {
      window.alert('数量は0以上で入力してください。');
      return;
    }

    const payload: InventoryItemDraft = {
      ...form,
      name: form.name.trim(),
      unit: form.unit.trim(),
      location: form.location.trim(),
      notes: form.notes.trim(),
      expiryDate: form.expiryDate.trim(),
    };

    try {
      if (editingItem) {
        await onUpdate(editingItem.id, payload);
      } else {
        await onCreate(payload);
      }

      closeModal();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '試薬を保存できませんでした。');
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    const confirmed = window.confirm(`共有在庫から「${item.name}」を削除しますか？`);

    if (!confirmed) {
      return;
    }

    try {
      await onDelete(item.id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '試薬を削除できませんでした。');
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      {error && <ErrorBanner message={error.message} />}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm tracking-[0.24em] text-slate-400">在庫</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">共有試薬在庫</h2>
          <p className="mt-2 text-sm text-slate-500">
            最終同期: {formatDateTime(lastSyncAt)} {saving ? ' / 保存中...' : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus size={18} />
          試薬を追加
        </button>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:grid-cols-[1fr_220px]">
        <label className="relative block">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="名前・メモ・保管場所で検索"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />
        </label>

        <select
          value={category}
          onChange={(event) => setCategory(event.target.value as InventoryCategory | 'all')}
          className={inputClassName}
        >
          {INVENTORY_FILTERS.map((filter) => (
            <option key={filter} value={filter}>
              {INVENTORY_CATEGORY_LABELS[filter]}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                <th className="px-6 py-4">試薬</th>
                <th className="px-6 py-4">カテゴリ</th>
                <th className="px-6 py-4">在庫数</th>
                <th className="px-6 py-4">使用期限</th>
                <th className="px-6 py-4">保管場所</th>
                <th className="px-6 py-4">更新日時</th>
                <th className="px-6 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    共有在庫を読み込み中...
                  </td>
                </tr>
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const lowStock = item.quantity <= item.minQuantity;

                  return (
                    <tr key={item.id} className="align-top text-slate-700">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{item.name}</div>
                        <div className="mt-1 text-xs text-slate-500">{item.notes || 'メモなし'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          {INVENTORY_CATEGORY_LABELS[item.category]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">
                          {item.quantity} {item.unit}
                        </div>
                        <div className={`mt-1 text-xs ${lowStock ? 'text-amber-600' : 'text-slate-500'}`}>
                          最低 {item.minQuantity} {item.unit}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>{formatDate(item.expiryDate)}</div>
                        <div className="mt-1 text-xs text-slate-500">{formatRelativeDays(item.expiryDate)}</div>
                      </td>
                      <td className="px-6 py-4">{item.location || '-'}</td>
                      <td className="px-6 py-4 text-slate-500">{formatDateTime(item.updatedAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-600 transition hover:bg-slate-50"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(item)}
                            className="rounded-lg border border-rose-200 px-3 py-2 text-rose-600 transition hover:bg-rose-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    条件に一致する在庫はありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title={editingItem ? '試薬を編集' : '試薬を追加'}
        description="変更内容は共有サーバーに保存され、全員に同期されます。"
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              在庫アラートは現在数量と最低在庫数をもとに表示されます。
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => void submitForm()}
                disabled={saving}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? '保存中...' : editingItem ? '変更を保存' : '追加する'}
              </button>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="試薬名">
            <input
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              className={inputClassName}
            />
          </FormField>

          <FormField label="カテゴリ">
            <select
              value={form.category}
              onChange={(event) => updateField('category', event.target.value as InventoryCategory)}
              className={inputClassName}
            >
              {INVENTORY_FILTERS.filter((filter): filter is InventoryCategory => filter !== 'all').map((filter) => (
                <option key={filter} value={filter}>
                  {INVENTORY_CATEGORY_LABELS[filter]}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="数量">
            <input
              type="number"
              min={0}
              value={form.quantity}
              onChange={(event) => updateField('quantity', Number(event.target.value))}
              className={inputClassName}
            />
          </FormField>

          <FormField label="単位" hint="例: 本、バイアル、mL、g">
            <input
              value={form.unit}
              onChange={(event) => updateField('unit', event.target.value)}
              className={inputClassName}
            />
          </FormField>

          <FormField label="最低在庫数">
            <input
              type="number"
              min={0}
              value={form.minQuantity}
              onChange={(event) => updateField('minQuantity', Number(event.target.value))}
              className={inputClassName}
            />
          </FormField>

          <FormField label="使用期限">
            <input
              type="date"
              value={form.expiryDate}
              onChange={(event) => updateField('expiryDate', event.target.value)}
              className={inputClassName}
            />
          </FormField>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4">
          <FormField label="保管場所">
            <input
              value={form.location}
              onChange={(event) => updateField('location', event.target.value)}
              className={inputClassName}
            />
          </FormField>

          <FormField label="メモ">
            <textarea
              rows={4}
              value={form.notes}
              onChange={(event) => updateField('notes', event.target.value)}
              className={inputClassName}
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
