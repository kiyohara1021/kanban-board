import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch } from './apiClient'

// fetch を偽物に差し替えて、サーバーなしで試す
function mockFetch(status: number, body?: unknown) {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiFetch', () => {
  it('/api を付けて送り、JSON を返す', async () => {
    const fetchMock = mockFetch(200, { id: 'b1' })

    await expect(apiFetch('POST', '/boards', { title: 'A' })).resolves.toEqual({ id: 'b1' })
    expect(fetchMock).toHaveBeenCalledWith('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"title":"A"}',
    })
  })

  it('204 のときは undefined を返す', async () => {
    mockFetch(204)
    await expect(apiFetch('DELETE', '/boards/b1')).resolves.toBeUndefined()
  })

  it('エラーのときは、サーバーのメッセージを持った ApiError を投げる', async () => {
    mockFetch(404, { error: { code: 'NOT_FOUND', message: 'カードが見つかりません' } })

    const error = await apiFetch('GET', '/cards/x').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: 'カードが見つかりません',
    })
  })

  it('サーバーにつながらないときは、分かりやすいメッセージにする', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(apiFetch('GET', '/boards')).rejects.toThrow('サーバーに接続できませんでした')
  })
})
