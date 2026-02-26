"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { warmCategoryRoute } from "@/lib/route-warmup"

interface CategoryCardProps {
  href: string
  images: string[]
  label: string
  interval?: number
}

export function CategoryCard({
  href,
  images,
  label,
  interval = 4000,
}: CategoryCardProps) {
  const router = useRouter()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (images.length <= 1) return

    const timer = window.setInterval(() => {
      setIndex(prev => (prev + 1) % images.length)
    }, interval)

    return () => window.clearInterval(timer)
  }, [images.length, interval])

  const safeImages = images.length > 0 ? images : ["/placeholder.svg"]

  return (
    <Link
      href={href}
      // 카테고리 카드 hover/touch 시 다음 화면과 API를 미리 예열해 클릭 지연을 줄입니다.
      onMouseEnter={() => warmCategoryRoute(router, href)}
      onTouchStart={() => warmCategoryRoute(router, href)}
      onFocus={() => warmCategoryRoute(router, href)}
      className="group relative block h-[150px] overflow-hidden rounded-lg sm:h-[200px] md:h-[270px] lg:h-[340px]"
    >
      <div className="absolute inset-0 h-full w-full bg-gray-200">
        {safeImages.map((src, imageIndex) => (
          <Image
            key={`${href}-${src}-${imageIndex}`}
            src={src}
            alt={label}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className={`object-cover transition-all duration-700 ${
              imageIndex === index ? "scale-100 opacity-100" : "scale-105 opacity-0"
            } group-hover:scale-105`}
            // 카테고리 이미지는 CDN 최적화 파일을 사용하므로 브라우저 표시를 우선합니다.
            unoptimized
          />
        ))}
      </div>

      {/* 오버레이 텍스트는 이미지와 분리해 가독성을 일정하게 유지합니다. */}
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 transition-colors group-hover:bg-black/50">
        <span className="text-xl font-semibold text-white drop-shadow-md">{label}</span>
      </div>
    </Link>
  )
}
