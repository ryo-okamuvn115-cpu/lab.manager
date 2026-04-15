import { useState } from 'react';

interface PasswordRecoveryPageProps {
  busy: boolean;
  error: string | null;
  notice: string | null;
  onUpdatePassword: (password: string) => Promise<void>;
}

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100';

export default function PasswordRecoveryPage({
  busy,
  error,
  notice,
  onUpdatePassword,
}: PasswordRecoveryPageProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async () => {
    if (!password) {
      window.alert('新しいパスワードを入力してください。');
      return;
    }

    if (password.length < 8) {
      window.alert('パスワードは8文字以上で設定してください。');
      return;
    }

    if (password !== confirmPassword) {
      window.alert('確認用パスワードが一致していません。');
      return;
    }

    await onUpdatePassword(password);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm tracking-[0.24em] text-slate-400">LAB MANAGER</p>
        <h1 className="mt-4 text-3xl font-semibold leading-tight text-slate-900">
          新しいパスワードを設定
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          メールのリンク確認が完了しました。ここで新しいパスワードを設定すると、そのまま研究室アプリに戻れます。
        </p>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {notice && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </div>
        )}

        <div className="mt-6 space-y-4">
          <label className="block">
            <div className="mb-2 text-sm font-medium text-slate-700">新しいパスワード</div>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClassName}
              placeholder="8文字以上"
            />
          </label>

          <label className="block">
            <div className="mb-2 text-sm font-medium text-slate-700">新しいパスワード確認</div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputClassName}
              placeholder="もう一度入力"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={busy}
          className="mt-8 w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? '処理中...' : '新しいパスワードを保存'}
        </button>
      </div>
    </div>
  );
}
