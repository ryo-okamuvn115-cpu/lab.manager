# Lab Manager Mobile Deployment

現在の Android アプリは、`Supabase` を直接使う構成です。  
そのため、以前のように Render や Node サーバーを常時立てなくても、アプリ同士で同期できます。

## 1. 先に Supabase セットアップを済ませる

まずは [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) の内容を終わらせます。

必要なのは次の2つです。

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 2. Android 用にビルドする

`.env.local` が設定済みなら、そのまま次で大丈夫です。

```powershell
npm run build:android
```

もし PowerShell で一時的に直接指定したいなら、こうでも動きます。

```powershell
$env:VITE_SUPABASE_URL="https://your-project.supabase.co"
$env:VITE_SUPABASE_ANON_KEY="your-anon-key"
npm run build:android
```

## 3. Android Studio で開く

```powershell
npm run cap:open:android
```

その後は Android Studio で次のどちらかです。

- `Run` で実機またはエミュレータ起動
- `Build APK` で配布用 APK を作成

## 4. 実機テスト時のポイント

- 研究室メンバーのメールアドレスが `workspace_members` に入っていないとログイン後に入れません
- Email 認証を有効にしている場合は、確認メールを開いてからログインします
- Android アプリからも Web 版と同じ Supabase データを見に行くので、編集内容はそのまま同期されます

## iPhone / iOS note

Capacitor supports iOS, but generating and building the iOS project still requires a Mac with Xcode.
