/**
 * 공통 로딩 스피너입니다.
 * 텍스트 대체 라벨을 함께 제공해 접근성을 유지합니다.
 */

import { Loader2 } from "lucide-react"

type LoadingSpinnerProps = {
  size?: number
  className?: string
  label?: string
}

export function LoadingSpinner({
  size = 24,
  className,
  label = "로딩 중",
}: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${className ?? ""}`} aria-label={label}>
      <Loader2
        className="animate-spin text-muted-foreground"
        style={{ width: size, height: size }}
      />
      <span className="sr-only">{label}</span>
    </div>
  )
}