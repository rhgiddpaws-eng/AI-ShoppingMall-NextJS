'use client'
// =============================================================================
// 관리자 문의 목록 - /admin/inquiries
// =============================================================================

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { MessageCircle, ChevronRight } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface InquiryRow {
  id: number
  orderId: number | null
  message: string
  replyMessage: string | null
  repliedAt: string | null
  createdAt: string
  user: { id: number; email: string; name: string | null }
}

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<InquiryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchInquiries = async () => {
      try {
        const res = await fetch('/api/admin/inquiries', { credentials: 'include' })
        if (!res.ok) throw new Error('문의 목록을 불러오는데 실패했습니다')
        const data = await res.json()
        setInquiries(data.inquiries ?? [])
      } catch (e) {
        setError(e instanceof Error ? e.message : '오류가 발생했습니다')
      } finally {
        setLoading(false)
      }
    }
    fetchInquiries()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">문의 관리</h1>
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold">문의 관리</h1>
        <p className="text-destructive mt-4">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">문의 관리</h1>

      {inquiries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">접수된 문의가 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {inquiries.map((inquiry) => (
            <Link key={inquiry.id} href={`/admin/inquiries/${inquiry.id}`}>
              <Card className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">문의 #{inquiry.id}</span>
                        {inquiry.orderId && (
                          <span className="text-sm text-muted-foreground">
                            주문 #{inquiry.orderId}
                          </span>
                        )}
                        {inquiry.replyMessage ? (
                          <Badge variant="secondary">답변완료</Badge>
                        ) : (
                          <Badge variant="outline">미답변</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {inquiry.user.name || inquiry.user.email} · {inquiry.user.email}
                      </p>
                      <p className="text-sm mt-1 line-clamp-2">{inquiry.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(inquiry.createdAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
