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
├── prisma.config.ts          Prisma CLI の設定（スキーマの場所、DB の URL、seed のコマンド）
├── vitest.config.ts          テストの設定（テスト専用の DB を使う）
├── .env.example              環境変数の例（.env がなくても初期値で動く）
├── prisma/
│   ├── schema.prisma         データモデル（02-data-model.md と同じ内容）
│   ├── migrations/           マイグレーション（Git に含める）
│   ├── seed.ts               動作確認用のサンプルデータ
│   ├── generated/            prisma generate で作られるクライアント（Git に含めない）
│   └── dev.db / test.db      SQLite のデータベース（Git に含めない）
├── src/
│   ├── index.ts              サーバー起動（app.listen）
│   ├── app.ts                Express アプリの組み立て（テストからも読み込む）
│   ├── config.ts             環境変数の読み込みと初期値
│   ├── errors.ts             HttpError / ValidationError / NotFoundError
│   ├── routes/               URL ごとの処理（boards.ts, columns.ts, cards.ts）
│   ├── services/             DB の操作（boardService.ts, columnService.ts, cardService.ts）
│   ├── middlewares/
│   │   └── errorHandler.ts   エラーを docs/03-api.md の JSON 形式に変換、404 の処理
│   └── lib/
│       ├── prisma.ts         PrismaClient の生成
│       └── validate.ts       parseBody：Zod スキーマでリクエストボディを検証
└── test/
    ├── globalSetup.ts        テストの前にテスト用 DB を作り直す
    └── api.test.ts           Supertest による API のテスト
```

## 役割分担

| 層          | 役割                                                      | 書かないこと         |
| ----------- | --------------------------------------------------------- | -------------------- |
| routes      | URL とメソッドの対応、入力の検証、ステータスコードの決定  | DB の操作            |
| services    | DB の操作、並び順の計算、トランザクション、エラーの throw | `req` / `res` の扱い |
| middlewares | エラー処理など、全ルート共通の処理                        | 個別の業務ロジック   |

`app.ts` と `index.ts` を分けておくと、テストで Supertest に `app` を渡すだけで、サーバーを起動せずに API を試せる。

## 入力の検証

routes の中で `parseBody(スキーマ, req.body)` を呼ぶ。検証に通ると型の付いた値が返り、通らなければ `ValidationError`（400）を throw する。

最初はミドルウェア（`middlewares/validate.ts`）にする予定だったが、ミドルウェアでは `req.body` の型が付かないため、ルートの中で呼ぶ関数にした。

## エラー処理

Express 5 は、async 関数の中で throw されたエラーを自動でエラーハンドラーに渡す（4.x では `try/catch` か専用のラッパーが必要だった）。そのため routes と services はエラーを throw するだけでよく、`errorHandler.ts` でまとめて JSON にする。

| エラー                                        | ステータス | code               |
| --------------------------------------------- | ---------- | ------------------ |
| `ValidationError`（入力の検証に失敗）         | 400        | `VALIDATION_ERROR` |
| JSON として読めないリクエストボディ           | 400        | `VALIDATION_ERROR` |
| `NotFoundError`（取得しようとした ID がない） | 404        | `NOT_FOUND`        |
| Prisma の P2025（更新・削除する ID がない）   | 404        | `NOT_FOUND`        |
| どのルートにも当てはまらない URL              | 404        | `NOT_FOUND`        |
| それ以外                                      | 500        | `INTERNAL_ERROR`   |

更新・削除は、先に存在を確かめずにそのまま実行し、対象がなければ Prisma が投げる P2025 を 404 に変える。確認のためのクエリを1回減らせる。

## 並び順

- 計算は shared の `positionForInsert` を使う（フロントの仮の並びと同じ計算）
- 移動（`/move`）と末尾への追加は、並びの読み取りから書き込みまでを `prisma.$transaction` で囲む
- 隙間が狭すぎて振り直したときは、同じカラム（またはボード）のほかの要素の position も保存する
- カードの移動先は、移動元と同じボードのカラムに限る。違うボードのカラムや存在しないカラムを指定すると 400

## shared パッケージ（@kanban/shared）

```
shared/src/
├── schemas.ts    Zod スキーマと、z.infer で作った型（Board, Column, Card, BoardDetail, 各リクエストの入力）
├── position.ts   並び順の計算（positionForInsert）
└── index.ts
```

- バックエンドは `schemas.ts` のスキーマでリクエストを検証する
- フロントエンドは型と文字数制限（`CARD_TITLE_MAX` など）を使う
- 文字数制限などのルールを1か所で管理できる
- ビルドはせず、`package.json` の `exports` で TypeScript のソースをそのまま公開している。Vite・tsx・Vitest がそれぞれ TypeScript を読めるため

## 開発環境

| 項目           | 内容                                                                                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ポート         | フロントエンド 5173（Vite）、バックエンド 3000（環境変数 `API_PORT` で変更できる）                                                                          |
| API の呼び出し | Vite の `server.proxy` で `/api` を 3000 番に転送する（CORS の設定が不要になる）                                                                            |
| DB             | SQLite（`backend/prisma/dev.db`）。Git には含めない                                                                                                         |
| 実行           | ルートで `npm run dev` を実行し、フロントとバックを同時に起動する（concurrently）                                                                           |
| DB の操作      | `npm run db:migrate -w backend`（マイグレーション）、`npm run db:seed -w backend`（サンプルデータ）、`npm run db:studio -w backend`（ブラウザで中身を見る） |

ポートの環境変数を `PORT` にしなかったのは、ほかの開発ツールが `PORT` を設定することがあり、意図しないポートで起動してしまうため。

## テスト

- `shared/src/position.test.ts`：並び順の計算の単体テスト（先頭・末尾・中間への挿入、振り直し）
- `backend/test/api.test.ts`：Supertest による API のテスト。正常な操作に加え、入力エラー・404・別のボードへの移動・振り直しを確かめる
- テスト用の DB（`prisma/test.db`）は、テストのたびに作り直してマイグレーションを当てる。各テストの前に全ボードを削除する
