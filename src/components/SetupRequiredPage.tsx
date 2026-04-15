export default function SetupRequiredPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-3xl rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm tracking-[0.24em] text-slate-400">SUPABASE SETUP</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">
          Supabase の接続情報がまだ設定されていません
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          このアプリは `Supabase + 個別ログイン` 前提に切り替わりました。まず `.env.local` にプロジェクト URL と
          anon key を設定し、続けて `supabase/schema.sql` を実行してください。
        </p>

        <div className="mt-6 rounded-2xl bg-slate-900 p-5 text-sm text-slate-100">
          <div>VITE_SUPABASE_URL=https://your-project.supabase.co</div>
          <div className="mt-2">VITE_SUPABASE_ANON_KEY=your-anon-key</div>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-500">
          <div className="font-medium text-slate-700">次にやること</div>
          <p className="mt-2">1. Supabase でプロジェクトを作成する</p>
          <p>2. `supabase/schema.sql` を SQL Editor で実行する</p>
          <p>3. 必要なら `supabase/seed.sql` で初期データを入れる</p>
          <p>4. `.env.local` を保存して `npm run dev` を再起動する</p>
        </div>
      </div>
    </div>
  );
}
