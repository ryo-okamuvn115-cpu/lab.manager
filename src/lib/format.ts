export function formatDate(value: string | null | undefined) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('ja-JP');
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('ja-JP');
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRelativeDays(value: string | null | undefined) {
  if (!value) {
    return '期限未設定';
  }

  const target = new Date(value);
  const now = new Date();
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = targetDay.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays < 0) {
    return `${Math.abs(diffDays)}日超過`;
  }

  if (diffDays === 0) {
    return '今日';
  }

  return `あと${diffDays}日`;
}
