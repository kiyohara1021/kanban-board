import { Outlet, useNavigation } from 'react-router'

// すべてのページを包むレイアウト
export function RootLayout() {
  // 別のページに移るとき、移った先のページのファイルを読み込んでいる間は "loading" になる。
  // その間は今のページがそのまま残るので、画面の上端に細い帯を出して、操作が届いたことを伝える
  const navigation = useNavigation()

  return (
    <>
      {navigation.state === 'loading' && (
        <div
          role="progressbar"
          aria-label="ページを読み込み中"
          className="fixed inset-x-0 top-0 z-50 h-1 animate-pulse bg-sky-500"
        />
      )}
      <Outlet />
    </>
  )
}
