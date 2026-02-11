'use client'
// =============================================================================
// 문의 상세 - /account/inquiries/[id]
// 첨부(이미지/동영상) → 문의 내용 → 관리자 답변 순으로 표시
// =============================================================================

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { InquiryContent } from '@/components/inquiry-content'
import { useAuthStore } from '@/lib/store'

async function fetchInquiry(id: number) {
  const res = await fetch(`/api/user/inquiries/${id}`, { credentials: 'include' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || '문의를 불러올 수 없습니다')
  }
  return res.json()
}

export default function AccountInquiryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params.id)
  const { user, isHydrated } = useAuthStore()

  const { data: inquiry, isLoading, isError, error } = useQuery({
    queryKey: ['inquiry', id],
    queryFn: () => fetchInquiry(id),
    enabled: Number.isInteger(id) && !!user,
  })

  if (!isHydrated || !user) {
    return null
  }

  if (!Number.isInteger(id)) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <p className="text-destructive">잘못된 문의 번호입니다.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/account">내 계정</Link>
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <Card>
          <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isError || !inquiry) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <p className="text-destructive">
          {error instanceof Error ? error.message : '문의를 불러올 수 없습니다'}
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/account">내 계정</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link href="/account">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">문의 목록으로</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">문의 #{inquiry.id}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {inquiry.orderId ? `주문 #${inquiry.orderId} 관련 · ` : ''}
            {new Date(inquiry.createdAt).toLocaleString('ko-KR')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InquiryContent
            attachmentKeys={inquiry.attachmentKeys ?? []}
            message={inquiry.message}
            replyMessage={inquiry.replyMessage}
            repliedAt={inquiry.repliedAt}
          />
        </CardContent>
      </Card>

      <div className="mt-4">
        <Button variant="outline" asChild>
          <Link href="/account">문의 목록으로</Link>
        </Button>
      </div>
    </div>
  )
}
