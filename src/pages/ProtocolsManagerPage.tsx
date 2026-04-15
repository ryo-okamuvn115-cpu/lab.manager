import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Edit3, Plus, Trash2 } from 'lucide-react';
import ErrorBanner from '@/components/ErrorBanner';
import FormField from '@/components/FormField';
import Modal from '@/components/Modal';
import { formatDateTime } from '@/lib/format';
import {
  createEmptyProtocolDraft,
  PROTOCOL_DIFFICULTIES,
  PROTOCOL_DIFFICULTY_LABELS,
  type Protocol,
  type ProtocolDifficulty,
  type ProtocolDraft,
} from '@/lib/types';

interface ProtocolStepFormState {
  id: string;
  title: string;
  description: string;
  duration: string;
  materialsText: string;
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
  loading: boolean;
  saving: boolean;
  error: Error | null;
  lastSyncAt: string | null;
  onCreate: (payload: ProtocolDraft) => Promise<unknown>;
  onUpdate: (id: string, payload: ProtocolDraft) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
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
    materialsText: step.materialsText ?? '',
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
      materialsText: step.materials.join(', '),
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
      materialsText: '',
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
        materials: step.materialsText
          .split(/,|\n/)
          .map((material) => material.trim())
          .filter(Boolean),
      }))
      .filter((step) => step.title.length > 0 || step.description.length > 0),
  };
}

export default function ProtocolsManagerPage({
  protocols,
  loading,
  saving,
  error,
  lastSyncAt,
  onCreate,
  onUpdate,
  onDelete,
}: ProtocolsManagerPageProps) {
  const [expandedProtocolId, setExpandedProtocolId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<Protocol | null>(null);
  const [form, setForm] = useState<ProtocolFormState>(emptyFormState());

  const sortedProtocols = useMemo(
    () => [...protocols].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
    [protocols],
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
        step.title.trim() || step.description.trim() || step.duration.trim() || step.materialsText.trim();

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
                              <div className="mt-3 flex flex-wrap gap-2">
                                {step.materials.length > 0 ? (
                                  step.materials.map((material) => (
                                    <span key={material} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                                      {material}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-slate-500">使用材料なし</span>
                                )}
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
            <div className="text-xs text-slate-500">材料はカンマ区切りまたは改行区切りで入力してください。</div>
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
                    <textarea
                      rows={2}
                      value={step.materialsText}
                      onChange={(event) => updateStep(step.id, { materialsText: event.target.value })}
                      className={inputClassName}
                    />
                  </FormField>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
