/**
 * 진단용 API: Next 서버에서 CDN 이미지 fetch 가능 여부 확인
 * GET /api/diagnostic/image-cdn
 *
 * - Next Image 최적화는 서버가 CDN URL을 fetch해야 하므로, 이 API로 서버→CDN 통신이 되는지 확인 가능
 * - 브라우저에서 이 URL을 열어 200 + fetchOk: true 이면 서버에서 CDN 접근 정상
 */

import { NextResponse } from 'next/server'
import prismaClient from '@/lib/prismaClient'
import { getCdnUrl } from '@/lib/cdn'

export async function GET() {
  try {
    const image = await prismaClient.image.findFirst({
      orderBy: { id: 'desc' },
      select: { original: true },
    })

    if (!image?.original) {
      return NextResponse.json({
        ok: false,
        message: 'DB에 Image 레코드가 없습니다.',
        cdnBase: process.env.NEXT_PUBLIC_AWS_BUCKET_CDN ?? '(미설정, 기본값 사용)',
      })
    }

    const sampleUrl = getCdnUrl(image.original)
    let fetchStatus: number | null = null
    let fetchOk = false
    let fetchError: string | null = null

    try {
      const res = await fetch(sampleUrl, { method: 'HEAD' })
      fetchStatus = res.status
      fetchOk = res.ok
    } catch (err) {
      fetchError = (err as Error).message
    }

    return NextResponse.json({
      ok: true,
      message:
        fetchOk
          ? '서버에서 CDN 이미지 fetch 성공. Next Image 최적화가 동작할 수 있는 환경입니다.'
          : '서버에서 CDN 이미지 fetch 실패. Next Image가 깨질 수 있습니다. (방화벽/DNS/remotePatterns 확인)',
      cdnBase: process.env.NEXT_PUBLIC_AWS_BUCKET_CDN ?? 'https://cdn.ncott.shop',
      sampleKey: image.original,
      sampleUrl,
      fetchStatus,
      fetchOk,
      fetchError,
      httpNote:
        '앱을 http(localhost)로 띄워도 CDN 이미지는 https로 로드되므로 mixed content 문제 없음.',
    })
  } catch (err) {
    console.error('diagnostic image-cdn:', err)
    return NextResponse.json(
      {
        ok: false,
        message: '진단 중 오류',
        error: (err as Error).message,
      },
      { status: 500 }
    )
  }
}
