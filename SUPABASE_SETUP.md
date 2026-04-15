# Supabase セットアップ手順

このアプリは `Supabase + 個別ログイン` で動く構成です。  
いま必要なのは `1回だけ` の初期設定です。

## 1. Supabase プロジェクトを作る

1. [Supabase](https://supabase.com/) にログイン
2. `New project`
3. プロジェクト名を決める
4. データベースパスワードを設定
5. リージョンを選んで作成

## 2. スキーマを作る

1. 左メニューの `SQL Editor`
2. `New query`
3. [supabase/schema.sql](./supabase/schema.sql) の中身を貼る
4. `Run`

これで次が作られます。

- `workspace_members`
- `storage_locations`
- `inventory_items`
- `orders`
- `protocols`
- RLS ポリシー
- Realtime の publish 設定

既存プロジェクトにあとから `発注元` を追加したい場合は、[supabase/add_inventory_supplier.sql](./supabase/add_inventory_supplier.sql) だけを別で実行しても大丈夫です。
保管場所の選択肢と画像添付を追加したい場合は、[supabase/add_inventory_location_fields.sql](./supabase/add_inventory_location_fields.sql) も実行してください。
管理者画面と保管場所マスタを追加したい場合は、[supabase/add_admin_storage_locations.sql](./supabase/add_admin_storage_locations.sql) を実行してください。

## 3. 必要なら初期データを入れる

既存のサンプルデータを入れたいなら、次も実行します。

1. もう一度 `New query`
2. [supabase/seed.sql](./supabase/seed.sql) の中身を貼る
3. `Run`

## 4. 研究室メンバーのメールアドレスを許可する

このアプリは、ログインできても `workspace_members` にメールアドレスが入っていないと中に入れません。

SQL Editor で例えばこう入れます。

```sql
insert into public.workspace_members (email)
values
  ('your-email@example.com'),
  ('labmate@example.com')
on conflict (email) do nothing;
```

管理者にしたいメールアドレスは `role = 'admin'` にします。

```sql
insert into public.workspace_members (email, role)
values ('admin@example.com', 'admin')
on conflict (email) do update
set role = 'admin';
```

`role = 'admin'` の人だけ、Web画面の `管理` から保管場所候補を追加・編集できます。

## 5. URL と anon key を控える

1. 左メニュー `Project Settings`
2. `API`
3. 次の2つをコピー

- `Project URL`
- `anon public key`

## 6. ローカル環境変数を設定する

[.env.example](./.env.example) を参考に、プロジェクト直下へ `.env.local` を作って次を書きます。

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 7. Web で動かす

```powershell
npm install
npm run dev
```

その後、

`http://localhost:5173`

を開きます。

## 8. Android アプリにする

`.env.local` が入った状態で次を実行します。

```powershell
npm run build:android
npm run cap:open:android
```

その後は Android Studio で `Run`、または APK を作成します。

## 補足

- Email 認証を有効にしている場合、新規登録後に確認メールを開く必要があります。
- 研究室メンバーの追加・削除は `workspace_members` テーブルで管理します。
- フロントは静的アプリなので、Node サーバーを常時立てなくても同期できます。
