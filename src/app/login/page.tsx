'use client'
// =============================================================================
// 로그인 페이지 - /login
// 이메일/비밀번호 로그인 폼, 소셜 로그인(Google/Kakao) 링크, 회원가입 링크
// =============================================================================

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import * as z from 'zod'
import { ArrowLeft, Loader2, ChromeIcon as Google, MessageCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/lib/store'
import { toast } from 'sonner'

const loginSchema = z.object({
  email: z.string().min(1, { message: '이메일을 입력해주세요.' }),
  password: z.string().min(1, { message: '비밀번호를 입력해주세요.' }),
})

type LoginForm = z.infer<typeof loginSchema>

/** 로그인: 폼 검증 후 useAuthStore.login 호출, 성공 시 /account로 이동. OAuth 성공 시 setAuthFromSession 후 리다이렉트 */
export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, setAuthFromSession, isLoading } = useAuthStore()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    const oauthSuccess = searchParams.get('oauth') === 'success'
    const oauthError = searchParams.get('error')
    if (oauthError) {
      const msg =
        oauthError === 'no_code'
          ? '로그인 권한이 없습니다.'
          : oauthError === 'config'
            ? 'OAuth 설정이 없습니다.'
            : oauthError === 'no_email'
              ? '이메일 정보를 가져올 수 없습니다.'
              : '소셜 로그인에 실패했습니다.'
      toast.error(msg)
      router.replace('/login', { scroll: false })
      return
    }
    if (!oauthSuccess) return
    let mounted = true
    setAuthFromSession().then((ok) => {
      if (!mounted) return
      if (ok) {
        const { user } = useAuthStore.getState()
        toast.success('로그인 성공')
        router.refresh()
        router.replace(user?.role === 'ADMIN' ? '/admin' : '/account', { scroll: false })
      } else {
        toast.error('세션을 불러오지 못했습니다.')
        router.replace('/login', { scroll: false })
      }
    })
    return () => {
      mounted = false
    }
  }, [searchParams, router, setAuthFromSession])

  const onSubmit = async (data: LoginForm) => {
    const success = await login(data.email, data.password)

    if (success) {
      toast.success('로그인 성공')
      const { user } = useAuthStore.getState()
      // 로그인 직후 세션 쿠키가 반영된 상태로 이동하려면 RSC 캐시를 무효화해야 함.
      // 그렇지 않으면 이전에 prefetch된 /admin(비로그인 시 리다이렉트) 결과가 쓰여 /로 튕김.
      router.refresh()
      router.push(user?.role === 'ADMIN' ? '/admin' : '/account')
    } else {
      toast.error('로그인 실패')
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="flex items-center mb-8">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link href="/">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">홈으로</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">로그인</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email">이메일</Label>
          <Input id="email" {...register('email')} />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">비밀번호</Label>
          <Input id="password" type="password" {...register('password')} />
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              로그인 중...
            </>
          ) : (
            '로그인'
          )}
        </Button>
      </form>

      <div className="mt-4 text-center">
        <Link
          href="/forgot-password"
          className="text-sm text-primary hover:underline"
        >
          비밀번호를 잊으셨나요?
        </Link>
      </div>

      <Separator className="my-8" />

      <div className="space-y-4">
        <Button variant="outline" className="w-full" asChild>
          <Link href="/api/auth/google">
            <Google className="mr-2 h-4 w-4" />
            Google로 로그인
          </Link>
        </Button>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/api/auth/kakao">
            <MessageCircle className="mr-2 h-4 w-4" />
            카카오로 로그인
          </Link>
        </Button>
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        계정이 없으신가요?{' '}
        <Link href="/register" className="text-primary hover:underline">
          회원가입
        </Link>
      </p>
    </div>
  )
}
