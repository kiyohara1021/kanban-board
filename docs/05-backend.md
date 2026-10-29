# 05. バックエンド設計

## 作り方

[Prisma 公式の Express テンプレート](https://github.com/prisma/prisma-examples/tree/latest/orm/express)（`npx try-prisma --template orm/express`）から作り、次の点を変えた。

- DB を PostgreSQL から SQLite に変え、接続には `@prisma/adapter-libsql` を使う（Prisma 7 は DB ごとのアダプター経由で接続する。`better-sqlite3` はインストール時にネイティブモジュールのビルドが必要なので避けた）
- Prisma 7.10 / Express 5.3 に上げた
- サンプルの User / Post モデルを、[データモデル](02-data-model.md)の Board / Column / Card に置き換えた
- サーバーの起動（`index.ts`）と Express アプリ（`app.ts`）を分けた

## ディレクトリ構成

```
backend/
├── prisma.config.ts          Prisma CLI の設定（スキーマの場所、DB の URL）
├── .env.example              環境変数の例（.env がなくても初期値で動く）
├── prisma/
│   ├── schema.prisma         データモデル（02-data-model.md と同じ内容）
│   ├── migrations/           マイグレーション（Git に含める）
│   ├── generated/            prisma generate で作られるクライアント（Git に含めない）
│   ├── dev.db                SQLite のデータベース（Git に含めない）
│   └── seed.ts               動作確認用のサンプルデータ（Step 4）
└── src/
    ├── index.ts              サーバー起動（app.listen）
    ├── app.ts                Express アプリの組み立て（テストからも読み込む）
    ├── config.ts             環境変数の読み込みと初期値
    ├── routes/
    │   ├── boards.ts
    │   ├── columns.ts
    │   └── cards.ts
    ├── services/
    │   ├── boardService.ts
    │   ├── columnService.ts
    │   ├── cardService.ts
    │   └── position.ts       並び順の計算と振り直し
    ├── middlewares/
    │   ├── validate.ts       Zod スキーマでリクエストを検証
    │   └── errorHandler.ts   エラーを共通の JSON 形式に変換
    ├── errors.ts             NotFoundError などのエラークラス
    └── lib/prisma.ts         PrismaClient の生成
```

今あるのは `index.ts`・`app.ts`・`config.ts`・`lib/prisma.ts` と、動作確認用の `GET /api/health` だけ。`routes/` 以下は Step 4 で作る。

## 役割分担

| 層          | 役割                                               | 書かないこと         |
| ----------- | -------------------------------------------------- | -------------------- |
| routes      | URL とメソッドの対応、入力の検証、レスポンスの返却 | DB の操作            |
| services    | DB の操作、並び順の計算、トランザクション          | `req` / `res` の扱い |
| middlewares | 検証やエラー処理など、全ルート共通の処理           | 個別の業務ロジック   |

`app.ts` と `index.ts` を分けておくと、テストで Supertest に `app` を渡すだけで、サーバーを起動せずに API を試せる。

## shared パッケージ

```
shared/src/
├── schemas.ts    Zod スキーマ（boardSchema, createBoardSchema, moveCardSchema …）
├── types.ts      z.infer で作った型（Board, Column, Card, BoardDetail）
└── index.ts
```

- バックエンドは `schemas.ts` でリクエストを検証する
- フロントエンドは `types.ts` の型を使い、フォームの検証にも同じスキーマを使う
- 文字数制限などのルールを1か所で管理できる

## 開発環境

| 項目           | 内容                                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| ポート         | フロントエンド 5173（Vite）、バックエンド 3000（環境変数 `API_PORT` で変更できる）                          |
| API の呼び出し | Vite の `server.proxy` で `/api` を 3000 番に転送する（CORS の設定が不要になる）                            |
| DB             | SQLite（`backend/prisma/dev.db`）。Git には含めない                                                         |
| 実行           | ルートで `npm run dev` を実行し、フロントとバックを同時に起動する（concurrently）                           |
| DB の操作      | `npm run db:migrate -w backend`（マイグレーション）、`npm run db:studio -w backend`（ブラウザで中身を見る） |

ポートの環境変数を `PORT` にしなかったのは、ほかの開発ツールが `PORT` を設定することがあり、意図しないポートで起動してしまうため。

## テスト

- `services/position.ts`：Vitest で単体テスト（先頭・末尾・中間への挿入、振り直し）
- `routes/*`：Supertest で API テスト。テスト用の SQLite ファイルを使う
