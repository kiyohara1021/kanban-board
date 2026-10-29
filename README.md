# かんばんボード（React 学習用）

Trello のようなかんばんボードを作りながら React を学ぶプロジェクト。

## 技術スタック

| 分類           | 採用技術                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------- |
| フロントエンド | Vite / React 19 / TypeScript / Tailwind CSS / shadcn/ui / React Router / TanStack Query / dnd-kit |
| バックエンド   | Node.js / Express 5 / TypeScript / Prisma 7 / SQLite（libsql アダプター）                         |
| 共通           | Zod（バリデーションと型をフロント・バックで共有）                                                 |
| テスト         | Vitest / React Testing Library / Supertest                                                        |
| 品質管理       | oxlint / Prettier / GitHub Actions / Dependabot                                                   |
| パッケージ管理 | npm workspaces                                                                                    |

## 起動方法

Node.js 24 以上が必要。

```bash
npm install
npm run db:migrate -w backend
npm run db:seed -w backend
npm run dev
```

- `npm run db:migrate -w backend` は初回だけ実行する。SQLite のデータベース（`backend/prisma/dev.db`）が作られる
- `npm run db:seed -w backend` でサンプルのボードを入れる。実行するたびに、DB の中身がサンプルの状態に戻る
- `npm run dev` でフロントエンドとバックエンドが同時に起動する。http://localhost:5173 を開く

| コマンド                       | 内容                                                                  |
| ------------------------------ | --------------------------------------------------------------------- |
| `npm test`                     | 3つのパッケージのテスト（Vitest。backend は Supertest で API を試す） |
| `npm run build`                | フロントのビルドと、3つのパッケージの型チェック                       |
| `npm run lint`                 | lint（oxlint）                                                        |
| `npm run format`               | 整形（Prettier）                                                      |
| `npm run format:check`         | 整形されているかの確認（CI で使う）                                   |
| `npm run db:studio -w backend` | ブラウザで DB の中身を見る（Prisma Studio）                           |

## ディレクトリ構成

```
kanban-board/
├── .github/       CI、Issue / PR テンプレート、Dependabot
├── docs/          設計ドキュメント
├── frontend/      React アプリ（Vite の react-ts テンプレートから作成）
├── backend/       API サーバー（Prisma 公式の Express テンプレートから作成）
├── shared/        フロントとバックで共有する Zod スキーマ・型・並び順の計算（@kanban/shared）
└── package.json   npm workspaces のルート
```

## テンプレートから作ったもの

自分で書く必要のない部分は、公式のテンプレートや生成ツールを使っている。

| 対象                          | 使ったもの                                                                                                                      | 自分で変えたところ                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `frontend/`                   | `npm create vite`（react-ts）                                                                                                   | サンプル画面の削除、Tailwind・パスエイリアス        |
| `frontend/src/components/ui/` | `npx shadcn add`（button, dialog, alert-dialog, input, textarea, label）                                                        | 閉じるボタンの読み上げを日本語に変更                |
| `backend/`                    | `npx try-prisma --template orm/express`（[prisma-examples](https://github.com/prisma/prisma-examples/tree/latest/orm/express)） | PostgreSQL から SQLite に変更、構成を設計に合わせた |

shadcn の部品を追加するときは `frontend/` で `npx shadcn@latest add <部品名>` を実行する。

## 設計ドキュメント

1. [要件・画面](docs/01-requirements.md)
2. [データモデル](docs/02-data-model.md)
3. [API 設計](docs/03-api.md)
4. [フロントエンド設計](docs/04-frontend.md)
5. [バックエンド設計](docs/05-backend.md)

## 開発ステップ

React の学習に集中するため、最初はフロントエンドだけで作り、後からAPIとつなぐ。

| Step | 内容                              | 主に学ぶこと                                              |
| ---- | --------------------------------- | --------------------------------------------------------- |
| 1    | 固定データでボードを表示する      | コンポーネント分割、props、リスト描画と `key`             |
| 2    | カード・カラムの追加・編集・削除  | `useState` / `useReducer`、イミュータブルな更新、フォーム |
| 3    | ドラッグ&ドロップで並び替え・移動 | dnd-kit、イベント処理、ネストした状態の更新               |
| 4    | バックエンド API を作る           | Express、Prisma、Zod によるバリデーション                 |
| 5    | フロントと API をつなぐ           | TanStack Query、ローディング・エラー表示、楽観的更新      |
| 6    | 仕上げ                            | テスト、ルーティング（カード詳細モーダル）、追加機能      |

## ライセンス

[MIT](LICENSE)

## 参考

- [kawamou/kanban-board](https://github.com/kawamou/kanban-board)：コンポーネントの分け方、カスタムフックへの切り出し方
- [braiekhazem/react-kanban-kit](https://github.com/braiekhazem/react-kanban-kit)：ID をキーにした平らなデータ構造（[フロントエンド設計](docs/04-frontend.md#別案正規化した状態)を参照）
