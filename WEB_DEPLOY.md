# Web 公開手順

このアプリは `Supabase` に直接つなぐ構成なので、Web 版は静的ホスティングで公開できます。
このリポジトリでは `GitHub Pages` で自動公開する設定を入れてあります。

## 1. GitHub に push

`main` ブランチに最新コードを push します。

## 2. GitHub Pages を有効化

1. GitHub リポジトリ `lab.manager` を開く
2. `Settings`
3. `Pages`
4. `Build and deployment` の `Source` を `GitHub Actions` にする

## 3. Actions の完了を待つ

`Actions` タブで `Deploy Web App to GitHub Pages` が成功すると、公開 URL が作られます。

公開 URL は通常:

`https://ryo-okamuvn115-cpu.github.io/lab.manager/`

## 4. Supabase の URL 設定を更新

Supabase Dashboard で:

1. `Authentication`
2. `URL Configuration`

以下を設定します。

- `Site URL`
  - `https://ryo-okamuvn115-cpu.github.io/lab.manager/`
- `Redirect URLs`
  - `https://ryo-okamuvn115-cpu.github.io/lab.manager/`
  - `https://ryo-okamuvn115-cpu.github.io/lab.manager/*`

これで、スマホや他PCからも Web 版へアクセスでき、メール認証やパスワード再設定も本番 URL に戻せます。

## 5. 使い方

- PC: 上の URL をブラウザで開く
- スマホ: 同じ URL を Safari / Chrome で開く

## 補足

- `.env.production` に `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を入れてあるので、Pages 側で追加のビルド変数設定は不要です
- 画面や機能を変更したら、`main` に push すれば GitHub Pages が自動更新されます
