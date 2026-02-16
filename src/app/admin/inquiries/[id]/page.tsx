'use client'
// =============================================================================
// 관리자 문의 상세 - /admin/inquiries/[id]
// 첨부 → 문의 내용 표시 후, 답변 입력 폼(미답변 시) 또는 답변 내용 표시
// =============================================================================

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { InquiryContent } from '@/components/inquiry-content'
import { toast } from 'sonner'

async function fetchInquiry(id: number) {
  const res = await fetch(`/api/admin/inquiries/${id}`, { credentials: 'include' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || '문의를 불러올 수 없습니다')
  }
  return res.json()
}

async function submitReply(id: number, replyMessage: string) {
  const res = await fetch(`/api/admin/inquiries/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ replyMessage }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || '답변 등록에 실패했습니다')
  }
  return res.json()
}

export default function AdminInquiryDetailPage() {
  const params = useParams()
  const queryClient = useQueryClient()
  const id = Number(params.id)

  const { data: inquiry, isLoading, isError, error } = useQuery({
    queryKey: ['adminInquiry', id],
    queryFn: () => fetchInquiry(id),
    enabled: Number.isInteger(id),
  })

  const [replyText, setReplyText] = useState('')

  const replyMutation = useMutation({
    mutationFn: () => submitReply(id, replyText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminInquiry', id] })
      setReplyText('')
      toast.success('답변이 등록되었습니다')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : '답변 등록에 실패했습니다')
    },
  })

  if (!Number.isInteger(id)) {
    return (
      <div>
        <p className="text-destructive">잘못된 문의 번호입니다.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/admin/inquiries">목록으로</Link>
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
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
      <div>
        <p className="text-destructive">
          {error instanceof Error ? error.message : '문의를 불러올 수 없습니다'}
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/admin/inquiries">목록으로</Link>
        </Button>
      </div>
    )
  }

  const hasReply = !!inquiry.replyMessage

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/inquiries">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">목록</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">문의 #{inquiry.id}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {inquiry.user?.name || inquiry.user?.email} · {inquiry.user?.email}
            {inquiry.orderId && ` · 주문 #${inquiry.orderId}`}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {new Date(inquiry.createdAt).toLocaleString('ko-KR')}
          </p>
        </CardHeader>
        <CardContent>
          <InquiryContent
            attachmentKeys={inquiry.attachmentKeys ?? []}
            message={inquiry.message}
            replyMessage={inquiry.replyMessage}
            repliedAt={inquiry.repliedAt}
            showReplyLabel={true}
          />
        </CardContent>
      </Card>

      {/* 관리자 답변 입력 또는 기존 답변 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">관리자 답변</CardTitle>
        </CardHeader>
        <CardContent>
          {hasReply ? (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 whitespace-pre-wrap text-sm">
              {inquiry.replyMessage}
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (replyText.trim()) replyMutation.mutate()
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="reply">답변 내용</Label>
                <Textarea
                  id="reply"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="답변을 입력하세요."
                  rows={5}
                  className="resize-none"
                  disabled={replyMutation.isPending}
                />
              </div>
              <Button type="submit" disabled={!replyText.trim() || replyMutation.isPending}>
                {replyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    등록 중...
                  </>
                ) : (
                  '답변 등록'
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
