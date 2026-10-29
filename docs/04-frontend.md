# 04. フロントエンド設計

## ディレクトリ構成

機能（feature）ごとにフォルダを分ける。ボード・カラム・カードに関係するファイルを、それぞれ近くにまとめるため。

```
frontend/src/
├── main.tsx                  エントリ（QueryClientProvider と RouterProvider を置く）
├── router.tsx                ルート定義
├── pages/
│   ├── BoardListPage.tsx     /
│   └── BoardPage.tsx         /boards/:boardId
├── features/
│   ├── boards/
│   │   ├── api.ts            fetch 関数（getBoards, createBoard …）
│   │   ├── queries.ts        TanStack Query のフック（useBoards, useCreateBoard …）
│   │   └── components/       BoardTile, CreateBoardForm, BoardHeader
│   ├── columns/
│   │   ├── api.ts
│   │   ├── queries.ts
│   │   └── components/       BoardColumn, ColumnHeader
│   └── cards/
│       ├── api.ts
│       ├── queries.ts
│       └── components/       CardItem, CardDetailModal
├── components/
│   ├── ui/                   shadcn/ui が生成した部品（button, dialog など）。直接は編集しない
│   ├── AddItemForm.tsx       「+ ○○を追加」から入力欄に切り替わるフォーム
│   └── ConfirmDialog.tsx     削除前の確認ダイアログ（alert-dialog を使う）
├── lib/
│   ├── utils.ts              shadcn/ui が使う cn()（クラス名の結合）
│   ├── apiClient.ts          fetch の共通処理（ベース URL、エラー変換）
│   └── queryClient.ts
└── test/setup.ts             テストの初期設定
```

- Step 1〜3（API なし）の間は `api.ts` と `queries.ts` を作らず、`features/boards/boardReducer.ts` で状態を管理する
- import は `@/`（`src/` を指す別名）で書く。例：`import { Button } from '@/components/ui/button'`
- `components/ui/` は shadcn/ui のコマンドで追加・更新するファイルなので、lint の対象から外している。見た目を変えたいときは、使う側で `className` を渡す

## コンポーネント構成

```
BoardListPage
├── CreateBoardForm
└── BoardTile × n

BoardPage
├── BoardHeader             タイトル表示とインライン編集
├── DndContext              dnd-kit のドラッグ範囲（設定は useBoardDnd が返す）
│   ├── SortableContext     カラムの並び（横方向）
│   │   └── BoardColumn × n カラム自体も並び替えられる
│   │       ├── ColumnHeader    ドラッグ用の取っ手、タイトルのインライン編集、削除ボタン（ConfirmDialog）
│   │       ├── SortableContext カードの並び（縦方向）。id はカラムの ID
│   │       │   └── CardItem × n  クリックか Enter で CardDetailModal を開く
│   │       └── AddItemForm     カードの追加
│   ├── AddItemForm         カラムの追加
│   └── DragOverlay         ドラッグ中に指やマウスに付いていく表示（CardPreview / ColumnPreview）
└── CardDetailModal         URL に :cardId があるときだけ表示
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
- Step 1〜3 で開いているカードは、URL ではなく `BoardPage` の `useState` に ID だけを持つ。Step 6 で URL に移す

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
| `["cards", cardId]`   | カード単体（詳細モーダル用）       |

カラムやカードを変更したら、`["boards", boardId]` を無効化（invalidate）して再取得する。

### ドラッグ&ドロップの楽観的更新

ドロップした瞬間に画面を更新し、API の結果を待たない。

1. `onMutate`：進行中の取得をキャンセルし、今のキャッシュを保存してから、キャッシュ上でカードを移動する
2. `onError`：保存しておいたキャッシュに戻し、エラーを通知する
3. `onSettled`：`["boards", boardId]` を無効化して、サーバーの状態と合わせる

## スタイル

- Tailwind CSS を使う
- カラムは横並びで、画面幅を超えたら横スクロールする
- スマートフォンでも、カラム1列分の幅で横スワイプして操作できるようにする
