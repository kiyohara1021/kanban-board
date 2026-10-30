# AGENTS.md

AI エージェント（Claude Code、Codex、Cursor、GitHub Copilot など）向けの説明。人向けの説明は [README.md](README.md)、設計は [docs/](docs/) にある。

## このリポジトリについて

React を学ぶためのかんばんボード。学習者がコードを読んで真似することを前提にしている。

- コードは、短さより読みやすさを優先する。学習者が一度に理解できる以上の抽象化（汎用のファクトリー関数、複雑な型パズルなど）は入れない
- コメントとドキュメントは日本語で書く。コメントには「何をしているか」より「なぜそうするか」を書く。React や各ライブラリの考え方に関わる箇所には、学習者向けの短い説明を付けてよい
- `step-2` 〜 `step-6` のタグは、各 Step の完成形として学習者が使う。**タグを動かしたり、タグが指す履歴を書き換えたりしない**

## 構成

npm workspaces のモノレポ。Node.js 24 以上で動き、推奨は 26（`.nvmrc`）。CI は 24 と 26 の両方で動かしている。

| パッケージ                    | 内容                                                                                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/`                   | Vite + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui（Radix）+ TanStack Query + React Router v8 + dnd-kit + react-error-boundary |
| `backend/`                    | Express 5 + Prisma 7 + SQLite（`@prisma/adapter-libsql`）                                                                              |
| `shared/`（`@kanban/shared`） | Zod スキーマ、型、文字数制限、並び順の計算。ビルドせず TypeScript のソースをそのまま公開する                                           |

## コマンド

ルートで実行する。特定のパッケージだけなら `-w frontend` のように付ける。

```bash
npm install
npm run db:migrate -w backend   # 初回、またはスキーマを変えたとき
npm run db:seed -w backend      # サンプルデータに戻す
npm run dev                     # フロント（5173）とバック（3000）を同時に起動
npm test                        # 3パッケージのテスト
npm run lint                    # oxlint
npm run format                  # Prettier（format:check で確認だけ）
npm run build                   # フロントのビルドと3パッケージの型チェック
npm run build:demo              # GitHub Pages 用のデモ版（確認は npm run preview:demo -w frontend）
```

作業を終える前に、`npm run format:check`、`npm run lint`、`npm test`、`npm run build` がすべて通ることを確かめる。CI（`.github/workflows/ci.yml`）も同じ4つを実行する。

## 設計の要点

詳しくは [docs/04-frontend.md](docs/04-frontend.md) と [docs/05-backend.md](docs/05-backend.md)。

### 共通

- リクエストの検証ルール、型、文字数制限は `shared/src/schemas.ts` だけに書く。フロントとバックで別々に定義しない
- 並び順は小数の `position` で持ち、計算は必ず `shared/src/position.ts` の `positionForInsert` を使う。`index` は「移動する要素自身を除いた並び」で数える

### フロントエンド

- `main.tsx` は起動（デモ版の準備と `<App />` の描画）だけにする。アプリ全体の Provider は `app/provider.tsx`、ルーターは `app/router.tsx`、ルート定義は `app/routes/index.tsx` に書く
- ページ（`pages/`）はルートの `lazy` で読み込む。ページを足すときも `lazy` で書き、ルート定義から `import ... from` でページを読み込まない（ビルドでページごとにファイルが分かれなくなる）
- 描画中のエラーは、内側から順に `SectionErrorBoundary`（ページの一部）、ルートの `ErrorBoundary`（`app/routes/RouteErrorBoundary.tsx`）、`app/provider.tsx` の `ErrorBoundary`（アプリ全体）で受け止める。エラー画面は `components/ErrorFallback.tsx` を使う。取得の失敗はこれまでどおり `isError` を見てページの中で出す
- エラー画面を変えたら、描画中に throw する一時的なコードでエラー画面と「再試行」「再読み込み」を確かめ、確かめたら消す
- ボードを変更する操作は、すべて `features/boards/boardReducer.ts` のアクションとして表す。画面からは `useBoardAction` が返す `run(action)` を呼ぶ。これがキャッシュを reducer で先に書き換え（楽観的更新）、`sendAction` で API に送り、失敗したら元に戻す
- reducer は純粋な関数に保つ。新しい ID と日時は `features/boards/actionValues.ts` の `newId()` / `now()` でイベントハンドラー側で作り、アクションに入れる
- アクションの形は API（`docs/03-api.md`）と揃える。アクションを追加・変更したら、`sendAction` とそのテストも直す
- ドラッグ中の見た目は `useBoardDnd` の仮のボード（`dragBoard`）で動かし、`run` を呼ぶのはドロップしたときの1回だけ
- 開いているカードは URL（`/boards/:boardId/cards/:cardId`、`BoardPage` の子ルート）で表す。ボードのデータは `<Outlet context>` で子に渡す
- import は `@/`（`frontend/src`）と `@kanban/shared` を使う
- `src/components/ui/` は shadcn/ui が生成したファイル。直接編集せず、部品は `npx shadcn@latest add <名前>` で追加する（`frontend/` で実行）。lint の対象外。見た目は使う側で `className` を渡して変える
- `<button>` には `type` を明示する（shadcn の `Button` は初期値が `submit`）
- テキスト入力で Enter を扱うときは、日本語入力の変換確定を除外する（`event.nativeEvent.isComposing`）

### バックエンド

- `routes/` は URL、入力の検証（`lib/validate.ts` の `parseBody`）、ステータスコードだけ。DB の操作は `services/` に書く
- エラーは `errors.ts` の `HttpError` / `ValidationError` / `NotFoundError` を throw する。Express 5 なので async の中で throw すれば `middlewares/errorHandler.ts` に届く。`try/catch` で包まない
- 更新・削除で対象がないときは、Prisma の P2025 を errorHandler が 404 にする。事前に存在確認のクエリを足さない
- 並び順を読んでから書く処理（追加、移動）は `prisma.$transaction` で囲む
- ポートの環境変数は `API_PORT`（`PORT` は他のツールとぶつかるので使わない）
- スキーマを変えたら `npm run db:migrate -w backend` でマイグレーションを作り、`docs/02-data-model.md` も直す

### デモ版（GitHub Pages）

- `main` へのプッシュで `.github/workflows/pages.yml` が `npm run build:demo` を実行し、https://kiyohara1021.github.io/kanban-board/ に公開する
- デモ版では MSW（`frontend/src/demo/`）が `/api` をブラウザの中で受け、`localStorage` を DB として API を再現する。**API の動き（エンドポイント、検証、エラー、並び順）を変えたら、`backend/src/services/` と同じ変更を `frontend/src/demo/api.ts` にも入れ、`frontend/src/demo/api.test.ts` も直す**
- デモ版は `/kanban-board/` の下で動くので、URL やファイルのパスは `import.meta.env.BASE_URL` を使い、`/` から始まる固定のパスを書かない（API の `/api` は MSW が受けるので例外）
- 通常のビルドに MSW が入らないよう、デモ用のコードは `main.tsx` から動的 import でだけ読み込む

## テスト

| 対象                                  | 場所                            | 方法                                                                                                                                        |
| ------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 並び順の計算                          | `shared/src/position.test.ts`   | Vitest                                                                                                                                      |
| reducer、API クライアント、sendAction | `frontend/src/**/*.test.ts`     | Vitest。fetch は `vi.stubGlobal` で偽物にする                                                                                               |
| 画面                                  | `frontend/src/**/*.test.tsx`    | React Testing Library（jsdom）。API は MSW（`frontend/src/test/server.ts`）がデモ版のハンドラーで受ける。要素は role と表示される文字で探す |
| API                                   | `backend/test/api.test.ts`      | Supertest。テスト専用の `prisma/test.db` を毎回作り直す                                                                                     |
| デモ版の API                          | `frontend/src/demo/api.test.ts` | Vitest。バックエンドの API テストと同じ規則で動くことを確かめる                                                                             |

- 画面のテストでは、クラス名や DOM の構造ではなく `getByRole('button', { name: '追加' })` のように探す
- 画面のテストでは `fetch` を差し替えない。`frontend/src/test/setup.ts` が MSW のサーバーを起動し、テストごとに DB（jsdom の `localStorage`）を空にするので、データは `saveDb` で用意する。特定のテストだけエラーを返すときは、そのテストの中で `server.use` を呼ぶ
- `frontend/src/demo/handlers.ts` は画面のテストでも使うので、変えたら `npm test` で画面のテストも通ることを確かめる
- 画面の変更は、テストに加えて `npm run dev` でブラウザでも確かめる。ドラッグ&ドロップはマウスとキーボード（Space・矢印キー）の両方で確認する

## ドキュメントの更新

- API を変えたら `docs/03-api.md`、データモデルを変えたら `docs/02-data-model.md`、構成や方針を変えたら `docs/04-frontend.md` / `docs/05-backend.md` を、同じ変更の中で直す
- 新しいライブラリやコマンドを入れたら README の「技術スタック」「起動方法」も直す

## 依存パッケージの注意

- `npm install -w <パッケージ> A` と `npm install -w <パッケージ> B` を `&&` で続けて実行すると、先に入れたものが `package.json` に残らないことがある。インストールしたら `package.json` を確認する
- Prisma は npm の `latest` タグが RC 版を指していたことがあるので、バージョンを明示して入れる（今は 7.x）
- dnd-kit は安定版の `@dnd-kit/core` / `@dnd-kit/sortable` を使う。後継の `@dnd-kit/react` は 0.x のため使わない
- `@types/node` は、サポートする一番古い Node.js 24 に合わせる。26 の型にすると、24 にない機能を使ってもエラーにならないため（Dependabot でもメジャー更新を除外している）
- Node.js 26 にしかない機能は使わない。使う必要が出たら、`package.json` の `engines`、CI の対象バージョン、`@types/node` を揃えて上げる
- `backend/prisma/generated/` は `prisma generate` で作られるファイル。編集せず、Git と Prettier の対象外

## Git

- 作業はブランチを切って行い、`main` に早送りマージする（履歴を一直線に保つ）
- コミットメッセージは日本語。1行目に何をしたか、本文に箇条書きで主な変更を書く
- DB ファイル（`*.db`）、`prisma/generated/`、`.env`、`.claude/settings.local.json` はコミットしない
