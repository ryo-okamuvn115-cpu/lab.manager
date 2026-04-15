interface AccessPendingPageProps {
  email: string | null;
  error: string | null;
  onSignOut: () => Promise<void>;
}

export default function AccessPendingPage({
  email,
  error,
  onSignOut,
}: AccessPendingPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-2xl rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm tracking-[0.24em] text-slate-400">ACCESS CHECK</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">研究室メンバーとしての許可待ちです</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          {email ?? 'このアカウント'} はまだ共有ワークスペースへ入れる状態ではありません。管理者が Supabase の
          `workspace_members` テーブルにメールアドレスを追加すると、ログイン後にそのまま利用できるようになります。
        </p>

        {error && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {error}
          </div>
        )}

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">
          <div className="font-medium text-slate-700">管理者に伝える内容</div>
          <p className="mt-1">1. `supabase/schema.sql` を実行済みか</p>
          <p>2. `workspace_members` にこのメールアドレスが入っているか</p>
          <p>3. Email 認証を有効にしている場合、確認メールを開いたか</p>
        </div>

        <button
          type="button"
          onClick={() => void onSignOut()}
          className="mt-8 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          別のアカウントでログインし直す
        </button>
      </div>
    </div>
  );
}
