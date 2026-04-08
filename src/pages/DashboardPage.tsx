import type { ReactNode } from 'react';
import { AlertCircle, BookOpen, Boxes, ClipboardList, Clock3 } from 'lucide-react';
import ErrorBanner from '@/components/ErrorBanner';
import { formatDate, formatDateTime, formatRelativeDays } from '@/lib/format';
import { ORDER_STATUS_LABELS, type LabSnapshot, type Page } from '@/lib/types';

interface DashboardPageProps {
  snapshot: LabSnapshot | null;
  loading: boolean;
  saving: boolean;
  error: Error | null;
  onNavigate: (page: Page) => void;
}

function SummaryCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string | number;
  tone: 'blue' | 'green' | 'amber' | 'rose';
  icon: ReactNode;
}) {
  const toneMap = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
  } as const;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
        </div>
        <div className={`rounded-2xl p-3 ring-1 ${toneMap[tone]}`}>{icon}</div>
      </div>
    </div>
  );
}

export default function DashboardPage({
  snapshot,
  loading,
  saving,
  error,
  onNavigate,
}: DashboardPageProps) {
  const inventory = snapshot?.inventory ?? [];
  const orders = snapshot?.orders ?? [];
  const protocols = snapshot?.protocols ?? [];

  const lowStockItems = inventory
    .filter((item) => item.quantity <= item.minQuantity)
    .sort((left, right) => left.quantity - right.quantity)
    .slice(0, 5);

  const expiringSoonItems = inventory
    .filter((item) => {
      if (!item.expiryDate) {
        return false;
      }

      const diff = new Date(item.expiryDate).getTime() - Date.now();
      return diff <= 30 * 24 * 60 * 60 * 1000;
    })
    .sort((left, right) => {
      const leftTime = left.expiryDate ? new Date(left.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
      const rightTime = right.expiryDate ? new Date(right.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime;
    })
    .slice(0, 5);

  const recentOrders = [...orders]
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 4);

  const pendingOrderCount = orders.filter((order) => order.status !== 'received').length;

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      {error && <ErrorBanner message={error.message} />}

      <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-slate-900 px-6 py-6 text-white shadow-xl sm:px-8">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm tracking-[0.24em] text-slate-300">共有研究室ワークスペース</p>
            <h2 className="mt-2 text-3xl font-semibold">チーム全体の試薬管理を一元化</h2>
            <p className="mt-3 max-w-3xl text-sm text-slate-300">
              同じサーバーに接続している全員が、同じ在庫、発注、プロトコルを確認できます。
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-slate-100 backdrop-blur">
            <div>{saving ? '最新の変更を保存中...' : '共有同期は有効です'}</div>
            <div className="mt-1 text-slate-300">
              最終同期: {formatDateTime(snapshot?.updatedAt ?? null)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onNavigate('inventory')}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            在庫を見る
          </button>
          <button
            type="button"
            onClick={() => onNavigate('orders')}
            className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            発注を管理
          </button>
          <button
            type="button"
            onClick={() => onNavigate('protocols')}
            className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            プロトコルを見る
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="在庫品目" value={inventory.length} tone="blue" icon={<Boxes size={24} />} />
        <SummaryCard label="未受領の発注" value={pendingOrderCount} tone="green" icon={<ClipboardList size={24} />} />
        <SummaryCard label="在庫不足アラート" value={lowStockItems.length} tone="amber" icon={<AlertCircle size={24} />} />
        <SummaryCard label="登録済みプロトコル" value={protocols.length} tone="rose" icon={<BookOpen size={24} />} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">在庫チェック</h3>
              <p className="text-sm text-slate-500">在庫不足・期限が近い試薬</p>
            </div>
            <Clock3 className="text-slate-400" size={22} />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
              <h4 className="text-sm font-semibold text-amber-900">在庫不足</h4>
              <div className="mt-3 space-y-3">
                {loading ? (
                  <p className="text-sm text-amber-700">読み込み中...</p>
                ) : lowStockItems.length > 0 ? (
                  lowStockItems.map((item) => (
                    <div key={item.id} className="rounded-xl bg-white/80 p-3">
                      <div className="font-medium text-slate-900">{item.name}</div>
                      <div className="mt-1 text-sm text-slate-600">
                        残り {item.quantity} {item.unit} / 最低 {item.minQuantity} {item.unit}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{item.location || '保管場所未設定'}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-amber-700">現在、在庫不足はありません。</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-100">
              <h4 className="text-sm font-semibold text-rose-900">期限間近</h4>
              <div className="mt-3 space-y-3">
                {loading ? (
                  <p className="text-sm text-rose-700">読み込み中...</p>
                ) : expiringSoonItems.length > 0 ? (
                  expiringSoonItems.map((item) => (
                    <div key={item.id} className="rounded-xl bg-white/80 p-3">
                      <div className="font-medium text-slate-900">{item.name}</div>
                      <div className="mt-1 text-sm text-slate-600">{formatDate(item.expiryDate)}</div>
                      <div className="mt-1 text-xs text-slate-500">{formatRelativeDays(item.expiryDate)}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-rose-700">今後30日以内に期限切れになる項目はありません。</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">最近の発注更新</h3>
              <p className="text-sm text-slate-500">チームで共有された最新の変更</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="rounded-lg px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
            >
              すべて見る
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <p className="text-sm text-slate-500">読み込み中...</p>
            ) : recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <div key={order.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{order.orderNumber}</div>
                      <div className="mt-1 text-sm text-slate-500">更新: {formatDateTime(order.updatedAt)}</div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </div>
                  <div className="mt-3 text-sm text-slate-600">
                    {order.items.length}件 / 合計 {order.totalAmount.toLocaleString('ja-JP')}円
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">まだ発注はありません。</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
