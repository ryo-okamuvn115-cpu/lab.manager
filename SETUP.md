# Lab Manager Setup

現在の推奨セットアップは `Supabase + 個別ログイン` です。

## 1. 依存関係を入れる

```powershell
npm install
```

## 2. Supabase 側を初期化する

1. Supabase でプロジェクトを作成
2. [supabase/schema.sql](./supabase/schema.sql) を実行
3. 必要なら [supabase/seed.sql](./supabase/seed.sql) を実行
4. `workspace_members` に研究室メンバーのメールアドレスを追加

詳しい操作は [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) にあります。

## 3. 環境変数を設定する

`.env.local` を作って次を入れます。

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 4. 開発起動する

```powershell
npm run dev
```

開いたら `http://localhost:5173` へアクセスします。

## 5. Android アプリ化する

```powershell
npm run build:android
npm run cap:open:android
```

## Legacy

`server/lab-server.js` と `server/data/lab-data.json` を使う旧構成もリポジトリ内には残していますが、現在のフロント画面は Supabase 構成を前提にしています。
