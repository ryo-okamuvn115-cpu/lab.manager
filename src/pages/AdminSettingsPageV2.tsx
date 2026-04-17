import { useMemo, useState } from 'react';
import { Edit3, MapPin, Plus, Trash2 } from 'lucide-react';
import ErrorBanner from '@/components/ErrorBanner';
import FormField from '@/components/FormField';
import Modal from '@/components/Modal';
import { formatDateTime } from '@/lib/format';
import {
  createStorageLocationDetailField,
  createEmptyStorageLocationDraft,
  type InventoryItem,
  type StorageLocation,
  type StorageLocationDetailField,
  type StorageLocationDraft,
} from '@/lib/types';

interface AdminSettingsPageProps {
  locations: StorageLocation[];
  inventoryItems: InventoryItem[];
  loading: boolean;
  saving: boolean;
  error: Error | null;
  lastSyncAt: string | null;
  onCreateLocation: (payload: StorageLocationDraft) => Promise<unknown>;
  onUpdateLocation: (id: string, payload: StorageLocationDraft, previousName?: string) => Promise<unknown>;
  onDeleteLocation: (id: string) => Promise<unknown>;
}

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100';

function parseOptionsText(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\r?\n/)
        .map((option) => option.trim())
        .filter(Boolean),
    ),
  );
}

function formatOptionsText(options: string[]) {
  return options.join('\n');
}

function normalizeDetailFields(fields: StorageLocationDetailField[]) {
  return fields
    .map((field) => ({
      ...field,
      label: field.label.trim(),
      options: parseOptionsText(formatOptionsText(field.options)),
    }))
    .filter((field) => field.label);
}

function toDraft(location: StorageLocation): StorageLocationDraft {
  return {
    name: location.name,
    details: location.details,
    detailFields: location.detailFields.map((field) => ({
      id: field.id,
      label: field.label,
      options: [...field.options],
    })),
    sortOrder: location.sortOrder,
    isActive: location.isActive,
  };
}

export default function AdminSettingsPageV2({
  locations,
  inventoryItems,
  loading,
  saving,
  error,
  lastSyncAt,
  onCreateLocation,
  onUpdateLocation,
  onDeleteLocation,
}: AdminSettingsPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StorageLocation | null>(null);
  const [form, setForm] = useState<StorageLocationDraft>(createEmptyStorageLocationDraft());

  const usageByLocation = useMemo(() => {
    const counts = new Map<string, number>();

    inventoryItems.forEach((item) => {
      const key = item.locationPreset.trim();
      if (!key) {
        return;
      }

      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return counts;
  }, [inventoryItems]);

  const sortedLocations = useMemo(
    () => [...locations].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'ja')),
    [locations],
  );

  const openCreateModal = () => {
    const nextSortOrder =
      sortedLocations.length > 0
        ? Math.max(...sortedLocations.map((location) => location.sortOrder)) + 10
        : 10;

    setEditingLocation(null);
    setForm({
      ...createEmptyStorageLocationDraft(),
      sortOrder: nextSortOrder,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (location: StorageLocation) => {
    setEditingLocation(location);
    setForm(toDraft(location));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setIsModalOpen(false);
    setEditingLocation(null);
    setForm(createEmptyStorageLocationDraft());
  };

  const updateField = <K extends keyof StorageLocationDraft,>(
    field: K,
    value: StorageLocationDraft[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateDetailField = (
    fieldId: string,
    patch: Partial<StorageLocationDetailField>,
  ) => {
    setForm((current) => ({
      ...current,
      detailFields: current.detailFields.map((field) =>
        field.id === fieldId
          ? {
              ...field,
              ...patch,
            }
          : field,
      ),
    }));
  };

  const addDetailField = () => {
    setForm((current) => ({
      ...current,
      detailFields: [...current.detailFields, createStorageLocationDetailField()],
    }));
  };

  const removeDetailField = (fieldId: string) => {
    setForm((current) => ({
      ...current,
      detailFields: current.detailFields.filter((field) => field.id !== fieldId),
    }));
  };

  const submitForm = async () => {
    if (!form.name.trim()) {
      window.alert('保管場所名は必須です。');
      return;
    }

    const payload: StorageLocationDraft = {
      name: form.name.trim(),
      details: form.details.trim(),
      detailFields: normalizeDetailFields(form.detailFields),
      sortOrder: Number.isFinite(Number(form.sortOrder)) ? Number(form.sortOrder) : 0,
      isActive: form.isActive,
    };

    try {
      if (editingLocation) {
        await onUpdateLocation(editingLocation.id, payload, editingLocation.name);
      } else {
        await onCreateLocation(payload);
      }

      closeModal();
    } catch (submitError) {
      window.alert(submitError instanceof Error ? submitError.message : '保管場所を保存できませんでした。');
    }
  };

  const handleDelete = async (location: StorageLocation) => {
    const usageCount = usageByLocation.get(location.name) ?? 0;
    const confirmed = window.confirm(
      usageCount > 0
        ? `「${location.name}」は ${usageCount} 件の在庫で使用中です。削除すると今後の候補からは外れます。削除しますか？`
        : `「${location.name}」を削除しますか？`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await onDeleteLocation(location.id);
    } catch (deleteError) {
      window.alert(deleteError instanceof Error ? deleteError.message : '保管場所を削除できませんでした。');
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      {error && <ErrorBanner message={error.message} />}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm tracking-[0.24em] text-slate-400">MANAGEMENT</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">保管場所管理</h2>
          <p className="mt-2 text-sm text-slate-500">
            最終同期: {formatDateTime(lastSyncAt)} {saving ? ' / 保存中...' : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus size={18} />
          保管場所を追加
        </button>
      </div>

      <div className="mb-5 rounded-3xl bg-slate-900 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">管理者が構造を編集できます</h3>
            <p className="mt-1 text-sm leading-6 text-slate-300">
              各保管場所ごとに「段」「左右」「上下」「列」などの入力項目を定義できます。在庫登録画面ではここで設定した順にプルダウンが表示されます。
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-slate-200">
            有効な候補: {locations.filter((location) => location.isActive).length} 件
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        {loading ? (
          <div className="px-6 py-12 text-center text-slate-500">保管場所データを読み込み中...</div>
        ) : sortedLocations.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {sortedLocations.map((location) => {
              const usageCount = usageByLocation.get(location.name) ?? 0;

              return (
                <div key={location.id} className="grid gap-4 px-5 py-5 md:grid-cols-[1fr_auto] md:items-center md:px-6">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <MapPin size={18} className="text-blue-500" />
                      <h3 className="break-words text-base font-semibold text-slate-900">{location.name}</h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          location.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {location.isActive ? '有効' : '無効'}
                      </span>
                    </div>

                    {location.details && (
                      <p className="mt-2 break-words text-sm leading-6 text-slate-500">{location.details}</p>
                    )}

                    {location.detailFields.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {location.detailFields.map((field) => (
                          <span
                            key={field.id}
                            className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                          >
                            {field.label} ({field.options.length})
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-50 px-2.5 py-1">表示順: {location.sortOrder}</span>
                      <span className="rounded-full bg-slate-50 px-2.5 py-1">入力項目: {location.detailFields.length} 件</span>
                      <span className="rounded-full bg-slate-50 px-2.5 py-1">使用中在庫: {usageCount} 件</span>
                      <span className="rounded-full bg-slate-50 px-2.5 py-1">更新: {formatDateTime(location.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 md:justify-end">
                    <button
                      type="button"
                      onClick={() => openEditModal(location)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 md:flex-none"
                    >
                      <Edit3 size={16} />
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(location)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 md:flex-none"
                    >
                      <Trash2 size={16} />
                      削除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-slate-500">
            保管場所がまだ登録されていません。右上の追加ボタンから作成できます。
          </div>
        )}
      </div>

      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title={editingLocation ? '保管場所を編集' : '保管場所を追加'}
        description="ここで設定した入力項目が、そのまま在庫登録画面のプルダウンとして使われます。"
        footer={(
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeModal}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={() => void submitForm()}
              disabled={saving}
              className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {saving ? '保存中...' : editingLocation ? '変更を保存' : '追加する'}
            </button>
          </div>
        )}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="保管場所名">
            <input
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              placeholder="例: -80℃冷凍庫47"
              className={inputClassName}
            />
          </FormField>

          <FormField label="表示順" hint="小さい数字ほど上に表示されます。">
            <input
              type="number"
              value={form.sortOrder}
              onChange={(event) => updateField('sortOrder', Number(event.target.value))}
              className={inputClassName}
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField label="説明 / 補足">
              <textarea
                rows={3}
                value={form.details}
                onChange={(event) => updateField('details', event.target.value)}
                placeholder="例: 培養室前、青いラベル、右側の列"
                className={inputClassName}
              />
            </FormField>
          </div>

          <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">庫内入力項目</h3>
                <p className="mt-1 text-sm text-slate-500">
                  例: 段、左右、上下、列。選択肢は1行に1つずつ入力します。
                </p>
              </div>
              <button
                type="button"
                onClick={addDetailField}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Plus size={16} />
                項目を追加
              </button>
            </div>

            {form.detailFields.length > 0 ? (
              <div className="mt-4 space-y-4">
                {form.detailFields.map((field, index) => (
                  <div key={field.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div className="text-sm font-medium text-slate-700">項目 {index + 1}</div>
                      <button
                        type="button"
                        onClick={() => removeDetailField(field.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                      >
                        <Trash2 size={14} />
                        削除
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField label="項目名">
                        <input
                          value={field.label}
                          onChange={(event) => updateDetailField(field.id, { label: event.target.value })}
                          placeholder="例: 段"
                          className={inputClassName}
                        />
                      </FormField>

                      <FormField label="選択肢" hint="1行に1つ。例: 1段, 2段, 3段">
                        <textarea
                          rows={5}
                          value={formatOptionsText(field.options)}
                          onChange={(event) =>
                            updateDetailField(field.id, {
                              options: parseOptionsText(event.target.value),
                            })}
                          placeholder={'1段\n2段\n3段'}
                          className={inputClassName}
                        />
                      </FormField>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
                追加のプルダウンを使わない場所は、このまま空でも大丈夫です。
              </div>
            )}
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 md:col-span-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => updateField('isActive', event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            在庫登録画面の候補に表示する
          </label>
        </div>
      </Modal>
    </div>
  );
}
