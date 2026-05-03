import { useEffect, useMemo, useState } from 'react';
import { Copy, Edit3, MapPin, Plus, Trash2 } from 'lucide-react';
import ErrorBanner from '@/components/ErrorBanner';
import FormField from '@/components/FormField';
import Modal from '@/components/Modal';
import { adminAPI } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { buildOrderDigestPreview } from '@/lib/orderDigest';
import {
  createStorageLocationDetailField,
  createEmptyStorageLocationDraft,
  type InventoryItem,
  type Order,
  type StorageLocation,
  type StorageLocationDetailField,
  type StorageLocationDraft,
  type WorkspaceMember,
  type WorkspaceMemberDraft,
} from '@/lib/types';

interface AdminSettingsPageProps {
  locations: StorageLocation[];
  inventoryItems: InventoryItem[];
  orders: Order[];
  loading: boolean;
  saving: boolean;
  error: Error | null;
  lastSyncAt: string | null;
  currentUserEmail?: string | null;
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

function createEmptyMemberForm(): WorkspaceMemberDraft {
  return {
    email: '',
    role: 'member',
    receivesOrderDigest: false,
  };
}

function sortMembers(members: WorkspaceMember[]) {
  return [...members].sort((left, right) => left.email.localeCompare(right.email, 'en'));
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
  orders,
  loading,
  saving,
  error,
  lastSyncAt,
  currentUserEmail = null,
  onCreateLocation,
  onUpdateLocation,
  onDeleteLocation,
}: AdminSettingsPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StorageLocation | null>(null);
  const [form, setForm] = useState<StorageLocationDraft>(createEmptyStorageLocationDraft());
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersSaving, setMembersSaving] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState<WorkspaceMemberDraft>(createEmptyMemberForm());
  const [digestCopyNotice, setDigestCopyNotice] = useState<string | null>(null);

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

  const adminCount = useMemo(
    () => members.filter((member) => member.role === 'admin').length,
    [members],
  );

  const digestRecipients = useMemo(
    () => members.filter((member) => member.receivesOrderDigest),
    [members],
  );

  const digestPreview = useMemo(
    () => buildOrderDigestPreview({ orders, recipients: digestRecipients }),
    [orders, digestRecipients],
  );

  useEffect(() => {
    let active = true;

    setMembersLoading(true);
    void adminAPI
      .listWorkspaceMembers()
      .then((nextMembers) => {
        if (!active) {
          return;
        }

        setMembers(sortMembers(nextMembers));
        setMembersError(null);
      })
      .catch((membersFetchError) => {
        if (!active) {
          return;
        }

        setMembersError(
          membersFetchError instanceof Error
            ? membersFetchError.message
            : '研究室メンバー一覧を読み込めませんでした。',
        );
      })
      .finally(() => {
        if (active) {
          setMembersLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

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

  const upsertMember = async (payload: WorkspaceMemberDraft) => {
    setMembersSaving(true);
    setMembersError(null);

    try {
      const savedMember = await adminAPI.upsertWorkspaceMember({
        email: payload.email.trim().toLowerCase(),
        role: payload.role,
        receivesOrderDigest: payload.receivesOrderDigest,
      });

      setMembers((current) =>
        sortMembers([
          ...current.filter((member) => member.email.toLowerCase() !== savedMember.email.toLowerCase()),
          savedMember,
        ]),
      );

      return savedMember;
    } catch (memberSaveError) {
      const message =
        memberSaveError instanceof Error
          ? memberSaveError.message
          : '研究室メンバー設定を保存できませんでした。';
      setMembersError(message);
      throw memberSaveError;
    } finally {
      setMembersSaving(false);
    }
  };

  const submitMemberForm = async () => {
    if (!memberForm.email.trim()) {
      window.alert('追加したいメールアドレスを入力してください。');
      return;
    }

    try {
      await upsertMember(memberForm);
      setMemberForm(createEmptyMemberForm());
    } catch {
      // Error state is surfaced above the member list.
    }
  };

  const toggleMemberRole = async (member: WorkspaceMember) => {
    const isCurrentUser =
      currentUserEmail !== null
      && member.email.toLowerCase() === currentUserEmail.trim().toLowerCase();

    if (isCurrentUser && member.role === 'admin' && adminCount <= 1) {
      window.alert('最後の管理者をメンバーに戻すことはできません。');
      return;
    }

    try {
      await upsertMember({
        email: member.email,
        role: member.role === 'admin' ? 'member' : 'admin',
        receivesOrderDigest: member.receivesOrderDigest,
      });
    } catch {
      // Error state is surfaced above the member list.
    }
  };

  const toggleDigestRecipient = async (member: WorkspaceMember) => {
    try {
      await upsertMember({
        email: member.email,
        role: member.role,
        receivesOrderDigest: !member.receivesOrderDigest,
      });
    } catch {
      // Error state is surfaced above the member list.
    }
  };

  const copyDigestPreview = async () => {
    try {
      await navigator.clipboard.writeText(`件名: ${digestPreview.subject}\n\n${digestPreview.body}`);
      setDigestCopyNotice('発注サマリーの件名と本文をクリップボードにコピーしました。');
    } catch {
      window.alert('発注サマリーをコピーできませんでした。');
    }
  };

  const openDigestEmailDraft = () => {
    if (digestRecipients.length === 0) {
      window.alert('先に発注通知先を1人以上設定してください。');
      return;
    }

    if (digestPreview.orders.length === 0) {
      window.alert('前日に登録された発注がないため、送信するサマリーがありません。');
      return;
    }

    const to = digestRecipients.map((member) => member.email).join(',');
    const subject = encodeURIComponent(digestPreview.subject);
    const body = encodeURIComponent(digestPreview.body);
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
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
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">管理</h2>
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

      <div className="mb-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">研究室メンバー管理</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                ここでメールアドレスを許可すると、その人がログイン後に共有データへ入れます。管理者の追加や、発注通知の担当設定もここで行います。
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              登録済みメンバー: {members.length}人
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[1.2fr_0.5fr_0.5fr_auto]">
            <FormField label="メールアドレス">
              <input
                value={memberForm.email}
                onChange={(event) => setMemberForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="example@g.ecc.u-tokyo.ac.jp"
                className={inputClassName}
              />
            </FormField>

            <FormField label="権限">
              <select
                value={memberForm.role}
                onChange={(event) =>
                  setMemberForm((current) => ({
                    ...current,
                    role: event.target.value === 'admin' ? 'admin' : 'member',
                  }))
                }
                className={inputClassName}
              >
                <option value="member">メンバー</option>
                <option value="admin">管理者</option>
              </select>
            </FormField>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 md:mt-7">
              <input
                type="checkbox"
                checked={memberForm.receivesOrderDigest}
                onChange={(event) =>
                  setMemberForm((current) => ({
                    ...current,
                    receivesOrderDigest: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              発注通知先
            </label>

            <div className="md:mt-7">
              <button
                type="button"
                onClick={() => void submitMemberForm()}
                disabled={membersSaving}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {membersSaving ? '保存中...' : 'メンバーを追加 / 更新'}
              </button>
            </div>
          </div>

          {membersError ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {membersError}
            </div>
          ) : null}

          <div className="mt-5 rounded-3xl border border-slate-200">
            {membersLoading ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">研究室メンバー一覧を読み込み中...</div>
            ) : members.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {members.map((member) => {
                  const isCurrentUser =
                    currentUserEmail !== null
                    && member.email.toLowerCase() === currentUserEmail.trim().toLowerCase();
                  const isLastAdmin = isCurrentUser && member.role === 'admin' && adminCount <= 1;

                  return (
                    <div
                      key={member.email}
                      className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="break-all text-sm font-semibold text-slate-900">{member.email}</div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span
                            className={`rounded-full px-2.5 py-1 font-medium ${
                              member.role === 'admin'
                                ? 'bg-violet-100 text-violet-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {member.role === 'admin' ? '管理者' : 'メンバー'}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 font-medium ${
                              member.receivesOrderDigest
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {member.receivesOrderDigest ? '発注通知先' : '通知なし'}
                          </span>
                          {isCurrentUser ? (
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
                              あなた
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => void toggleMemberRole(member)}
                          disabled={membersSaving || isLastAdmin}
                          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {member.role === 'admin' ? 'メンバーに戻す' : '管理者にする'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleDigestRecipient(member)}
                          disabled={membersSaving}
                          className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {member.receivesOrderDigest ? '通知先から外す' : '通知先にする'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                まだ `workspace_members` に登録されたメンバーがいません。
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl bg-slate-900 p-5 text-white shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">前日発注サマリー</h3>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                毎朝メール送信の土台として、前日に登録された発注内容をここで確認できます。通知先が未設定ならメール送信は行わない想定です。
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={openDigestEmailDraft}
                className="inline-flex items-center justify-center rounded-xl border border-emerald-300/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/20"
              >
                メール下書きを開く
              </button>
              <button
                type="button"
                onClick={() => void copyDigestPreview()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                <Copy size={15} />
                本文をコピー
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-slate-200">
              対象日: {digestPreview.periodLabel}
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-slate-200">
              通知先: {digestRecipients.length > 0 ? `${digestRecipients.length}人` : '未設定'}
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-slate-200">
              前日の発注件数: {digestPreview.orders.length}件
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-slate-200">
              手動テスト: {digestRecipients.length > 0 && digestPreview.orders.length > 0 ? '可能' : '未準備'}
            </div>
          </div>

          {digestCopyNotice ? (
            <div className="mt-4 rounded-2xl border border-emerald-300/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {digestCopyNotice}
            </div>
          ) : null}

          <div className="mt-4 rounded-3xl bg-white p-4 text-slate-900">
            <div className="text-sm font-semibold text-slate-900">{digestPreview.subject}</div>
            <div className="mt-3 whitespace-pre-wrap rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">
              {digestPreview.body}
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-400">
            ここでは配信先設定、本文プレビュー、メール下書き作成まで確認できます。朝の自動送信自体は、次の段階で Supabase Edge Function とスケジュール実行を追加して仕上げます。
          </p>
        </section>
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
