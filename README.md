# Lab Manager

研究室向けの試薬・発注書・プロトコル管理アプリです。  
今回の更新で `localStorage` 保存をやめて、共有サーバー上のJSONをAPI経由で読む構成に変更しています。

## セットアップ

```bash
npm install
```

## 開発時

ターミナルを2つ使います。

1つ目

```bash
npm run dev:server
```

2つ目

```bash
npm run dev
```

ブラウザから `http://localhost:5173` を開くと、Vite経由でAPIに接続します。

## 共有利用

共有PCまたは研究室内サーバーで次を実行します。

```bash
npm run build
npm run start
```

その後、他の端末から `http://<サーバーのIPアドレス>:3000` にアクセスすると、同じデータを参照できます。

## データ保存先

共有データは次のファイルに保存されます。

`server/data/lab-data.json`

このファイルをバックアップすれば、在庫・発注書・プロトコルをまとめて保全できます。
