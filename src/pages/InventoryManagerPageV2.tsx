import { useDeferredValue, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { ChevronDown, ChevronUp, Edit3, ImagePlus, Plus, Search, Trash2 } from 'lucide-react';
import ErrorBanner from '@/components/ErrorBanner';
import FormField from '@/components/FormField';
import Modal from '@/components/Modal';
import { storageAPI } from '@/lib/api';
import { formatDate, formatDateTime, formatRelativeDays } from '@/lib/format';
import { matchesInventorySearch } from '@/lib/inventorySearch';
import {
  INVENTORY_CATEGORY_LABELS,
  INVENTORY_FILTERS,
  INVENTORY_LOCATION_PRESETS,
  INVENTORY_SUPPLIER_LABELS,
  INVENTORY_SUPPLIERS,
  createEmptyInventoryDraft,
  type InventoryCategory,
  type InventoryItem,
  type InventoryItemDraft,
  type InventoryLocationFieldValue,
  type StorageLocation,
  type StorageLocationDetailField,
} from '@/lib/types';

interface InventoryManagerPageProps {
  items: InventoryItem[];
  loading: boolean;
  saving: boolean;
  error: Error | null;
  lastSyncAt: string | null;
  locationOptions?: StorageLocation[];
  onCreate: (payload: InventoryItemDraft) => Promise<unknown>;
  onUpdate: (id: string, payload: InventoryItemDraft) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100';

const MAX_LOCATION_IMAGE_SIZE = 10 * 1024 * 1024;
const LOCATION_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,.heic,.heif';

function toDraft(item: InventoryItem): InventoryItemDraft {
  return {
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    minQuantity: item.minQuantity,
    expiryDate: item.expiryDate ?? '',
    supplier: item.supplier,
    locationPreset: item.locationPreset,
    locationFieldValues: item.locationFieldValues.map((field) => ({
      fieldId: field.fieldId,
      value: field.value,
    })),
    locationDetail: item.locationDetail,
    locationImagePath: item.locationImagePath,
    locationImageUrl: item.locationImageUrl,
    notes: item.notes,
  };
}

function shouldPreviewImage(path: string, mimeType = '') {
  return !/\.hei[cf]$/i.test(path) && !/heic|heif/i.test(mimeType);
}

function getFieldValue(
  values: InventoryLocationFieldValue[],
  fieldId: string,
) {
  return values.find((value) => value.fieldId === fieldId)?.value ?? '';
}

function setFieldValue(
  values: InventoryLocationFieldValue[],
  fieldId: string,
  nextValue: string,
) {
  const trimmedValue = nextValue.trim();
  const nextValues = values.filter((value) => value.fieldId !== fieldId);

  if (!trimmedValue) {
    return nextValues;
  }

  return [...nextValues, { fieldId, value: trimmedValue }];
}

function buildOrderedFieldValues(
  fields: StorageLocationDetailField[],
  values: InventoryLocationFieldValue[],
) {
  if (fields.length === 0) {
    return values
      .map((value) => ({
        fieldId: value.fieldId.trim(),
        value: value.value.trim(),
      }))
      .filter((value) => value.fieldId && value.value);
  }

  return fields
    .map((field) => ({
      fieldId: field.id,
      value: getFieldValue(values, field.id).trim(),
    }))
    .filter((value) => value.value);
}

export default function InventoryManagerPageV2({
  items,
  loading,
  saving,
  error,
  lastSyncAt,
  locationOptions = [],
  onCreate,
  onUpdate,
  onDelete,
}: InventoryManagerPageProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<InventoryCategory | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<InventoryItemDraft>(createEmptyInventoryDraft());
  const [isLocationDetailsOpen, setIsLocationDetailsOpen] = useState(false);
  const [selectedLocationImage, setSelectedLocationImage] = useState<File | null>(null);
  const [selectedLocationImagePreview, setSelectedLocationImagePreview] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const deferredSearch = useDeferredValue(search);
  const availableLocationPresets = useMemo(() => {
    const source = locationOptions.length > 0 ? locationOptions.map((location) => location.name) : [...INVENTORY_LOCATION_PRESETS];
    const values = new Set(source.map((location) => location.trim()).filter(Boolean));
    const currentLocation = form.locationPreset.trim();

    if (currentLocation) {
      values.add(currentLocation);
    }

    return Array.from(values);
  }, [form.locationPreset, locationOptions]);

  const selectedStorageLocation = useMemo(
    () => locationOptions.find((location) => location.name.trim() === form.locationPreset.trim()) ?? null,
    [form.locationPreset, locationOptions],
  );
  const selectedLocationFields = selectedStorageLocation?.detailFields ?? [];

  useEffect(() => {
    if (!selectedLocationImage) {
      setSelectedLocationImagePreview(null);
      return;
    }

    const previewUrl = URL.createObjectURL(selectedLocationImage);
    setSelectedLocationImagePreview(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [selectedLocationImage]);

  const filteredItems = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();

    return [...items]
      .filter((item) => category === 'all' || item.category === category)
      .filter((item) => {
        return matchesInventorySearch(item, keyword);
      })
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  }, [category, deferredSearch, items]);

  const openCreateModal = () => {
    setEditingItem(null);
    setForm(createEmptyInventoryDraft());
    setSelectedLocationImage(null);
    setIsLocationDetailsOpen(false);
    setFileInputKey((current) => current + 1);
    setIsModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    const nextLocation = locationOptions.find(
      (location) => location.name.trim() === item.locationPreset.trim(),
    );

    setEditingItem(item);
    setForm(toDraft(item));
    setSelectedLocationImage(null);
    setIsLocationDetailsOpen(
      Boolean(item.locationDetail || item.locationImagePath || item.locationFieldValues.length > 0 || nextLocation?.detailFields.length),
    );
    setFileInputKey((current) => current + 1);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setIsModalOpen(false);
    setEditingItem(null);
    setForm(createEmptyInventoryDraft());
    setSelectedLocationImage(null);
    setSelectedLocationImagePreview(null);
    setIsLocationDetailsOpen(false);
    setFileInputKey((current) => current + 1);
  };

  const updateField = <K extends keyof InventoryItemDraft,>(field: K, value: InventoryItemDraft[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateLocationFieldValue = (fieldId: string, value: string) => {
    setForm((current) => ({
      ...current,
      locationFieldValues: setFieldValue(current.locationFieldValues, fieldId, value),
    }));
  };

  const handleLocationPresetChange = (value: string) => {
    const nextLocation = locationOptions.find((location) => location.name.trim() === value.trim());

    setForm((current) => ({
      ...current,
      locationPreset: value,
      locationFieldValues: [],
    }));

    if (nextLocation && nextLocation.detailFields.length > 0) {
      setIsLocationDetailsOpen(true);
    }
  };

  const handleLocationImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedLocationImage(null);
      return;
    }

    if (file.size > MAX_LOCATION_IMAGE_SIZE) {
      window.alert('保管場所画像は10MB以下にしてください。');
      setFileInputKey((current) => current + 1);
      return;
    }

    setSelectedLocationImage(file);
    setIsLocationDetailsOpen(true);
  };

  const clearLocationImage = () => {
    setSelectedLocationImage(null);
    updateField('locationImagePath', '');
    updateField('locationImageUrl', null);
    setFileInputKey((current) => current + 1);
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

    let uploadedLocationImagePath = '';
    let nextLocationImagePath = form.locationImagePath.trim();
    let nextLocationImageUrl = form.locationImageUrl;

    try {
      if (selectedLocationImage) {
        const uploadedImage = await storageAPI.uploadInventoryLocationImage(
          selectedLocationImage,
          editingItem?.id ?? null,
        );
        uploadedLocationImagePath = uploadedImage.path;
        nextLocationImagePath = uploadedImage.path;
        nextLocationImageUrl = uploadedImage.publicUrl;
      }

      const payload: InventoryItemDraft = {
        ...form,
        name: form.name.trim(),
        unit: form.unit.trim(),
        expiryDate: form.expiryDate.trim(),
        locationPreset: form.locationPreset.trim(),
        locationFieldValues: buildOrderedFieldValues(selectedLocationFields, form.locationFieldValues),
        locationDetail: form.locationDetail.trim(),
        locationImagePath: nextLocationImagePath,
        locationImageUrl: nextLocationImageUrl,
        notes: form.notes.trim(),
      };

      if (editingItem) {
        await onUpdate(editingItem.id, payload);
      } else {
        await onCreate(payload);
      }

      const previousLocationImagePath = editingItem?.locationImagePath ?? '';
      if (previousLocationImagePath && previousLocationImagePath !== nextLocationImagePath) {
        void storageAPI.deleteInventoryLocationImage(previousLocationImagePath).catch(() => undefined);
      }

      closeModal();
    } catch (submitError) {
      if (uploadedLocationImagePath) {
        void storageAPI.deleteInventoryLocationImage(uploadedLocationImagePath).catch(() => undefined);
      }

      window.alert(submitError instanceof Error ? submitError.message : '試薬を保存できませんでした。');
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    const confirmed = window.confirm(`共有在庫から「${item.name}」を削除しますか？`);

    if (!confirmed) {
      return;
    }

    try {
      await onDelete(item.id);
      if (item.locationImagePath) {
        void storageAPI.deleteInventoryLocationImage(item.locationImagePath).catch(() => undefined);
      }
    } catch (deleteError) {
      window.alert(deleteError instanceof Error ? deleteError.message : '試薬を削除できませんでした。');
    }
  };

  const selectedLocationImageLabel = selectedLocationImage?.name
    ?? (form.locationImagePath ? '登録済みの画像があります' : '選択されていません');
  const locationImagePreviewSource = selectedLocationImagePreview ?? form.locationImageUrl;
  const locationImagePreviewPath = selectedLocationImage?.name || form.locationImagePath;
  const canPreviewLocationImage = Boolean(locationImagePreviewSource)
    && shouldPreviewImage(locationImagePreviewPath, selectedLocationImage?.type ?? '');

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      {error && <ErrorBanner message={error.message} />}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm tracking-[0.24em] text-slate-400">INVENTORY</p>
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
          <table className="min-w-full table-fixed md:table-auto">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                <th className="w-[34%] px-4 py-4 sm:px-6">試薬</th>
                <th className="hidden px-4 py-4 md:table-cell md:w-[14%] md:px-6">カテゴリ</th>
                <th className="w-[22%] px-4 py-4 sm:px-6 md:w-[16%]">在庫数</th>
                <th className="w-[24%] px-4 py-4 sm:px-6 md:w-[16%]">使用期限</th>
                <th className="hidden px-4 py-4 lg:table-cell lg:w-[14%] lg:px-6">保管場所</th>
                <th className="hidden px-4 py-4 xl:table-cell xl:w-[16%] xl:px-6">更新日時</th>
                <th className="hidden px-4 py-4 text-right md:table-cell md:w-[12%] md:px-6">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    在庫データを読み込み中...
                  </td>
                </tr>
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const lowStock = item.quantity <= item.minQuantity;

                  return (
                    <tr key={item.id} className="align-top text-slate-700">
                      <td className="px-4 py-4 sm:px-6">
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="break-words font-medium text-slate-900">{item.name}</div>
                            <div className="mt-2 md:hidden">
                              <span className="inline-flex whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                                {INVENTORY_CATEGORY_LABELS[item.category]}
                              </span>
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-2 md:hidden">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              aria-label={`${item.name} を編集`}
                              title="編集"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-50"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(item)}
                              aria-label={`${item.name} を削除`}
                              title="削除"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 transition hover:bg-rose-50"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">発注元: {INVENTORY_SUPPLIER_LABELS[item.supplier]}</div>
                        <div className="mt-1 text-xs text-slate-500 lg:hidden">
                          保管場所: {item.location || '未設定'}
                        </div>
                        {item.locationImageUrl && (
                          <a
                            href={item.locationImageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex text-xs font-medium text-blue-600 transition hover:text-blue-700 lg:hidden"
                          >
                            保管場所画像を開く
                          </a>
                        )}
                        <div className="mt-1 text-xs text-slate-500">{item.notes || 'メモなし'}</div>
                      </td>
                      <td className="hidden px-4 py-4 md:table-cell md:px-6">
                        <span className="inline-flex whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          {INVENTORY_CATEGORY_LABELS[item.category]}
                        </span>
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        <div className="break-words font-medium text-slate-900">
                          {item.quantity} {item.unit}
                        </div>
                        <div className={`mt-1 text-xs ${lowStock ? 'text-amber-600' : 'text-slate-500'}`}>
                          最低 {item.minQuantity} {item.unit}
                        </div>
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        <div className="break-words">{formatDate(item.expiryDate)}</div>
                        <div className="mt-1 text-xs text-slate-500">{formatRelativeDays(item.expiryDate)}</div>
                      </td>
                      <td className="hidden px-4 py-4 lg:table-cell lg:px-6">
                        <div className="break-words">{item.location || '-'}</div>
                        {item.locationImageUrl && (
                          <a
                            href={item.locationImageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex text-xs font-medium text-blue-600 transition hover:text-blue-700"
                          >
                            保管場所画像を開く
                          </a>
                        )}
                      </td>
                      <td className="hidden px-4 py-4 text-slate-500 xl:table-cell xl:px-6">{formatDateTime(item.updatedAt)}</td>
                      <td className="hidden px-4 py-4 md:table-cell md:px-6">
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
        description="変更内容は共有ワークスペースに保存され、メンバー全員に同期されます。"
        footer={(
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500">
              在庫アラートは現在数量と最低在庫数をもとに表示されます。
            </div>
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
                {saving ? '保存中...' : editingItem ? '変更を保存' : '試薬を追加'}
              </button>
            </div>
          </div>
        )}
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

          <FormField label="発注元">
            <select
              value={form.supplier}
              onChange={(event) => updateField('supplier', event.target.value as InventoryItemDraft['supplier'])}
              className={inputClassName}
            >
              {INVENTORY_SUPPLIERS.map((supplier) => (
                <option key={supplier} value={supplier}>
                  {INVENTORY_SUPPLIER_LABELS[supplier]}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="保管場所" hint="候補にない場所はあとから管理画面で追加できます。">
                <select
                  value={form.locationPreset}
                  onChange={(event) => handleLocationPresetChange(event.target.value)}
                  className={inputClassName}
                >
                  <option value="">保管場所を選択</option>
                  {availableLocationPresets.map((locationPreset) => (
                    <option key={locationPreset} value={locationPreset}>
                      {locationPreset}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => setIsLocationDetailsOpen((current) => !current)}
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-slate-50"
              >
                <div>
                  <div className="text-base font-semibold text-slate-900">保管場所の詳細</div>
                  <p className="mt-1 text-sm text-slate-500">
                    段や左右などを場所ごとに分けて指定できます。必要なら補足や画像も追加できます。
                  </p>
                </div>
                {isLocationDetailsOpen ? (
                  <ChevronUp className="shrink-0 text-slate-500" size={20} />
                ) : (
                  <ChevronDown className="shrink-0 text-slate-500" size={20} />
                )}
              </button>

              {isLocationDetailsOpen && (
                <div className="border-t border-slate-200 px-4 py-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {selectedLocationFields.map((field) => (
                      <FormField key={field.id} label={field.label}>
                        <select
                          value={getFieldValue(form.locationFieldValues, field.id)}
                          onChange={(event) => updateLocationFieldValue(field.id, event.target.value)}
                          className={inputClassName}
                        >
                          <option value="">{field.label}を選択</option>
                          {field.options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </FormField>
                    ))}

                    <FormField
                      label={selectedLocationFields.length > 0 ? '補足 / 自由記述' : '詳細 / 補足'}
                      hint={
                        selectedLocationFields.length > 0
                          ? 'プルダウンにない細かい情報はここに記入できます。'
                          : '例: 上から2段目、右奥、青いケース'
                      }
                    >
                      <input
                        value={form.locationDetail}
                        onChange={(event) => updateField('locationDetail', event.target.value)}
                        className={inputClassName}
                      />
                    </FormField>

                    <div className="md:col-span-2">
                      <FormField label="保管場所画像" hint="JPEG, PNG, WEBP, HEIC (最大10MB)">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100">
                              <ImagePlus size={16} />
                              ファイルを選択
                              <input
                                key={fileInputKey}
                                type="file"
                                accept={LOCATION_IMAGE_ACCEPT}
                                onChange={handleLocationImageChange}
                                className="sr-only"
                              />
                            </label>
                            <div className="text-sm text-slate-500">{selectedLocationImageLabel}</div>
                          </div>

                          {(form.locationImagePath || selectedLocationImage) && (
                            <button
                              type="button"
                              onClick={clearLocationImage}
                              className="mt-3 inline-flex rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-white"
                            >
                              画像を外す
                            </button>
                          )}

                          {canPreviewLocationImage && locationImagePreviewSource && (
                            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                              <img
                                src={locationImagePreviewSource}
                                alt="保管場所プレビュー"
                                className="h-44 w-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      </FormField>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

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
