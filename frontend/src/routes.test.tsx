import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { loadDb } from '@/demo/db'
import { renderApp, saveSampleBoard } from '@/test/renderApp'
import { server } from '@/test/server'

describe('画面の移動', () => {
  it('ボード一覧から、ボードを作るとそのボードが開く', async () => {
    saveSampleBoard()
    const user = userEvent.setup()
    const router = renderApp('/')

    // 取得が終わるまで待つ（find〜 は、見つかるまで少し待ってくれる）
    expect(await screen.findByRole('heading', { name: 'マイボード' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'ボードを作成' }))
    await user.type(screen.getByRole('textbox', { name: 'ボード名' }), '新しいボード{Enter}')

    expect(await screen.findByRole('heading', { name: '新しいボード' })).toBeInTheDocument()
    // POST /api/boards が届き、DB に保存されている。ID はサーバー（MSW）が決める
    const created = loadDb().boards.find((b) => b.title === '新しいボード')
    expect(created).toBeDefined()
    // ボードのページは lazy で読み込むので、読み込みが終わるまで URL は一覧のまま。移るまで待つ
    await waitFor(() => expect(router.state.location.pathname).toBe(`/boards/${created?.id}`))
  })

  it('カードの URL を直接開くと、ボードの上にカード詳細が出る', async () => {
    saveSampleBoard()
    renderApp('/boards/b1/cards/k1')

    const dialog = await screen.findByRole('dialog', { name: 'カードの編集' })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'タイトル' })).toHaveValue('テストを書く')
    // 後ろにボードも表示されている
    expect(screen.getByRole('heading', { name: 'マイボード', hidden: true })).toBeInTheDocument()
  })

  it('存在しないカードの URL は、ボードに戻す', async () => {
    saveSampleBoard()
    const router = renderApp('/boards/b1/cards/unknown')

    expect(await screen.findByRole('heading', { name: 'マイボード' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/boards/b1')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('存在しないボードは、メッセージと一覧へのリンクを出す', async () => {
    renderApp('/boards/unknown')

    expect(await screen.findByText('ボードが見つかりません')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ボード一覧に戻る' })).toHaveAttribute('href', '/')
    // 404 は再読み込みしても変わらないので、ボタンを出さない
    expect(screen.queryByRole('button', { name: '再読み込み' })).not.toBeInTheDocument()
  })

  it('一覧の取得に失敗したら、エラーを出し、再読み込みで取り直せる', async () => {
    saveSampleBoard()
    // このテストだけ、最初の GET /api/boards を 500 にする（once: true で1回だけ）。
    // server.use で足したハンドラーは、デモ版のハンドラーより先に使われる。
    // 2回目からはデモ版のハンドラーに戻るので、再読み込みで一覧が出る
    server.use(
      http.get(
        '/api/boards',
        () =>
          HttpResponse.json(
            { error: { code: 'INTERNAL_ERROR', message: 'サーバーでエラーが発生しました' } },
            { status: 500 },
          ),
        { once: true },
      ),
    )
    const user = userEvent.setup()
    renderApp('/')

    expect(await screen.findByText('サーバーでエラーが発生しました')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '再読み込み' }))

    expect(await screen.findByRole('heading', { name: 'マイボード' })).toBeInTheDocument()
  })
})
