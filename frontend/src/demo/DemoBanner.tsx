import { resetDb } from './db'

// デモ版であることと、データの保存先を伝える。画面の左下に小さく出す
export function DemoBanner() {
  return (
    <div className="fixed bottom-3 left-3 z-40 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-x-2 rounded-2xl bg-slate-900/85 px-3 py-1.5 text-xs text-white shadow-lg">
      <span>デモ版：データはこのブラウザにだけ保存されます</span>
      <button
        type="button"
        onClick={() => {
          resetDb()
          // 消したボードの URL に残らないよう、トップページから開き直す
          location.assign(import.meta.env.BASE_URL)
        }}
        className="underline underline-offset-2 hover:text-sky-300"
      >
        初期状態に戻す
      </button>
    </div>
  )
}
