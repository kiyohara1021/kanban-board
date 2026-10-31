# 04. フロントエンド設計

## ディレクトリ構成

機能（feature）ごとにフォルダを分ける。ボード・カラム・カードに関係するファイルを、それぞれ近くにまとめるため。アプリ全体の組み立て（Provider とルート）は `app/` にまとめる（[bulletproof-react](https://github.com/alan2207/bulletproof-react) の `src/app` にならった）。

```
frontend/src/
├── main.tsx                  エントリ。デモ版の準備をして、<App /> を描くだけ
├── app/
│   ├── index.tsx             App：AppProvider の中に AppRouter を置く
│   ├── provider.tsx          アプリ全体の Provider（エラーバウンダリー、QueryClientProvider、Toaster、DemoBanner）
│   ├── router.tsx            createBrowserRouter でルーターを作り、RouterProvider で描く
│   └── routes/
│       ├── index.tsx         ルート定義（アプリとテストで同じものを使う）。ページは lazy で読み込む
│       ├── RootLayout.tsx    すべてのページの親。ページの読み込み中に上端の帯を出す
│       ├── RouteErrorBoundary.tsx ページの描画中のエラーを受け止める画面
│       ├── PageLoading.tsx   最初のページを読み込んでいる間の表示
│       └── NotFoundPage.tsx  どのルートにも当てはまらない URL
├── pages/                    URL ごとのページ。features の部品を組み合わせる
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
│   ├── cards/
│   │   ├── api.ts
│   │   ├── dueDate.ts        期限日を「11月5日」の形にする formatDueDate
│   │   ├── useToday.ts       今日の日付を返すフック（日付が変わったら描画し直す）
│   │   └── components/       CardItem, CardDetailModal
│   └── labels/
│       ├── api.ts            createLabel, deleteLabel
│       ├── queries.ts        ラベルの作成のフック（楽観的更新をしない）
│       ├── labelColors.ts    色の名前と Tailwind CSS のクラスの対応、カードのラベルを引く labelsOfCard
│       └── components/       LabelChip（ラベルの表示）、LabelPicker（カード詳細でのラベルの選択・作成・削除）
├── components/
│   ├── ui/                   shadcn/ui が生成した部品（button, dialog, sonner など）。直接は編集しない
│   ├── AddItemForm.tsx       「+ ○○を追加」から入力欄に切り替わるフォーム
│   ├── ConfirmDialog.tsx     削除前の確認ダイアログ（alert-dialog を使う）
│   ├── ErrorFallback.tsx     描画中のエラーを受け止めたときに出す画面（メッセージ、再試行、一覧へのリンク）
│   ├── InlineEdit.tsx        見出しをクリックしてその場で名前を変える部品（ボード名・カラム名）
│   ├── SectionErrorBoundary.tsx ページの一部だけを包むエラーバウンダリー（ボードの表示部分）
│   └── StatusMessage.tsx     読み込み中・エラー・ページが見つからないときの表示
├── lib/
│   ├── utils.ts              shadcn/ui が使う cn()（クラス名の結合）
│   ├── apiClient.ts          fetch の共通処理（ベース URL、エラー変換）
│   └── queryClient.ts        TanStack Query の設定
└── test/
    ├── setup.ts              テストの初期設定（jest-dom の読み込み、MSW のサーバーの起動・終了、テストごとの片付け）
    ├── server.ts             画面のテストで /api を受ける MSW のサーバー（demo/handlers.ts を使い回す）
    └── renderApp.tsx         画面のテストで使うサンプルのデータと、ルート定義ごとアプリを描く renderApp
```

- Step 1〜3（API なし）の間は `api.ts` と `queries.ts` を作らず、`features/boards/boardReducer.ts` で状態を管理する
- Step 5 からは、カラムとカードの変更もすべて `useBoardAction` を通すので、`columns/` と `cards/` には `queries.ts` を作らない。`labels/` にだけあるのは、ラベルの作成が楽観的更新をしない例外だから（「ラベル」の節）
- `app/` は「アプリをどう組み立てるか」、`pages/` は「その URL で何を出すか」、`features/` は「ボード・カラム・カードの機能」と、役割で分ける。bulletproof-react ではページも `app/routes/` に置くが、ここでは Step 6 までと同じ `pages/` に残し、`app/routes/` にはルートの枠組み（レイアウト、エラー、404）だけを置いた
- import は `@/`（`src/` を指す別名）で書く。例：`import { Button } from '@/components/ui/button'`
- `components/ui/` は shadcn/ui のコマンドで追加・更新するファイルなので、lint の対象から外している。見た目を変えたいときは、使う側で `className` を渡す

## コンポーネント構成

```
App
├── AppProvider             app/provider.tsx
│   ├── ErrorBoundary       react-error-boundary。ルーターの外のエラーを受け止める（「再試行」でクエリもリセット）
│   │   └── QueryClientProvider
│   │       ├── AppRouter   app/router.tsx（RouterProvider）
│   │       └── Toaster     通知（sonner）の表示場所
│   └── DemoBanner          デモ版だけ。エラー画面でも押せるよう、エラーバウンダリーの外に置く
└── ルート（app/routes/index.tsx）
    └── RootLayout          ErrorBoundary: RouteErrorBoundary、HydrateFallback: PageLoading
        ├── BoardListPage   /（lazy）
        ├── BoardPage       /boards/:boardId（lazy）
        │   └── CardDetailRoute  cards/:cardId（lazy）
        └── NotFoundPage    *

BoardListPage
├── BoardTile × n           クリックでボードを開く。× で削除（ConfirmDialog）
└── AddItemForm             ボードの作成。作ったらそのボードを開く

BoardPage                   ボードの取得。読み込み中・取得のエラーはここで出す
└── BoardView
    ├── BoardHeader         一覧に戻るリンクと、ボード名のインライン編集（InlineEdit）
    ├── SectionErrorBoundary  中が壊れても、ヘッダーは残る
    │   └── BoardColumns
    │       └── DndContext  dnd-kit のドラッグ範囲（設定は useBoardDnd が返す）
    │           ├── SortableContext     カラムの並び（横方向）
    │           │   └── BoardColumn × n カラム自体も並び替えられる
    │           │       ├── ColumnHeader    ドラッグ用の取っ手、タイトルのインライン編集、削除ボタン（ConfirmDialog）
    │           │       ├── SortableContext カードの並び（縦方向）。id はカラムの ID
    │           │       │   └── CardItem × n  ラベル（LabelChip）、タイトル、期限日。クリックか Enter で CardDetailModal を開く
    │           │       └── AddItemForm     カードの追加
    │           ├── AddItemForm         カラムの追加
    │           └── DragOverlay         ドラッグ中に指やマウスに付いていく表示（CardPreview / ColumnPreview）
    └── <Outlet />          子ルート。URL に /cards/:cardId があるときだけ CardDetailRoute → CardDetailModal

CardDetailModal             タイトル・説明・期限日・ラベルの選択を state に持ち、「保存」でまとめて run する
├── LabelPicker             ラベルのチェックボックス、削除ボタン（ConfirmDialog）、新しいラベルの名前と色
└── ConfirmDialog           カードの削除
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
| `features/labels/queries.ts`        | ラベルの作成のフック（楽観的更新をしない）                           |

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

## ラベル（MVP の後に追加）

ボードごとのラベルを作り、カードに付ける。仕様は [01-requirements.md](01-requirements.md#mvp-の後に追加した機能)、API は [03-api.md](03-api.md#ラベル)。

### データの持ち方

- カードは `labelIds`（ID の配列）だけを持ち、名前と色はボードの `labels` から `labelsOfCard` で引く。カードの並びの中にラベルの中身をコピーしないので、ラベルを消したときに直すのは `labels` とカードの `labelIds` だけで済む
- 色は `green` のような名前で持ち、画面での見た目は `labelColors.ts` で決める。Tailwind CSS はソースに書かれたクラス名から CSS を作るので、`` `bg-${color}-100` `` のように組み立てず、クラス名をそのまま書く

### 操作と、楽観的更新の例外

| 操作                     | どう送るか                                                           | いつ反映するか             |
| ------------------------ | -------------------------------------------------------------------- | -------------------------- |
| カードにラベルを付け外す | `updateCard` アクションの `labelIds`（付けた後の ID をすべて）       | カード詳細の「保存」で     |
| ラベルを削除する         | `deleteLabel` アクション（reducer が付けていたカードからも外す）     | すぐ（楽観的更新）         |
| ラベルを作る             | `useCreateLabel`（`features/labels/queries.ts`）。アクションにしない | サーバーの応答が届いてから |

ラベルの作成だけは、ほかの変更と違って楽観的更新をしない。作ったラベルはすぐカードに付けるので、ID が要る。楽観的更新では画面で作った仮の ID を使うので、そのままカードに付けて「保存」すると、サーバーにない ID を送って 400 になってしまう（上の「注意点」と同じ問題が、ここでは必ず起きる）。そこで、サーバーが決めた ID が返ってから `setQueryData` でキャッシュのボードに足し、作ったラベルをカードに付けた状態にする。

### カード詳細の中のフォーム

- `LabelPicker` はカード詳細の `<form>` の中にあり、`<form>` は入れ子にできない。そのため、新しいラベルの名前の Enter は `onKeyDown` で受け、`preventDefault()` で外側の form の送信（カードを保存して閉じる）を止めてから作る。日本語入力の変換確定の Enter（`isComposing`）では作らない
- ラベルの付け外しはチェックボックス、色はラジオボタンにした。キーボード（Tab、Space、矢印キー）で操作でき、読み上げでも選んだ状態が伝わる。色のラジオボタンは `sr-only` で隠し、隣の色の丸に選んだ状態の枠を付ける
- 「ラベルを作成」を押すと作成中はボタンが押せなくなり、フォーカスが外れてしまう。そこで押したときに名前の入力欄へフォーカスを戻し、続けて次のラベルを作れるようにしている
- 編集中にラベルが削除されたときに備えて、保存するときはボードにまだあるラベルの ID だけを送る
- カードの読み上げ名（`aria-label`）には、付いているラベルの名前も入れる（例：「カード「API を作る」（ラベル：急ぎ）」）。`aria-label` は中の文字より優先して読まれるため

## 期限日（MVP の後に追加）

カードに期限日を付け、期限を過ぎたカードを目立たせる。仕様は [01-requirements.md](01-requirements.md#期限日)、データの持ち方は [02-data-model.md](02-data-model.md#期限日duedateの持ち方)。

### 日付の扱い

- 期限日は `"2026-11-05"` のような日付だけの文字列のまま扱い、`Date` に変えない。`new Date("2026-11-05")` は UTC の0時として読まれるので、日本より西のタイムゾーンでは前の日になってしまう。表示用の「11月5日」も、文字列を `-` で分けて作る（`features/cards/dueDate.ts` の `formatDueDate`）
- 今日の日付は、`@kanban/shared` の `toDateString(new Date())` で、見ている人のタイムゾーンでの `"YYYY-MM-DD"` にする。`toISOString()` は UTC の日付になるので使わない
- 期限切れの判定（`@kanban/shared` の `isOverdue(dueDate, today)`）は、今日の日付を引数で受け取る純粋な関数にした。いつ実行しても同じ結果になるので、テストで「今日」を決められる。判定は `dueDate < today` の文字列の比較だけで、期限日が今日のカードは期限切れにしない
- `CardItem` は今日の日付を `features/cards/useToday.ts` の `useToday()` で読む。描画の中で `new Date()` を呼ぶと、同じ props でも呼んだ時刻によって結果が変わり、コンポーネントが純粋でなくなる（oxlint の `react(purity)` も警告する）。「今の日付」は React の外にある値なので、`useSyncExternalStore` で読む。1分ごとに確かめ、日付が変わったときだけ描画し直すので、ページを開いたまま日付が変わっても期限切れの表示が切り替わる

### 操作

| 操作                   | アクション                                            | 反映するタイミング     |
| ---------------------- | ----------------------------------------------------- | ---------------------- |
| 期限日を設定・変更する | `updateCard` アクションの `dueDate`（`"2026-11-05"`） | カード詳細の「保存」で |
| 期限日を消す           | `updateCard` アクションの `dueDate: null`             | カード詳細の「保存」で |

- `dueDate` は「省略（`undefined`）なら変えない、`null` なら消す」と区別する。reducer では `??` を使うと `null` も「変えない」になってしまうので、`undefined` かどうかで分けている。`JSON.stringify` は `undefined` の項目を省き、`null` は残すので、`sendAction` ではそのまま API に渡せる
- カード詳細の入力欄は `<input type="date">`。値は API と同じ `"YYYY-MM-DD"` の文字列で、未入力は空文字なので、保存するときに空文字を `null` に変える。ブラウザの日付の入力欄を使うと、カレンダーからも選べ、キーボード（矢印キーで年・月・日を増減）でも入力できる
- 「期限日を消す」ボタンは、期限日がないときは押せない。押すとボタンが押せなくなってフォーカスが外れてしまうので、日付の入力欄にフォーカスを移す

### 期限切れの見せ方

- 色だけに頼らない。期限切れのカードは枠と期限日を赤くし、加えて警告のアイコンと「期限切れ」の文字を出す。期限切れでない期限日は、カレンダーのアイコンと灰色の文字で出す
- カードの読み上げ名にも期限日を入れる（例：「カード「API を作る」（期限：11月4日、期限切れ）」）
- 期限日は `<time dateTime="2026-11-05">` で囲み、機械が読める形の日付も残す

## Step 6：ルーティングとテスト

### ルート

`app/routes/index.tsx` に定義し、`app/router.tsx` では `createBrowserRouter`（ブラウザの URL）、テストでは `createMemoryRouter`（メモリ上の URL）に同じ定義を渡す。すべてのページは、path を持たない親ルート（`RootLayout`）の子にしている。親にエラー画面と読み込み中の表示を1つずつ付ければ、全ページに効くため。

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

### 取得のエラーの表示

- 存在しないボード（404）は「ボードが見つかりません」と一覧へのリンクを出す。何度読み込んでも結果は変わらないので、再読み込みボタンは出さない
- 4xx のエラーは自動で再試行しない（`lib/queryClient.ts`）
- 描画中のエラー（プログラムの不具合など）は別の仕組みで受け止める（「エラー処理」の節）

### 画面のテスト（React Testing Library）

- `vite.config.ts` の `test.environment` を `jsdom` にして、Node の上で DOM を使えるようにする
- 要素は、画面に見えている文字や役割（`getByRole('button', { name: '追加' })` など）で探す。利用者と同じ見え方でテストするため、クラス名や内部の構造には頼らない
- 操作は `userEvent` で、クリックやキー入力を実際の順番どおりに起こす。日本語入力の変換中の Enter（`isComposing`）だけは `userEvent` で再現できないので `fireEvent` を使う
- ページのテストは `test/renderApp.tsx` の `renderApp(path)` で描く。アプリと同じルート定義（`app/routes/index.tsx`）を `createMemoryRouter` で動かし、テストごとに新しい `QueryClient` を作る。保存の失敗を知らせる通知も確かめられるよう、`Toaster` も一緒に描く

| ファイル                         | 確かめること                                                                                                                 |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `routes.test.tsx`                | ボード一覧からの作成、カードの URL を直接開く、存在しない URL、一覧の取得に失敗したときの表示                                |
| `pages/BoardListPage.test.tsx`   | ボードがないときの表示、ボードの削除（確認とキャンセル）                                                                     |
| `pages/BoardPage.test.tsx`       | ボード名・カラムの名前変更、カラムとカードの追加・削除、保存に失敗したときに元に戻すこと、期限切れの表示                     |
| `pages/CardDetailRoute.test.tsx` | カード詳細での保存・キャンセル・削除、タイトルが空のときは保存できないこと、ラベルの付け外し・作成・削除、期限日の設定と消去 |

- 楽観的更新の途中（保存の結果が届く前）の画面を確かめるときは、`server.use` のハンドラーの中で Promise を待たせ、応答を止めておく。すぐに応答すると、確かめる前に結果が届いてしまう
- 通知（sonner）は表示中の一覧を画面とは別に持ち、次に描いた `Toaster` がそれを引き継ぐ。前のテストの通知が残らないよう、`test/setup.ts` で各テストのあとに `toast.dismiss()` を呼ぶ
- 期限切れの表示は「今日」で変わるので、`test/renderApp.tsx` の `setToday(2026, 11, 5)` でテストの中の今日を決める。`vi.useFakeTimers({ toFake: ['Date'] })` で `Date` だけを偽物にし、`setTimeout` などは本物のまま残すので、`userEvent` や `findBy` の待ち合わせはそのまま動く。`test/setup.ts` が各テストのあとに `vi.useRealTimers()` で戻す

### API を MSW で受ける

画面のテストでは、`fetch` を `vi.stubGlobal` で差し替えず、MSW（`msw/node` の `setupServer`）で `/api` へのリクエストを受ける。`fetch` を差し替えると「どの URL に何を返すか」をテストごとに書くことになり、本物の API とずれても気付けない。MSW なら `fetch` と `apiClient.ts` は本物のまま動き、ネットワークの手前で受け取るだけになる。

- ハンドラーはデモ版の `src/demo/handlers.ts` をそのまま使う。デモ版の API は `backend/src/services/` と同じ規則で動く（`demo/api.test.ts` で確かめている）ので、画面のテストもバックエンドに近い動きで試せる
- DB は jsdom の `localStorage`。`test/setup.ts` がテストごとに空の DB を保存するので、テストは必要なデータを `saveDb` で用意してから画面を描く。保存されたかどうかは `loadDb` で確かめる
- `test/setup.ts` は、全テストの前に `server.listen()`、各テストのあとに `server.resetHandlers()`、最後に `server.close()` を呼ぶ。ハンドラーのない URL へのリクエストは、`onUnhandledFrame: 'error'` でテストを失敗させる
- 特定のテストだけエラーを返したいときは、そのテストの中で `server.use(http.get(...))` を呼ぶ。足したハンドラーは元のハンドラーより先に使われ、テストが終わると `resetHandlers` で外れる。`{ once: true }` を付けると1回だけ使われる
- `src/demo/handlers.ts` は、デモ版では150ms 待ってから返すが、テスト（`import.meta.env.MODE` が `test`）では待たせない。それでもレスポンスは非同期に届くので、画面の変化は `findBy〜`（見つかるまで待つ）で確かめる
- reducer や `apiClient.ts` など、画面を描かない `*.test.ts` は、今までどおり `vi.stubGlobal` で `fetch` を差し替えて、渡した引数や返り値を細かく確かめる

## エラー処理

[react-error-boundary](https://github.com/bvaughn/react-error-boundary) と React Router のルートの `ErrorBoundary` を使い、描画中のエラーで画面全体が真っ白にならないようにする。

### 2種類のエラー

| 種類             | 例                                                           | 受け止め方                                                                                     |
| ---------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| 取得・保存の失敗 | サーバーが止まっている、存在しないボード、入力エラー         | 取得は `useQuery` の `isError` を見てページの中で出す（`StatusMessage`）。保存は通知（sonner） |
| 描画中のエラー   | `undefined` のプロパティを読んだ、ページのファイルが読めない | エラーバウンダリーが受け止め、壊れた部分の代わりに `ErrorFallback` を出す                      |

React は、描画中に throw されたエラーを、いちばん近い**エラーバウンダリー**（エラーを受け止める部品）まで伝える。どこにもなければ画面全体が消える。イベントハンドラーや `await` の後で起きたエラーは描画中ではないので、エラーバウンダリーには届かない（保存の失敗を `onError` で通知にしているのはそのため）。

### 3つの段階

内側ほど、壊れる範囲が狭い。エラーは、起きた場所から外に向かって、最初に見つかったエラーバウンダリーで止まる。

| 段階         | 場所                                                            | 範囲                               | ボタン     |
| ------------ | --------------------------------------------------------------- | ---------------------------------- | ---------- |
| ページの一部 | `components/SectionErrorBoundary.tsx`（`BoardPage` で使う）     | カラムとカード。ヘッダーは残る     | 再試行     |
| ページ       | `app/routes/RouteErrorBoundary.tsx`（ルートの `ErrorBoundary`） | ページ全体                         | 再読み込み |
| アプリ全体   | `app/provider.tsx`（react-error-boundary の `ErrorBoundary`）   | ルーターの外（Provider、通知など） | 再試行     |

- **ページの一部**：ボードの表示で壊れても、一覧に戻るリンクとボード名は残る。`resetKeys={[board]}` を渡しているので、ほかのタブから戻って取り直したときなど、ボードのデータが変わったら自動でエラーの表示をやめて描き直す
- **ページ**：React Router のルートに `ErrorBoundary` を付けると、そのルートの中で起きた描画中のエラーを受け止め、ページの代わりに描く。エラーは props ではなく `useRouteError()` で受け取る。ページのファイル（`lazy`）の読み込みに失敗したときもここに来る。公開し直すとファイル名が変わり、開いたままの画面からは古いファイルを読めなくなるので、ボタンは「再読み込み」（`location.reload()`）にしている
- **アプリ全体**：ページのエラーは React Router が先に受け止めるので、ここに来るのはルーターの外で起きたエラーだけ。最後の砦として置く。ルーターの外なので、一覧へのリンクは `<Link>` ではなく `<a>` にしている

### 「再試行」でクエリもリセットする

`ErrorBoundary` の `onReset` に、TanStack Query の `useQueryErrorResetBoundary()` が返す `reset` を渡す。

```tsx
const { reset } = useQueryErrorResetBoundary()
return (
  <ErrorBoundary FallbackComponent={AppErrorFallback} onReset={reset}>
    …
  </ErrorBoundary>
)
```

`throwOnError` や `useSuspenseQuery` を使うクエリは、失敗するとエラーを throw してエラーバウンダリーに知らせる。そのまま描き直すと、失敗したままのキャッシュでまた throw してしまうので、`reset` で「次に描くときは取り直す」ように印を付けておく。今のアプリのクエリは `isError` を見てページの中でエラーを出しているので throw しないが、あとで `useSuspenseQuery` などに切り替えても「再試行」がそのまま働くようにしている。

### エラーを起こして確かめる

エラー画面は普段は出ないので、変更したときは、描画中に throw する一時的なコードを入れて確かめる（確かめたら消す）。

```tsx
// 例：BoardColumns の中に入れると、ボードの表示部分だけがエラーの表示に替わる
if (localStorage.getItem('boom')) throw new Error('テスト用のエラー')
```

## ページの遅延読み込み

ルートの `lazy` で、ページのファイルを初めてその URL を開いたときに読み込む。ビルドすると、ページごとに JS のファイルが分かれる（`BoardListPage-xxxx.js`、`BoardPage-xxxx.js`、`CardDetailRoute-xxxx.js`）。ボード一覧だけを見る人は、ドラッグ&ドロップ（dnd-kit）のコードを読み込まずに済む。

```tsx
{
  path: 'boards/:boardId',
  lazy: async () => {
    const { BoardPage } = await import('@/pages/BoardPage')
    return { Component: BoardPage }
  },
}
```

- `import()`（動的 import）と書くと、Vite がそのファイルを別のファイルに分けてビルドする。`import ... from` と書いたファイルは、分けられずに最初のファイルに入る
- 読み込み中の表示は2つある。最初に開いたページの読み込み中は、ルートの `HydrateFallback`（`PageLoading`）を出す。ページを移るときは、読み込みが終わるまで今のページが残るので、`RootLayout` が `useNavigation()` の `state === 'loading'` の間だけ、画面の上端に帯を出す
- 一度読み込んだページは、次からはすぐ表示される
- 新しいページを足すときも、`app/routes/index.tsx` に `lazy` で書く

## デモ版（GitHub Pages）

https://kiyohara1021.github.io/kanban-board/ で公開している。GitHub Pages は静的なファイルしか配信できないので、バックエンドの代わりに MSW がブラウザの中で API を再現する。

### 仕組み

| ファイル                  | 役割                                                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `src/demo/db.ts`          | バックエンドのテーブル（中間テーブルの `cardLabels` も含む）と同じ形のデータを `localStorage` に保存する。初回はサンプルを作る   |
| `src/demo/api.ts`         | 16本のエンドポイントの処理。`backend/src/services/` と同じ規則で、検証と並び順は shared を使う                                   |
| `src/demo/handlers.ts`    | MSW のハンドラー。URL と処理を結び付け、バックエンドと同じ形のレスポンスを返す（デモ版では150ms 待たせる）。画面のテストでも使う |
| `src/demo/browser.ts`     | Service Worker を登録して、`/api` へのリクエストを受け取り始める                                                                 |
| `src/demo/DemoBanner.tsx` | 「デモ版」の表示と、データを初期状態に戻すボタン                                                                                 |

- `npm run build:demo`（`vite build --mode demo`）で、`.env.demo` の `VITE_DEMO=true` が読み込まれる。`main.tsx` はそのときだけ、デモ用のコードを動的 import で読み込み、MSW の準備が終わってから画面を描く。通常のビルドには MSW が含まれない
- `DemoBanner` は `app/provider.tsx` が、デモ版のときだけ表示する
- Service Worker のファイル（`mockServiceWorker.js`）は、`vite.config.ts` の `msw/vite` プラグイン（`worker-only` モード）がデモ版のビルドのときだけ出力する。リポジトリには入れない
- データは訪れた人のブラウザに保存されるので、ほかの人のデータを壊すことはない
- ラベルを足す前に保存されたデータには `labels` と `cardLabels` がない。`loadDb` で空の配列を補い、それまでのボードをそのまま使えるようにしている（`demo/db.test.ts`）
- 同じように、期限日を足す前に保存されたカードには `dueDate` がないので、`loadDb` で `null`（未設定）を補う
- サンプルの期限日は、サンプルを作った日を基準にする（2日前、3日後、10日後）。固定の日付にすると、いつかすべて期限切れになってしまうため。`backend/prisma/seed.ts` も同じにしている

### GitHub Pages 特有の設定

- **公開する場所**：`https://kiyohara1021.github.io/kanban-board/` のように `/kanban-board/` の下になる。Vite の `base` と React Router の `basename`（`import.meta.env.BASE_URL`）を合わせている
- **URL を直接開いたとき**：Pages には「どの URL にも `index.html` を返す」設定がない。`/kanban-board/boards/xxx` を直接開くと 404 になるので、ビルドのあとに `index.html` を `404.html` としてコピーし、404 のページでもアプリが起動するようにしている
- **公開の手順**：`.github/workflows/pages.yml` が、`main` へのプッシュのたびにデモ版をビルドして公開する

## スタイル

- Tailwind CSS を使う
- カラムは横並びで、画面幅を超えたら横スクロールする
- スマートフォンでも、カラム1列分の幅で横スワイプして操作できるようにする
