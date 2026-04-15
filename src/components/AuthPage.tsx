import { useMemo, useState } from 'react';

interface AuthPageProps {
  busy: boolean;
  error: string | null;
  notice: string | null;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  onRequestPasswordReset: (email: string) => Promise<void>;
}

type AuthMode = 'signin' | 'signup' | 'reset';

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100';

export default function AuthPage({
  busy,
  error,
  notice,
  onSignIn,
  onSignUp,
  onRequestPasswordReset,
}: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const submitLabel = useMemo(
    () =>
      mode === 'signin'
        ? 'ログイン'
        : mode === 'signup'
          ? 'アカウントを作成'
          : '再設定メールを送信',
    [mode],
  );

  const handleSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      window.alert('メールアドレスを入力してください。');
      return;
    }

    if (mode === 'reset') {
      await onRequestPasswordReset(normalizedEmail);
      return;
    }

    if (!password) {
      window.alert('パスワードを入力してください。');
      return;
    }

    if (mode === 'signup' && password.length < 8) {
      window.alert('パスワードは8文字以上で設定してください。');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      window.alert('確認用パスワードが一致していません。');
      return;
    }

    if (mode === 'signin') {
      await onSignIn(normalizedEmail, password);
      return;
    }

    await onSignUp(normalizedEmail, password);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] bg-slate-900 px-8 py-10 text-white shadow-xl">
          <p className="text-sm tracking-[0.24em] text-slate-300">LAB MANAGER</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">
            研究室の共有データを、
            <br />
            個別ログインで安全に使う
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300">
            在庫、発注、プロトコルを Supabase で同期する構成です。ログイン後、管理者が許可したメールアドレスだけが研究室の共有データへアクセスできます。
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
              <div className="text-sm font-semibold">在庫管理</div>
              <div className="mt-2 text-sm text-slate-300">試薬の残量、期限、保管場所をチームで共有します。</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
              <div className="text-sm font-semibold">発注共有</div>
              <div className="mt-2 text-sm text-slate-300">誰が何を発注したかをひとつの画面で確認できます。</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
              <div className="text-sm font-semibold">プロトコル保存</div>
              <div className="mt-2 text-sm text-slate-300">実験手順を残して、引き継ぎしやすくします。</div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200">
          {mode === 'reset' ? (
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              ログインへ戻る
            </button>
          ) : (
            <div className="flex rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                  mode === 'signin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                ログイン
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                  mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                新規登録
              </button>
            </div>
          )}

          <div className="mt-6">
            <h2 className="text-2xl font-semibold text-slate-900">{submitLabel}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {mode === 'signin'
                ? '登録済みのメールアドレスでログインします。'
                : mode === 'signup'
                  ? 'まずアカウントを作成し、その後に管理者が研究室メンバーとして許可します。'
                  : '登録済みメールアドレスに、パスワード再設定用のリンクを送ります。'}
            </p>
          </div>

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
              <div className="mb-2 text-sm font-medium text-slate-700">メールアドレス</div>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClassName}
                placeholder="lab-member@example.ac.jp"
              />
            </label>

            {mode !== 'reset' && (
              <label className="block">
                <div className="mb-2 flex items-center justify-between gap-3 text-sm font-medium text-slate-700">
                  <span>パスワード</span>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => setMode('reset')}
                      className="font-medium text-blue-600 transition hover:text-blue-700"
                    >
                      パスワードを忘れた場合
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={inputClassName}
                  placeholder="8文字以上"
                />
              </label>
            )}

            {mode === 'signup' && (
              <label className="block">
                <div className="mb-2 text-sm font-medium text-slate-700">パスワード確認</div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className={inputClassName}
                  placeholder="もう一度入力"
                />
              </label>
            )}
          </div>

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={busy}
            className="mt-8 w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? '処理中...' : submitLabel}
          </button>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">
            <div className="font-medium text-slate-700">研究室メンバー制御</div>
            <p className="mt-1">
              アカウントを作っても、管理者が Supabase の `workspace_members` テーブルにメールアドレスを追加するまでは共有データへは入れません。
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
