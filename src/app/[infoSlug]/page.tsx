// =============================================================================
// 푸터 링크 전용 안내 페이지 동적 라우트 - /[infoSlug]
// - 홈 푸터의 깨진 링크를 한 번에 처리하기 위해 허용된 slug만 렌더링한다.
// =============================================================================

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { FooterInfoPageView } from '@/components/footer-info-page-view'
import {
  FOOTER_INFO_PAGE_KEYS,
  FOOTER_INFO_PAGES,
  isFooterInfoPageKey,
} from '@/lib/footer-info-pages'

type FooterInfoPageProps = {
  params: Promise<{ infoSlug: string }>
}

// 정해진 slug만 정적 생성해서 의도한 페이지 외에는 노출되지 않게 한다.
export function generateStaticParams() {
  return FOOTER_INFO_PAGE_KEYS.map(infoSlug => ({ infoSlug }))
}

// 페이지 제목/설명을 slug별로 다르게 설정한다.
export async function generateMetadata({
  params,
}: FooterInfoPageProps): Promise<Metadata> {
  const { infoSlug } = await params
  if (!isFooterInfoPageKey(infoSlug)) {
    return {
      title: '페이지를 찾을 수 없습니다 | ASOS Style',
    }
  }

  const pageData = FOOTER_INFO_PAGES[infoSlug]
  return {
    title: `${pageData.title} | ASOS Style`,
    description: pageData.summary,
  }
}

export default async function FooterInfoPage({ params }: FooterInfoPageProps) {
  const { infoSlug } = await params
  if (!isFooterInfoPageKey(infoSlug)) {
    notFound()
  }

  const pageData = FOOTER_INFO_PAGES[infoSlug]
  return <FooterInfoPageView pageData={pageData} />
}

