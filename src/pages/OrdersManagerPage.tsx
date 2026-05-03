import { useEffect, useMemo, useState } from 'react';
import { Edit3, Plus, Trash2 } from 'lucide-react';
import ErrorBanner from '@/components/ErrorBanner';
import FormField from '@/components/FormField';
import Modal from '@/components/Modal';
import { formatCurrency, formatDateTime } from '@/lib/format';
import {
  createEmptyOrderDraft,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  type Order,
  type OrderDraft,
  type OrderItemDraft,
  type OrderStatus,
} from '@/lib/types';

interface OrderComposerRequest {
  requestId: string;
  draft: OrderDraft;
  notice?: string;
}

interface OrdersManagerPageProps {
  orders: Order[];
  loading: boolean;
  saving: boolean;
  error: Error | null;
  lastSyncAt: string | null;
  composerRequest?: OrderComposerRequest | null;
  onComposerRequestHandled?: () => void;
  onCreate: (payload: OrderDraft) => Promise<unknown>;
  onUpdate: (id: string, payload: OrderDraft) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100';

const statusToneClassName: Record<OrderStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  submitted: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  received: 'bg-emerald-100 text-emerald-700',
};

function cloneDraft(order: Order): OrderDraft {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    notes: order.notes,
    items: order.items.map((item) => ({
      itemName: item.itemName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  };
}

export default function OrdersManagerPage({
  orders,
  loading,
  saving,
  error,
  lastSyncAt,
  composerRequest = null,
  onComposerRequestHandled,
  onCreate,
  onUpdate,
  onDelete,
}: OrdersManagerPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [form, setForm] = useState<OrderDraft>(createEmptyOrderDraft());
  const [composerNotice, setComposerNotice] = useState<string | null>(null);

  const sortedOrders = useMemo(
    () => [...orders].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
    [orders],
  );

  const draftTotal = useMemo(
    () => form.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [form.items],
  );

  const openCreateModal = () => {
    setEditingOrder(null);
    setForm(createEmptyOrderDraft());
    setComposerNotice(null);
    setIsModalOpen(true);
  };

  const openEditModal = (order: Order) => {
    setEditingOrder(order);
    setForm(cloneDraft(order));
    setComposerNotice(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setIsModalOpen(false);
    setEditingOrder(null);
    setForm(createEmptyOrderDraft());
    setComposerNotice(null);
  };

  useEffect(() => {
    if (!composerRequest) {
      return;
    }

    setEditingOrder(null);
    setForm({
      orderNumber: composerRequest.draft.orderNumber,
      status: composerRequest.draft.status,
      notes: composerRequest.draft.notes,
      items: composerRequest.draft.items.map((item) => ({
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });
    setComposerNotice(composerRequest.notice ?? null);
    setIsModalOpen(true);
    onComposerRequestHandled?.();
  }, [composerRequest, onComposerRequestHandled]);

  const updateItem = (index: number, patch: Partial<OrderItemDraft>) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  };

  const addLine = () => {
    setForm((current) => ({
      ...current,
      items: [...current.items, { itemName: '', quantity: 1, unitPrice: 0 }],
    }));
  };

  const removeLine = (index: number) => {
    setForm((current) => {
      const nextItems = current.items.filter((_, itemIndex) => itemIndex !== index);

      return {
        ...current,
        items: nextItems.length > 0 ? nextItems : [{ itemName: '', quantity: 1, unitPrice: 0 }],
      };
    });
  };

  const submitForm = async () => {
    if (!form.orderNumber.trim()) {
      window.alert('発注番号は必須です。');
      return;
    }

    const normalizedItems = form.items
      .map((item) => ({
        itemName: item.itemName.trim(),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }))
      .filter((item) => item.itemName.length > 0);

    if (normalizedItems.length === 0) {
      window.alert('明細を1件以上追加してください。');
      return;
    }

    if (normalizedItems.some((item) => item.quantity <= 0 || item.unitPrice < 0)) {
      window.alert('明細の数量は1以上、単価は0以上にしてください。');
      return;
    }

    const payload: OrderDraft = {
      orderNumber: form.orderNumber.trim(),
      status: form.status,
      notes: form.notes.trim(),
      items: normalizedItems,
    };

    try {
      if (editingOrder) {
        await onUpdate(editingOrder.id, payload);
      } else {
        await onCreate(payload);
      }

      closeModal();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '発注を保存できませんでした。');
    }
  };

  const handleDelete = async (order: Order) => {
    const confirmed = window.confirm(`共有ワークスペースから発注「${order.orderNumber}」を削除しますか？`);

    if (!confirmed) {
      return;
    }

    try {
      await onDelete(order.id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '発注を削除できませんでした。');
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      {error && <ErrorBanner message={error.message} />}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm tracking-[0.24em] text-slate-400">発注</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">共有発注書</h2>
          <p className="mt-2 text-sm text-slate-500">
            最終同期: {formatDateTime(lastSyncAt)} {saving ? ' / 保存中...' : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          <Plus size={18} />
          発注を作成
        </button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="rounded-3xl bg-white px-6 py-12 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            共有発注を読み込み中...
          </div>
        ) : sortedOrders.length > 0 ? (
          sortedOrders.map((order) => (
            <article key={order.id} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-semibold text-slate-900">{order.orderNumber}</h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusToneClassName[order.status]}`}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">更新: {formatDateTime(order.updatedAt)}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(order)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-slate-600 transition hover:bg-slate-50"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(order)}
                    className="rounded-lg border border-rose-200 px-3 py-2 text-rose-600 transition hover:bg-rose-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_220px]">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-800">発注明細</div>
                  <div className="mt-3 space-y-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-4 text-sm">
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900">{item.itemName}</div>
                          <div className="text-slate-500">
                            {item.quantity} x {formatCurrency(item.unitPrice)}
                          </div>
                        </div>
                        <div className="whitespace-nowrap font-medium text-slate-700">
                          {formatCurrency(item.totalPrice)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-sm text-slate-500">合計金額</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900">
                    {formatCurrency(order.totalAmount)}
                  </div>
                  <div className="mt-4 text-xs text-slate-500">{order.notes || 'メモなし'}</div>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-3xl bg-white px-6 py-12 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            まだ発注は登録されていません。
          </div>
        )}
      </div>

      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title={editingOrder ? '発注を編集' : '発注を作成'}
        description="発注は一元保存され、研究室全体で購入の進捗を確認できます。"
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-500">下書き合計: {formatCurrency(draftTotal)}</div>
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
                className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {saving ? '保存中...' : editingOrder ? '変更を保存' : '作成する'}
              </button>
            </div>
          </div>
        }
      >
        {composerNotice ? (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {composerNotice}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="発注番号">
            <input
              value={form.orderNumber}
              onChange={(event) => setForm((current) => ({ ...current, orderNumber: event.target.value }))}
              className={inputClassName}
            />
          </FormField>

          <FormField label="ステータス">
            <select
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as OrderStatus }))}
              className={inputClassName}
            >
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {ORDER_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h4 className="font-semibold text-slate-900">発注明細</h4>
              <p className="text-sm text-slate-500">発注に含める試薬や消耗品を入力してください。</p>
            </div>
            <button
              type="button"
              onClick={addLine}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              明細を追加
            </button>
          </div>

          <div className="space-y-4">
            {form.items.map((item, index) => (
              <div key={`${index}-${item.itemName}`} className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-[1fr_120px_160px_44px]">
                <FormField label={`明細 ${index + 1}`}>
                  <input
                    value={item.itemName}
                    onChange={(event) => updateItem(index, { itemName: event.target.value })}
                    className={inputClassName}
                  />
                </FormField>

                <FormField label="数量">
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })}
                    className={inputClassName}
                  />
                </FormField>

                <FormField label="単価">
                  <input
                    type="number"
                    min={0}
                    value={item.unitPrice}
                    onChange={(event) => updateItem(index, { unitPrice: Number(event.target.value) })}
                    className={inputClassName}
                  />
                </FormField>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="inline-flex h-[42px] w-full items-center justify-center rounded-xl border border-rose-200 text-rose-600 transition hover:bg-rose-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <FormField label="メモ">
            <textarea
              rows={4}
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              className={inputClassName}
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
