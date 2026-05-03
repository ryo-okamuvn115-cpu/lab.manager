import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Edit3, Plus, Trash2 } from 'lucide-react';
import ErrorBanner from '@/components/ErrorBanner';
import FormField from '@/components/FormField';
import Modal from '@/components/Modal';
import { formatDateTime } from '@/lib/format';
import { matchesInventorySearch } from '@/lib/inventorySearch';
import {
  createEmptyProtocolDraft,
  INVENTORY_CATEGORY_LABELS,
  INVENTORY_SUPPLIER_LABELS,
  PROTOCOL_DIFFICULTIES,
  PROTOCOL_DIFFICULTY_LABELS,
  type InventoryItem,
  type Protocol,
  type ProtocolDifficulty,
  type ProtocolDraft,
} from '@/lib/types';
import { createOrderDraftFromProtocolMaterial } from '@/lib/orders';

interface ProtocolStepFormState {
  id: string;
  title: string;
  description: string;
  duration: string;
  materials: string[];
  selectedInventoryMaterial: string;
  newMaterialInput: string;
}

interface ProtocolFormState {
  title: string;
  category: string;
  description: string;
  estimatedTime: string;
  difficulty: ProtocolDifficulty;
  steps: ProtocolStepFormState[];
}

interface ProtocolsManagerPageProps {
  protocols: Protocol[];
  inventoryItems: InventoryItem[];
  loading: boolean;
  saving: boolean;
  error: Error | null;
  lastSyncAt: string | null;
  onOpenInventory: () => void;
  onRequestOrder: (payload: ReturnType<typeof createOrderDraftFromProtocolMaterial>, notice: string) => void;
  onCreate: (payload: ProtocolDraft) => Promise<unknown>;
  onUpdate: (id: string, payload: ProtocolDraft) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}

interface MaterialLookupState {
  protocolTitle: string;
  stepTitle: string;
  materialName: string;
  matches: InventoryItem[];
}

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100';

const difficultyToneClassName: Record<ProtocolDifficulty, string> = {
  easy: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  hard: 'bg-rose-100 text-rose-700',
};

function createStepFormState(step: Partial<Omit<ProtocolStepFormState, 'id'>> = {}): ProtocolStepFormState {
  const id =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `step_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

  return {
    id,
    title: step.title ?? '',
    description: step.description ?? '',
    duration: step.duration ?? '',
    materials: step.materials ?? [],
    selectedInventoryMaterial: step.selectedInventoryMaterial ?? '',
    newMaterialInput: step.newMaterialInput ?? '',
  };
}

function toFormState(protocol: Protocol): ProtocolFormState {
  return {
    title: protocol.title,
    category: protocol.category,
    description: protocol.description,
    estimatedTime: protocol.estimatedTime,
    difficulty: protocol.difficulty,
    steps: protocol.steps.map((step) => createStepFormState({
      title: step.title,
      description: step.description,
      duration: step.duration,
      materials: step.materials,
    })),
  };
}

function emptyFormState(): ProtocolFormState {
  const draft = createEmptyProtocolDraft();

  return {
    title: draft.title,
    category: draft.category,
    description: draft.description,
    estimatedTime: draft.estimatedTime,
    difficulty: draft.difficulty,
    steps: draft.steps.map((step) => createStepFormState({
      title: step.title,
      description: step.description,
      duration: step.duration,
      materials: step.materials,
    })),
  };
}

function toDraft(form: ProtocolFormState): ProtocolDraft {
  return {
    title: form.title.trim(),
    category: form.category.trim(),
    description: form.description.trim(),
    estimatedTime: form.estimatedTime.trim(),
    difficulty: form.difficulty,
    steps: form.steps
      .map((step) => ({
        title: step.title.trim(),
        description: step.description.trim(),
        duration: step.duration.trim(),
        materials: Array.from(
          new Set(
            step.materials
              .map((material) => material.trim())
              .filter(Boolean),
          ),
        ),
      }))
      .filter((step) => step.title.length > 0 || step.description.length > 0),
  };
}

function normalizeMaterialValue(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function buildSelectableInventoryMaterials(
  inventoryNames: string[],
  selectedMaterials: string[],
) {
  const selected = new Set(selectedMaterials.map((material) => normalizeMaterialValue(material).toLowerCase()));

  return inventoryNames
    .filter((name) => {
      const normalizedName = normalizeMaterialValue(name).toLowerCase();
      return !selected.has(normalizedName);
    })
    .sort((left, right) => left.localeCompare(right, 'ja'));
}

export default function ProtocolsManagerPage({
  protocols,
  inventoryItems,
  loading,
  saving,
  error,
  lastSyncAt,
  onOpenInventory,
  onRequestOrder,
  onCreate,
  onUpdate,
  onDelete,
}: ProtocolsManagerPageProps) {
  const [expandedProtocolId, setExpandedProtocolId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<Protocol | null>(null);
  const [form, setForm] = useState<ProtocolFormState>(emptyFormState());
  const [materialLookup, setMaterialLookup] = useState<MaterialLookupState | null>(null);

  const sortedProtocols = useMemo(
    () => [...protocols].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
    [protocols],
  );

  const inventoryMaterialNames = useMemo(
    () =>
      Array.from(
        new Set(
          inventoryItems
            .map((item) => item.name.trim())
            .filter(Boolean),
        ),
      ).sort((left, right) => left.localeCompare(right, 'ja')),
    [inventoryItems],
  );

  const openCreateModal = () => {
    setEditingProtocol(null);
    setForm(emptyFormState());
    setIsModalOpen(true);
  };

  const openEditModal = (protocol: Protocol) => {
    setEditingProtocol(protocol);
    setForm(toFormState(protocol));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setIsModalOpen(false);
    setEditingProtocol(null);
    setForm(emptyFormState());
  };

  const updateStep = (id: string, patch: Partial<Omit<ProtocolStepFormState, 'id'>>) => {
    setForm((current) => ({
      ...current,
      steps: current.steps.map((step) => (step.id === id ? { ...step, ...patch } : step)),
    }));
  };

  const addMaterialToStep = (
    stepId: string,
    rawMaterial?: string,
    sourceField: 'selectedInventoryMaterial' | 'newMaterialInput' = 'selectedInventoryMaterial',
  ) => {
    setForm((current) => ({
      ...current,
      steps: current.steps.map((step) => {
        if (step.id !== stepId) {
          return step;
        }

        const nextMaterial = normalizeMaterialValue(rawMaterial ?? step[sourceField]);

        if (!nextMaterial) {
          return step;
        }

        const hasDuplicate = step.materials.some(
          (material) => normalizeMaterialValue(material).toLowerCase() === nextMaterial.toLowerCase(),
        );

        return {
          ...step,
          materials: hasDuplicate ? step.materials : [...step.materials, nextMaterial],
          selectedInventoryMaterial:
            sourceField === 'selectedInventoryMaterial' ? '' : step.selectedInventoryMaterial,
          newMaterialInput: sourceField === 'newMaterialInput' ? '' : step.newMaterialInput,
        };
      }),
    }));
  };

  const removeMaterialFromStep = (stepId: string, materialToRemove: string) => {
    setForm((current) => ({
      ...current,
      steps: current.steps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              materials: step.materials.filter((material) => material !== materialToRemove),
            }
          : step,
      ),
    }));
  };

  const openMaterialLookup = (protocolTitle: string, stepTitle: string, materialName: string) => {
    const matches = inventoryItems.filter((item) => matchesInventorySearch(item, materialName));

    setMaterialLookup({
      protocolTitle,
      stepTitle,
      materialName,
      matches,
    });
  };

  const handleOrderRequest = () => {
    if (!materialLookup) {
      return;
    }

    onRequestOrder(
      createOrderDraftFromProtocolMaterial({
        materialName: materialLookup.materialName,
        protocolTitle: materialLookup.protocolTitle,
        stepTitle: materialLookup.stepTitle,
      }),
      `プロトコル「${materialLookup.protocolTitle}」の試薬「${materialLookup.materialName}」を発注フォームに追加しました。`,
    );
    setMaterialLookup(null);
  };

  const addStep = () => {
    setForm((current) => ({
      ...current,
      steps: [...current.steps, createStepFormState()],
    }));
  };

  const removeStep = (id: string) => {
    setForm((current) => {
      const nextSteps = current.steps.filter((step) => step.id !== id);

      return {
        ...current,
        steps: nextSteps.length > 0 ? nextSteps : [createStepFormState()],
      };
    });
  };

  const submitForm = async () => {
    const hasIncompleteStep = form.steps.some((step) => {
      const hasAnyValue =
        step.title.trim() || step.description.trim() || step.duration.trim() || step.materials.length > 0;

      return Boolean(hasAnyValue) && (!step.title.trim() || !step.description.trim());
    });

    if (hasIncompleteStep) {
      window.alert('入力した手順には、タイトルと説明の両方が必要です。');
      return;
    }

    const payload = toDraft(form);

    if (!payload.title) {
      window.alert('プロトコルのタイトルは必須です。');
      return;
    }

    if (!payload.category) {
      window.alert('プロトコルのカテゴリは必須です。');
      return;
    }

    if (payload.steps.length === 0) {
      window.alert('手順を1つ以上追加してください。');
      return;
    }

    try {
      if (editingProtocol) {
        await onUpdate(editingProtocol.id, payload);
      } else {
        await onCreate(payload);
      }

      closeModal();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'プロトコルを保存できませんでした。');
    }
  };

  const handleDelete = async (protocol: Protocol) => {
    const confirmed = window.confirm(`共有ワークスペースからプロトコル「${protocol.title}」を削除しますか？`);

    if (!confirmed) {
      return;
    }

    try {
      await onDelete(protocol.id);
      setExpandedProtocolId((current) => (current === protocol.id ? null : current));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'プロトコルを削除できませんでした。');
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      {error && <ErrorBanner message={error.message} />}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm tracking-[0.24em] text-slate-400">プロトコル</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">共有実験プロトコル</h2>
          <p className="mt-2 text-sm text-slate-500">
            最終同期: {formatDateTime(lastSyncAt)} {saving ? ' / 保存中...' : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
        >
          <Plus size={18} />
          プロトコルを追加
        </button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="rounded-3xl bg-white px-6 py-12 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            共有プロトコルを読み込み中...
          </div>
        ) : sortedProtocols.length > 0 ? (
          sortedProtocols.map((protocol) => {
            const expanded = expandedProtocolId === protocol.id;

            return (
              <article key={protocol.id} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
                <div className="flex flex-col gap-4 p-6 lg:flex-row lg:items-start lg:justify-between">
                  <button
                    type="button"
                    onClick={() => setExpandedProtocolId((current) => (current === protocol.id ? null : protocol.id))}
                    className="flex flex-1 items-start justify-between gap-4 text-left"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold text-slate-900">{protocol.title}</h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${difficultyToneClassName[protocol.difficulty]}`}
                        >
                          {PROTOCOL_DIFFICULTY_LABELS[protocol.difficulty]}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        {protocol.category} / {protocol.estimatedTime || '所要時間未設定'}
                      </p>
                    </div>
                    {expanded ? <ChevronUp className="text-slate-400" size={20} /> : <ChevronDown className="text-slate-400" size={20} />}
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(protocol)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-slate-600 transition hover:bg-slate-50"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(protocol)}
                      className="rounded-lg border border-rose-200 px-3 py-2 text-rose-600 transition hover:bg-rose-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-slate-100 bg-slate-50 px-6 py-5">
                    <p className="text-sm leading-6 text-slate-700">{protocol.description || '説明なし'}</p>

                    <div className="mt-5 space-y-3">
                      {protocol.steps.map((step) => (
                        <div key={step.id} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                          <div className="flex items-start gap-4">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                              {step.stepNumber}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <h4 className="font-semibold text-slate-900">{step.title}</h4>
                                <span className="text-xs text-slate-500">{step.duration || '所要時間未設定'}</span>
                              </div>
                              <p className="mt-2 text-sm text-slate-600">{step.description}</p>
                              <div className="mt-3">
                                <div className="mb-2 text-xs font-medium text-slate-500">
                                  使用試薬 {step.materials.length > 0 ? '（クリックで保管場所）' : ''}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                {step.materials.length > 0 ? (
                                  step.materials.map((material, materialIndex) => (
                                    <button
                                      key={`${step.id}-${material}-${materialIndex}`}
                                      type="button"
                                      onClick={() => openMaterialLookup(protocol.title, step.title, material)}
                                      className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 underline underline-offset-2 transition hover:bg-blue-100 hover:text-blue-800"
                                    >
                                      {material}
                                    </button>
                                  ))
                                ) : (
                                  <span className="text-xs text-slate-500">使用材料なし</span>
                                )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 text-xs text-slate-500">更新: {formatDateTime(protocol.updatedAt)}</div>
                  </div>
                )}
              </article>
            );
          })
        ) : (
          <div className="rounded-3xl bg-white px-6 py-12 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            まだプロトコルは登録されていません。
          </div>
        )}
      </div>

      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title={editingProtocol ? 'プロトコルを編集' : 'プロトコルを追加'}
        description="更新内容は研究室のメンバー全員にすぐ共有されます。"
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500">試薬名を入力して「追加」するか、在庫候補から選んで登録できます。</div>
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
                className="w-full rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {saving ? '保存中...' : editingProtocol ? '変更を保存' : '追加する'}
              </button>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="プロトコル名">
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              className={inputClassName}
            />
          </FormField>

          <FormField label="カテゴリ">
            <input
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              className={inputClassName}
            />
          </FormField>

          <FormField label="所要時間">
            <input
              value={form.estimatedTime}
              onChange={(event) => setForm((current) => ({ ...current, estimatedTime: event.target.value }))}
              className={inputClassName}
            />
          </FormField>

          <FormField label="難易度">
            <select
              value={form.difficulty}
              onChange={(event) =>
                setForm((current) => ({ ...current, difficulty: event.target.value as ProtocolDifficulty }))
              }
              className={inputClassName}
            >
              {PROTOCOL_DIFFICULTIES.map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {PROTOCOL_DIFFICULTY_LABELS[difficulty]}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="mt-5">
          <FormField label="説明">
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className={inputClassName}
            />
          </FormField>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h4 className="font-semibold text-slate-900">手順</h4>
              <p className="text-sm text-slate-500">チームで再利用できるよう、手順を順番に記録してください。</p>
            </div>
            <button
              type="button"
              onClick={addStep}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              手順を追加
            </button>
          </div>

          <div className="space-y-4">
            {form.steps.map((step, index) => (
              <div key={step.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-700">手順 {index + 1}</div>
                  <button
                    type="button"
                    onClick={() => removeStep(step.id)}
                    className="rounded-lg border border-rose-200 px-3 py-2 text-rose-600 transition hover:bg-rose-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField label="手順名">
                    <input
                      defaultValue={step.title}
                      onBlur={(event) => updateStep(step.id, { title: event.currentTarget.value })}
                      className={inputClassName}
                    />
                  </FormField>

                  <FormField label="所要時間">
                    <input
                      value={step.duration}
                      onChange={(event) => updateStep(step.id, { duration: event.target.value })}
                      className={inputClassName}
                    />
                  </FormField>
                </div>

                <div className="mt-4">
                  <FormField label="手順の説明">
                    <textarea
                      rows={3}
                      value={step.description}
                      onChange={(event) => updateStep(step.id, { description: event.target.value })}
                      className={inputClassName}
                    />
                  </FormField>
                </div>

                <div className="mt-4">
                  <FormField label="使用材料">
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="mb-3 text-xs font-medium text-slate-500">在庫から選んで追加</div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <select
                            value={step.selectedInventoryMaterial}
                            onChange={(event) => updateStep(step.id, { selectedInventoryMaterial: event.target.value })}
                            className={inputClassName}
                          >
                            <option value="">在庫から試薬を選択</option>
                            {buildSelectableInventoryMaterials(inventoryMaterialNames, step.materials).map((material) => (
                              <option key={`${step.id}-select-${material}`} value={material}>
                                {material}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              if (step.selectedInventoryMaterial) {
                                addMaterialToStep(step.id, step.selectedInventoryMaterial, 'selectedInventoryMaterial');
                              }
                            }}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            選択した試薬を追加
                          </button>
                        </div>

                        {inventoryMaterialNames.length > 0 ? (
                          <div className="mt-3 text-xs text-slate-400">
                            既存在庫から選んで追加できます。候補にない場合は下の「新しい試薬名を追加」を使ってください。
                          </div>
                        ) : (
                          <div className="mt-3 text-xs text-slate-400">
                            まだ在庫名が登録されていません。下の「新しい試薬名を追加」を使ってください。
                          </div>
                        )}
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="mb-3 text-xs font-medium text-slate-500">新しい試薬名を追加</div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            value={step.newMaterialInput}
                            onChange={(event) => updateStep(step.id, { newMaterialInput: event.target.value })}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                addMaterialToStep(step.id, undefined, 'newMaterialInput');
                              }
                            }}
                            placeholder="まだ在庫にない試薬名を入力"
                            className={inputClassName}
                          />
                          <button
                            type="button"
                            onClick={() => addMaterialToStep(step.id, undefined, 'newMaterialInput')}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            新規追加
                          </button>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="mb-2 text-xs font-medium text-slate-500">登録済み試薬</div>
                        {step.materials.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {step.materials.map((material) => (
                              <button
                                key={`${step.id}-material-${material}`}
                                type="button"
                                onClick={() => removeMaterialFromStep(step.id, material)}
                                className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 transition hover:bg-rose-50 hover:text-rose-600"
                              >
                                {material} ×
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-slate-400">まだ追加されていません</div>
                        )}
                      </div>
                    </div>
                  </FormField>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(materialLookup)}
        onClose={() => setMaterialLookup(null)}
        title={materialLookup ? `${materialLookup.materialName} の保管場所` : '試薬の保管場所'}
        description={
          materialLookup
            ? `プロトコル「${materialLookup.protocolTitle}」 / 手順「${materialLookup.stepTitle}」`
            : undefined
        }
        footer={
          materialLookup ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => {
                  setMaterialLookup(null);
                  onOpenInventory();
                }}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
              >
                在庫画面で確認
              </button>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setMaterialLookup(null)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                >
                  閉じる
                </button>
                <button
                  type="button"
                  onClick={handleOrderRequest}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 sm:w-auto"
                >
                  発注画面へ
                </button>
              </div>
            </div>
          ) : null
        }
      >
        {materialLookup ? (
          materialLookup.matches.length > 0 ? (
            <div className="space-y-3">
              {materialLookup.matches.map((item) => {
                const isLowStock = item.quantity <= item.minQuantity;

                return (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-base font-semibold text-slate-900">{item.name}</div>
                        <div className="mt-1 text-sm text-slate-500">{item.location || '保管場所未設定'}</div>
                      </div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          isLowStock ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {isLowStock ? '在庫不足' : '在庫あり'}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                      <div>現在庫: {item.quantity} {item.unit}</div>
                      <div>最低在庫: {item.minQuantity} {item.unit}</div>
                      <div>カテゴリ: {INVENTORY_CATEGORY_LABELS[item.category]}</div>
                      <div>発注元: {INVENTORY_SUPPLIER_LABELS[item.supplier]}</div>
                    </div>

                    {item.notes ? (
                      <div className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
                        {item.notes}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm leading-6 text-slate-600">
              一致する在庫が見つかりませんでした。必要ならこのまま発注画面へ進んで、試薬名を入れた状態から注文を作れます。
            </div>
          )
        ) : null}
      </Modal>
    </div>
  );
}
