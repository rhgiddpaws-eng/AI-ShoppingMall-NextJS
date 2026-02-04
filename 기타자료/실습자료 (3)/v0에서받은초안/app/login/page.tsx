"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { ArrowLeft, Loader2, Github, ChromeIcon as Google } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Separator } from "@/components/ui/separator"
import { useAuthStore } from "@/lib/store"

const loginSchema = z.object({
  email: z.string().min(1, { message: "이메일을 입력해주세요." }),
  password: z.string().min(1, { message: "비밀번호를 입력해주세요." }),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { login, isLoading } = useAuthStore()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    const success = await login(data.email, data.password)
    if (success) {
      toast({
        title: "로그인 성공",
        description: "환영합니다!",
      })
      router.push("/account")
    } else {
      toast({
        title: "로그인 실패",
        description: "이메일 또는 비밀번호를 확인해주세요.",
        variant: "destructive",
      })
    }
  }

  const handleSocialLogin = (provider: string) => {
    // 소셜 로그인 로직 구현
    toast({
      title: `${provider} 로그인`,
      description: "소셜 로그인 기능은 아직 구현되지 않았습니다.",
    })
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
          <Input id="email" {...register("email")} />
          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">비밀번호</Label>
          <Input id="password" type="password" {...register("password")} />
          {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              로그인 중...
            </>
          ) : (
            "로그인"
          )}
        </Button>
      </form>

      <div className="mt-4 text-center">
        <Link href="/forgot-password" className="text-sm text-primary hover:underline">
          비밀번호를 잊으셨나요?
        </Link>
      </div>

      <Separator className="my-8" />

      <div className="space-y-4">
        <Button variant="outline" className="w-full" onClick={() => handleSocialLogin("Google")}>
          <Google className="mr-2 h-4 w-4" />
          Google로 로그인
        </Button>
        <Button variant="outline" className="w-full" onClick={() => handleSocialLogin("GitHub")}>
          <Github className="mr-2 h-4 w-4" />
          GitHub로 로그인
        </Button>
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        계정이 없으신가요?{" "}
        <Link href="/register" className="text-primary hover:underline">
          회원가입
        </Link>
      </p>
    </div>
  )
}

