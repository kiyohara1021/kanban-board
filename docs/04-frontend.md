# 04. フロントエンド設計

## ディレクトリ構成

機能（feature）ごとにフォルダを分ける。ボード・カラム・カードに関係するファイルを、それぞれ近くにまとめるため。

```
frontend/src/
├── main.tsx                  エントリ（QueryClientProvider と RouterProvider を置く）
├── routes.tsx                ルート定義（アプリとテストで同じものを使う）
├── pages/
│   ├── BoardListPage.tsx     /
│   ├── BoardPage.tsx         /boards/:boardId
│   └── CardDetailRoute.tsx   /boards/:boardId/cards/:cardId（BoardPage の子ルート）
├── features/
│   ├── boards/
│   │   ├── api.ts            fetch 関数（getBoards, getBoard, createBoard …）
│   │   ├── queries.ts        ボードの取得・作成・名前変更・削除のフックとクエリキー
│   │   ├── boardReducer.ts   ボードを変更するアクションと reducer
│   │   ├── actionValues.ts   アクションに入れる仮の ID と日時を作る関数
│   │   ├── useBoardAction.ts アクションを楽観的更新つきで API に送るフック
│   │   ├── useBoardDnd.ts    ドラッグ&ドロップの処理
│   │   └── components/       BoardHeader, BoardTile
│   ├── columns/
│   │   ├── api.ts
│   │   └── components/       BoardColumn, ColumnHeader
│   └── cards/
│       ├── api.ts
│       └── components/       CardItem, CardDetailModal
├── components/
│   ├── ui/                   shadcn/ui が生成した部品（button, dialog, sonner など）。直接は編集しない
│   ├── AddItemForm.tsx       「+ ○○を追加」から入力欄に切り替わるフォーム
│   ├── ConfirmDialog.tsx     削除前の確認ダイアログ（alert-dialog を使う）
│   ├── InlineEdit.tsx        見出しをクリックしてその場で名前を変える部品（ボード名・カラム名）
│   └── StatusMessage.tsx     読み込み中・エラー・ページが見つからないときの表示
├── lib/
│   ├── utils.ts              shadcn/ui が使う cn()（クラス名の結合）
│   ├── apiClient.ts          fetch の共通処理（ベース URL、エラー変換）
│   └── queryClient.ts        TanStack Query の設定
└── test/
    ├── setup.ts              テストの初期設定（jest-dom の読み込み、MSW のサーバーの起動・終了、テストごとの片付け）
    └── server.ts             画面のテストで /api を受ける MSW のサーバー（demo/handlers.ts を使い回す）
```

- Step 1〜3（API なし）の間は `api.ts` と `queries.ts` を作らず、`features/boards/boardReducer.ts` で状態を管理する
- Step 5 からは、カラムとカードの変更もすべて `useBoardAction` を通すので、`columns/` と `cards/` には `queries.ts` を作らない
- import は `@/`（`src/` を指す別名）で書く。例：`import { Button } from '@/components/ui/button'`
- `components/ui/` は shadcn/ui のコマンドで追加・更新するファイルなので、lint の対象から外している。見た目を変えたいときは、使う側で `className` を渡す

## コンポーネント構成

```
BoardListPage
├── BoardTile × n           クリックでボードを開く。× で削除（ConfirmDialog）
└── AddItemForm             ボードの作成。作ったらそのボードを開く

BoardPage
├── BoardHeader             一覧に戻るリンクと、ボード名のインライン編集（InlineEdit）
├── DndContext              dnd-kit のドラッグ範囲（設定は useBoardDnd が返す）
│   ├── SortableContext     カラムの並び（横方向）
│   │   └── BoardColumn × n カラム自体も並び替えられる
│   │       ├── ColumnHeader    ドラッグ用の取っ手、タイトルのインライン編集、削除ボタン（ConfirmDialog）
│   │       ├── SortableContext カードの並び（縦方向）。id はカラムの ID
│   │       │   └── CardItem × n  クリックか Enter で CardDetailModal を開く
│   │       └── AddItemForm     カードの追加
│   ├── AddItemForm         カラムの追加
│   └── DragOverlay         ドラッグ中に指やマウスに付いていく表示（CardPreview / ColumnPreview）
└── <Outlet />              子ルート。URL に /cards/:cardId があるときだけ CardDetailRoute → CardDetailModal
```

## 状態をどこに置くか

| 状態                           | 置き場所                    | 理由                                                     |
| ------------------------------ | --------------------------- | -------------------------------------------------------- |
| ボード・カラム・カードのデータ | TanStack Query のキャッシュ | サーバーのデータなので、取得・キャッシュ・再取得を任せる |
| 開いているカード               | URL（`/cards/:cardId`）     | リロードや共有に対応できる                               |
| ドラッグ中の ID と仮のボード   | `useBoardDnd` の `useState` | ドラッグ中だけ使う一時的な状態                           |
| フォームの入力値               | 各フォームの `useState`     | そのコンポーネントの中でしか使わない                     |

アプリ全体で共有する UI の状態がないため、MVP では Zustand などは使わない。

## Step 1〜3：useReducer で状態を管理する

API とつなぐ前は、ボード全体を1つの reducer で管理する。イミュータブルな更新を練習するのが目的。

```ts
type BoardAction =
  // Step 2
  | { type: 'addColumn'; id: string; title: string; now: string }
  | { type: 'renameColumn'; columnId: string; title: string; now: string }
  | { type: 'deleteColumn'; columnId: string }
  | { type: 'addCard'; id: string; columnId: string; title: string; now: string }
  | { type: 'updateCard'; cardId: string; title?: string; description?: string; now: string }
  | { type: 'deleteCard'; cardId: string }
  // Step 3
  | { type: 'moveColumn'; columnId: string; index: number; now: string }
  | { type: 'moveCard'; cardId: string; toColumnId: string; index: number; now: string }
```

- 新しい ID（`id`）と日時（`now`）はイベントハンドラーで作ってアクションに入れる。reducer の中で `crypto.randomUUID()` や `new Date()` を呼ぶと純粋な関数でなくなり、StrictMode で reducer が2回呼ばれたときに結果がずれる
- 変更しないカラムは同じオブジェクトのまま返す。`memo` で再描画を省くときに、この「参照が変わっていない」ことが前提になる
- `moveColumn` と `moveCard` の引数は、API の `/move` と同じ形にしておく。Step 5 で API に置き換えるときに、呼び出し側を変えずに済む
- Step 1〜5 では、開いているカードを `BoardPage` の `useState` に ID だけで持っていた。Step 6 で URL に移した

### 別案：正規化した状態

API のレスポンスと同じ入れ子の形（ボード → カラム → カード）で持つと、カードを1枚更新するだけでも、親のカラムとボードをコピーし直す必要がある。[react-kanban-kit](https://github.com/braiekhazem/react-kanban-kit) のように、ID をキーにした平らなマップで持つ方法もある。

```ts
type NormalizedBoard = {
  columnOrder: string[] // カラム ID の並び
  columns: Record<string, { id: string; title: string; cardIds: string[] }>
  cards: Record<string, Card>
}
```

- 利点：カードの更新は `cards[id]` を差し替えるだけで済み、移動は `cardIds` 配列の付け替えだけで済む
- 欠点：API のレスポンスを変換する処理が必要になる

まずは入れ子のまま作り、更新処理が書きにくいと感じたらこの形に作り直してみると、正規化の効果を実感しやすい。

## Step 3：ドラッグ&ドロップ

`@dnd-kit/core` と `@dnd-kit/sortable`（安定版）を使う。後継の `@dnd-kit/react` はまだ 0.x のため使わない。ドラッグに関する処理は、カスタムフック `features/boards/useBoardDnd.ts` にまとめる。

### 並び順の計算

`@kanban/shared` の `positionForInsert(items, index)` で計算する（[データモデル](02-data-model.md)のルールどおり）。React に依存しない関数なので、バックエンドも同じ関数で保存する値を計算する。

### 仮のボード（dragBoard）

- カードを別のカラムの上に動かしたとき（`onDragOver`）は、ドラッグ中だけ使う仮のボードの中でカードを移し、画面に映す
- 本物のボードは、ドロップしたとき（`onDragEnd`）に `moveCard` を1回だけ dispatch して更新する。Step 5 では、ここが API 呼び出し1回になる
- 同じカラムの中の並び替えは、dnd-kit が見た目（`transform`）だけずらしてくれるので、ドロップまで何もしない

### 操作方法

| 操作       | ドラッグの始め方                                               | 補足                                                    |
| ---------- | -------------------------------------------------------------- | ------------------------------------------------------- |
| マウス     | 5px 以上動かす                                                 | それより小さい動きはクリック（カードを開く）として扱う  |
| タッチ     | 250ms 長押し                                                   | すぐ指を動かしたときは横スクロールになる                |
| キーボード | Space で持ち上げ、矢印キーで移動、Space で置く、Esc で取り消し | Enter はカードを開くのに使う。←→ キーで隣のカラムへ移る |

カラムは、見出しの左にある取っ手（⋮⋮）だけでドラッグする。見出しのクリックは名前の変更に使うため。

### つまずいた点

- **カラムを移った直後の行ったり来たり**：移った直後は要素の位置の測り直しが間に合わず、古い位置で判定すると元のカラムに戻され、無限ループになる。移った直後の1フレームは判定を止める（`movedToNewColumnRef`）
- **キーボードで高さの違うカードを飛び越える**：重なりの大きさで判定すると、1つ下ではなく2つ下が選ばれることがある。キーボードのときは角の近さ（`closestCorners`）で判定する
- **キーボードで隣のカラムに移れない**：標準の `sortableKeyboardCoordinates` は1つのリストの中の移動を前提にしているので、←→ キーのときだけ「隣のカラムの先頭」を返す独自の関数を使う
- **ドロップ後にフォーカスが外れる**：`setActivatorNodeRef` でドラッグを始めた要素を教えておくと、dnd-kit がそこにフォーカスを戻す
- **Enter でカードを開くと、すぐ閉じる**：同じ Enter が、開いたダイアログの入力欄に届いてフォームの送信になっていた。`event.preventDefault()` で止める

## Step 5：TanStack Query

### クエリキー

| キー                  | データ                             |
| --------------------- | ---------------------------------- |
| `["boards"]`          | ボード一覧                         |
| `["boards", boardId]` | ボード詳細（カラムとカードを含む） |

キーは `features/boards/queries.ts` の `boardKeys` にまとめる。

当初はカード単体の `["cards", cardId]` も用意する予定だったが、ボード詳細にカードが含まれているので使っていない（Step 6 を参照）。

### ファイルの分け方

| ファイル                            | 役割                                                                 |
| ----------------------------------- | -------------------------------------------------------------------- |
| `lib/apiClient.ts`                  | `apiFetch`：`/api` を付けて送り、エラーを `ApiError` に変える        |
| `lib/queryClient.ts`                | `QueryClient` の設定（`staleTime` 10秒、再試行は 5xx のとき1回だけ） |
| `features/*/api.ts`                 | エンドポイントごとの関数（`getBoard`、`moveCard` など）              |
| `features/boards/queries.ts`        | ボードの取得・作成・名前変更・削除のフック                           |
| `features/boards/useBoardAction.ts` | ボードを変更するアクションを、楽観的更新つきで API に送るフック      |

### すべての変更を楽観的更新にする

当初はドラッグ&ドロップだけを楽観的更新にする予定だったが、Step 2〜3 の `boardReducer` がそのまま使えるので、カード・カラムの追加・編集・削除・移動をすべて同じ仕組みにした。画面からは、Step 2〜3 の `dispatch` と同じ形で `run(action)` を呼ぶだけでよい。

1. `onMutate`：進行中の取得をキャンセルし、今のキャッシュを保存してから、`boardReducer` でキャッシュを書き換える（画面がすぐ変わる）
2. `mutationFn`：アクションを対応する API の呼び出しに変えて送る（`sendAction`）。アクションの形を API と揃えておいたので、ほぼそのまま渡せる
3. `onError`：保存しておいたキャッシュに戻し、サーバーのエラーメッセージを通知（sonner）で出す
4. `onSettled`：`["boards", boardId]` を無効化して、サーバーの状態と合わせる。ただし、続けて操作して別の変更がまだ送信中のときは、最後の1件が終わるまで待つ（途中で取り直すと、送信中の変更が一瞬元に戻って見えるため）

ドラッグ中は、Step 3 の仮のボード（`dragBoard`）で見た目だけを動かし、ドロップしたときに `run` を1回だけ呼ぶ。そのため、API の呼び出しはドロップ1回につき1回で済む。

### 注意点

- 追加したカードやカラムは、保存が終わって取り直すまでの短い間、画面で作った仮の ID を持つ。この間にそのカードを編集すると、サーバーにない ID なので 404 になる
- 取得してから10秒たったデータは、画面にフォーカスが戻ったときなどに自動で取り直す。別のタブで削除されたカードは、そのときに画面から消える

## Step 6：ルーティングとテスト

### ルート

`routes.tsx` に定義し、`main.tsx` では `createBrowserRouter`（ブラウザの URL）、テストでは `createMemoryRouter`（メモリ上の URL）に同じ定義を渡す。

| パス                             | コンポーネント    | 内容                                                       |
| -------------------------------- | ----------------- | ---------------------------------------------------------- |
| `/`                              | `BoardListPage`   | ボードの一覧・作成・削除                                   |
| `/boards/:boardId`               | `BoardPage`       | ボード。ボード名をクリックすると名前を変えられる           |
| `/boards/:boardId/cards/:cardId` | `CardDetailRoute` | `BoardPage` の子ルート。ボードの上にカード詳細を重ねて出す |
| `*`                              | -                 | 「ページが見つかりません」                                 |

### カード詳細を子ルートにする

- `BoardPage` は取得したボードと `run` を `<Outlet context={...} />` で子に渡し、`CardDetailRoute` は `useOutletContext` で受け取る。カードの情報はボード詳細に含まれているので、カード単体の API は呼ばない
- カードを開くと URL が `/cards/:cardId` に変わる。ブラウザの「戻る」で閉じ、「進む」で開き直せる。URL を直接開いても、リロードしても開いたままになる
- 存在しないカードの URL（削除されたカードなど）は、`<Navigate replace />` でボードに戻す。`replace` にすると、「戻る」でその URL に戻ってこない

### エラーの表示

- 存在しないボード（404）は「ボードが見つかりません」と一覧へのリンクを出す。何度読み込んでも結果は変わらないので、再読み込みボタンは出さない
- 4xx のエラーは自動で再試行しない（`lib/queryClient.ts`）

### 画面のテスト（React Testing Library）

- `vite.config.ts` の `test.environment` を `jsdom` にして、Node の上で DOM を使えるようにする
- 要素は、画面に見えている文字や役割（`getByRole('button', { name: '追加' })` など）で探す。利用者と同じ見え方でテストするため、クラス名や内部の構造には頼らない
- 操作は `userEvent` で、クリックやキー入力を実際の順番どおりに起こす。日本語入力の変換中の Enter（`isComposing`）だけは `userEvent` で再現できないので `fireEvent` を使う
- `routes.test.tsx` では、ボード一覧からの作成、カードの URL を直接開く、存在しない URL、一覧の取得に失敗したときの表示、を確かめる

### API を MSW で受ける

画面のテストでは、`fetch` を `vi.stubGlobal` で差し替えず、MSW（`msw/node` の `setupServer`）で `/api` へのリクエストを受ける。`fetch` を差し替えると「どの URL に何を返すか」をテストごとに書くことになり、本物の API とずれても気付けない。MSW なら `fetch` と `apiClient.ts` は本物のまま動き、ネットワークの手前で受け取るだけになる。

- ハンドラーはデモ版の `src/demo/handlers.ts` をそのまま使う。デモ版の API は `backend/src/services/` と同じ規則で動く（`demo/api.test.ts` で確かめている）ので、画面のテストもバックエンドに近い動きで試せる
- DB は jsdom の `localStorage`。`test/setup.ts` がテストごとに空の DB を保存するので、テストは必要なデータを `saveDb` で用意してから画面を描く。保存されたかどうかは `loadDb` で確かめる
- `test/setup.ts` は、全テストの前に `server.listen()`、各テストのあとに `server.resetHandlers()`、最後に `server.close()` を呼ぶ。ハンドラーのない URL へのリクエストは、`onUnhandledFrame: 'error'` でテストを失敗させる
- 特定のテストだけエラーを返したいときは、そのテストの中で `server.use(http.get(...))` を呼ぶ。足したハンドラーは元のハンドラーより先に使われ、テストが終わると `resetHandlers` で外れる。`{ once: true }` を付けると1回だけ使われる
- `src/demo/handlers.ts` は、デモ版では150ms 待ってから返すが、テスト（`import.meta.env.MODE` が `test`）では待たせない。それでもレスポンスは非同期に届くので、画面の変化は `findBy〜`（見つかるまで待つ）で確かめる
- reducer や `apiClient.ts` など、画面を描かない `*.test.ts` は、今までどおり `vi.stubGlobal` で `fetch` を差し替えて、渡した引数や返り値を細かく確かめる

## デモ版（GitHub Pages）

https://kiyohara1021.github.io/kanban-board/ で公開している。GitHub Pages は静的なファイルしか配信できないので、バックエンドの代わりに MSW がブラウザの中で API を再現する。

### 仕組み

| ファイル                  | 役割                                                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `src/demo/db.ts`          | バックエンドの3つのテーブルと同じ形のデータを `localStorage` に保存する。初回はサンプルを作る                                    |
| `src/demo/api.ts`         | 14本のエンドポイントの処理。`backend/src/services/` と同じ規則で、検証と並び順は shared を使う                                   |
| `src/demo/handlers.ts`    | MSW のハンドラー。URL と処理を結び付け、バックエンドと同じ形のレスポンスを返す（デモ版では150ms 待たせる）。画面のテストでも使う |
| `src/demo/browser.ts`     | Service Worker を登録して、`/api` へのリクエストを受け取り始める                                                                 |
| `src/demo/DemoBanner.tsx` | 「デモ版」の表示と、データを初期状態に戻すボタン                                                                                 |

- `npm run build:demo`（`vite build --mode demo`）で、`.env.demo` の `VITE_DEMO=true` が読み込まれる。`main.tsx` はそのときだけ、デモ用のコードを動的 import で読み込み、MSW の準備が終わってから画面を描く。通常のビルドには MSW が含まれない
- Service Worker のファイル（`mockServiceWorker.js`）は、`vite.config.ts` の `msw/vite` プラグイン（`worker-only` モード）がデモ版のビルドのときだけ出力する。リポジトリには入れない
- データは訪れた人のブラウザに保存されるので、ほかの人のデータを壊すことはない

### GitHub Pages 特有の設定

- **公開する場所**：`https://kiyohara1021.github.io/kanban-board/` のように `/kanban-board/` の下になる。Vite の `base` と React Router の `basename`（`import.meta.env.BASE_URL`）を合わせている
- **URL を直接開いたとき**：Pages には「どの URL にも `index.html` を返す」設定がない。`/kanban-board/boards/xxx` を直接開くと 404 になるので、ビルドのあとに `index.html` を `404.html` としてコピーし、404 のページでもアプリが起動するようにしている
- **公開の手順**：`.github/workflows/pages.yml` が、`main` へのプッシュのたびにデモ版をビルドして公開する

## スタイル

- Tailwind CSS を使う
- カラムは横並びで、画面幅を超えたら横スクロールする
- スマートフォンでも、カラム1列分の幅で横スワイプして操作できるようにする
