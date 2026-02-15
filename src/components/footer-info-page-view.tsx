// =============================================================================
// 푸터 안내 페이지 공통 뷰
// - 각 안내 페이지의 제목/섹션/관련 링크/담당자 정보를 동일한 형식으로 렌더링한다.
// =============================================================================

import Link from 'next/link'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { FooterInfoPageData } from '@/lib/footer-info-pages'

type FooterInfoPageViewProps = {
  pageData: FooterInfoPageData
}

export function FooterInfoPageView({ pageData }: FooterInfoPageViewProps) {
  return (
    <main className="container mx-auto max-w-5xl px-4 py-10">
      {/* 현재 위치를 보여주는 간단한 breadcrumb 영역 */}
      <nav className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          홈
        </Link>
        <span>/</span>
        <span>{pageData.menuLabel}</span>
      </nav>

      {/* 페이지 첫 화면 설명 영역 */}
      <header className="mb-8 space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">{pageData.title}</h1>
        <p className="text-base text-muted-foreground">{pageData.summary}</p>
      </header>

      {/* 안내 항목들을 카드로 분리해서 읽기 쉽게 제공 */}
      <section className="grid gap-4 md:grid-cols-2">
        {pageData.sections.map(section => (
          <Card key={section.title} className="h-full">
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-foreground">
                {section.items.map(item => (
                  <li key={item} className="leading-relaxed">
                    • {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </section>

      <Separator className="my-8" />

      {/* 관련 페이지 이동 링크 */}
      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">관련 페이지</h2>
        <ul className="flex flex-wrap gap-3">
          {pageData.relatedLinks.map(link => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex rounded-md border px-3 py-2 text-sm hover:bg-muted"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 사용자 요청대로 이름/이메일/전화번호는 모두 XXX만 표시 */}
      <section className="rounded-lg border bg-muted/30 p-4">
        <h2 className="mb-3 text-xl font-semibold">문의 담당 정보</h2>
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <p>
            이름: <strong>{pageData.contact.name}</strong>
          </p>
          <p>
            이메일: <strong>{pageData.contact.email}</strong>
          </p>
          <p>
            전화번호: <strong>{pageData.contact.phone}</strong>
          </p>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          본 페이지의 문구는 데모 환경용 가짜 안내 텍스트입니다.
        </p>
      </section>
    </main>
  )
}

