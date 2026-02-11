'use client'
// =============================================================================
// 비밀번호 재설정 - /reset-password?token=xxx
// 이메일 링크로 들어온 후 새 비밀번호 입력
// =============================================================================

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      toast.error('유효한 재설정 링크가 아닙니다.')
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      toast.error('유효한 재설정 링크가 아닙니다.')
      return
    }
    if (password.length < 8) {
      toast.error('비밀번호는 8자 이상이어야 합니다.')
      return
    }
    if (password !== confirm) {
      toast.error('비밀번호가 일치하지 않습니다.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? '비밀번호 변경에 실패했습니다.')
        return
      }
      setSuccess(true)
      toast.success(data?.message ?? '비밀번호가 변경되었습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <h1 className="text-2xl font-bold mb-4">비밀번호가 변경되었습니다</h1>
        <p className="text-muted-foreground mb-6">
          새 비밀번호로 로그인해주세요.
        </p>
        <Button asChild>
          <Link href="/login">로그인</Link>
        </Button>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <h1 className="text-2xl font-bold mb-4">잘못된 링크</h1>
        <p className="text-muted-foreground mb-6">
          비밀번호 재설정 링크가 없거나 만료되었습니다. 비밀번호 찾기를 다시 시도해주세요.
        </p>
        <Button asChild>
          <Link href="/forgot-password">비밀번호 찾기</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="flex items-center mb-8">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link href="/login">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">로그인으로</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">비밀번호 재설정</h1>
      </div>
      <p className="text-muted-foreground text-sm mb-6">
        새 비밀번호를 입력해주세요. (8자 이상)
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">새 비밀번호</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            minLength={8}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">비밀번호 확인</Label>
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={loading}
            minLength={8}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              변경 중...
            </>
          ) : (
            '비밀번호 변경'
          )}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">
          로그인
        </Link>
      </p>
    </div>
  )
}
