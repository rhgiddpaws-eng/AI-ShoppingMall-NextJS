'use client'
// =============================================================================
// 문의 내역 목록 - 계정 페이지 "문의 내역" 탭용
// =============================================================================

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { MessageCircle, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

async function fetchMyInquiries() {
  const res = await fetch('/api/user/inquiries', { credentials: 'include' })
  if (!res.ok) throw new Error('문의 목록을 불러오는데 실패했습니다')
  const data = await res.json()
  return data.inquiries as Array<{
    id: number
    orderId: number | null
    message: string
    attachmentKeys: string[]
    replyMessage: string | null
    repliedAt: string | null
    createdAt: string
  }>
}

export function InquiryHistory() {
  const { data: inquiries, isLoading, isError, error } = useQuery({
    queryKey: ['myInquiries'],
    queryFn: fetchMyInquiries,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <p className="text-destructive">
        {error instanceof Error ? error.message : '문의 목록을 불러올 수 없습니다'}
      </p>
    )
  }

  if (!inquiries?.length) {
    return (
      <div className="text-center py-8">
        <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium">문의 내역이 없습니다</h3>
        <p className="text-muted-foreground mt-2">
          문의하시면 관리자 답변을 받으실 수 있습니다.
        </p>
        <Button asChild className="mt-4">
          <Link href="/support">문의하기</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild size="sm">
          <Link href="/support">새 문의</Link>
        </Button>
      </div>
      {inquiries.map((inquiry) => (
        <Card key={inquiry.id} className="hover:bg-muted/50 transition-colors">
          <Link href={`/account/inquiries/${inquiry.id}`}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">문의 #{inquiry.id}</span>
                    {inquiry.orderId && (
                      <span className="text-sm text-muted-foreground">
                        주문 #{inquiry.orderId} 관련
                      </span>
                    )}
                    {inquiry.replyMessage && (
                      <Badge variant="secondary" className="text-xs">
                        답변완료
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {inquiry.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(inquiry.createdAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </div>
            </CardContent>
          </Link>
        </Card>
      ))}
    </div>
  )
}
