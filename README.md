# Lab Manager

研究室向けの試薬・発注書・プロトコル管理アプリです。  
現在の推奨構成は `Supabase + 個別ログイン` です。

## クイックスタート

1. `npm install`
2. Supabase でプロジェクト作成
3. [supabase/schema.sql](./supabase/schema.sql) を SQL Editor で実行
4. 必要なら [supabase/seed.sql](./supabase/seed.sql) を実行
5. `.env.local` に URL と anon key を設定
6. `npm run dev`

詳細は [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) を見ればそのまま進められます。

## 環境変数

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 開発起動

```powershell
npm run dev
```

ブラウザで `http://localhost:5173` を開きます。

## 研究室メンバーの管理

ログイン後でも、`workspace_members` テーブルにメールアドレスが入っていないと共有データへアクセスできません。  
研究室メンバーの追加は Supabase の SQL Editor または Table Editor で行います。

## Android アプリ化

```powershell
npm run build:android
npm run cap:open:android
```

手順の詳細は [MOBILE_DEPLOY.md](./MOBILE_DEPLOY.md) にまとめています。

## 補足

- `server/` 配下の JSON サーバー構成は残していますが、現在のフロントは Supabase 構成を前提にしています。
- 共有同期は Supabase Database と Realtime を使います。
