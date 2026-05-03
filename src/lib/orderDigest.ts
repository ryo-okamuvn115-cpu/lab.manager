import { formatCurrency, formatDateTime } from '@/lib/format';
import { ORDER_STATUS_LABELS, type Order, type WorkspaceMember } from '@/lib/types';

export interface OrderDigestPreview {
  periodLabel: string;
  subject: string;
  body: string;
  orders: Order[];
  recipients: WorkspaceMember[];
}

function startOfToday(baseDate: Date) {
  return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
}

export function getPreviousDayRange(baseDate = new Date()) {
  const end = startOfToday(baseDate);
  const start = new Date(end);
  start.setDate(start.getDate() - 1);

  return { start, end };
}

export function getPreviousDayOrders(orders: Order[], baseDate = new Date()) {
  const { start, end } = getPreviousDayRange(baseDate);

  return orders
    .filter((order) => {
      const createdAt = new Date(order.createdAt);
      const timestamp = createdAt.getTime();

      return Number.isFinite(timestamp) && timestamp >= start.getTime() && timestamp < end.getTime();
    })
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
}

export function buildOrderDigestPreview(params: {
  orders: Order[];
  recipients: WorkspaceMember[];
  baseDate?: Date;
}): OrderDigestPreview {
  const baseDate = params.baseDate ?? new Date();
  const previousDayOrders = getPreviousDayOrders(params.orders, baseDate);
  const { start } = getPreviousDayRange(baseDate);
  const periodLabel = start.toLocaleDateString('ja-JP');
  const subject = `Lab Manager 発注サマリー (${periodLabel})`;

  const headerLines = [
    `${periodLabel} の発注一覧です。`,
    '',
    `対象件数: ${previousDayOrders.length}件`,
    `通知先: ${
      params.recipients.length > 0
        ? params.recipients.map((member) => member.email).join(', ')
        : '未設定'
    }`,
    '',
  ];

  const bodyLines =
    previousDayOrders.length > 0
      ? previousDayOrders.flatMap((order, index) => [
          `${index + 1}. ${order.orderNumber} / ${ORDER_STATUS_LABELS[order.status]}`,
          `   登録: ${formatDateTime(order.createdAt)}`,
          `   合計: ${formatCurrency(order.totalAmount)}`,
          ...order.items.map(
            (item) => `   - ${item.itemName} x ${item.quantity} / ${formatCurrency(item.unitPrice)}`,
          ),
          ...(order.notes ? [`   メモ: ${order.notes}`] : []),
          '',
        ])
      : ['前日に登録された発注はありません。', ''];

  return {
    periodLabel,
    subject,
    body: [...headerLines, ...bodyLines].join('\n').trim(),
    orders: previousDayOrders,
    recipients: params.recipients,
  };
}
