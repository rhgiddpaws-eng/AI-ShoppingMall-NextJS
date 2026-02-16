"use client"

/**
 * 히어로 섹션입니다.
 * - GIF, 비디오, 포스터 이미지를 순서대로 선택해서 배경으로 표시합니다.
 * - 중앙 텍스트/CTA 버튼은 framer-motion으로 부드럽게 노출합니다.
 */

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"

// 히어로 기본 포스터에도 버전 쿼리를 붙여 캐시된 이전 이미지 노출을 막습니다.
const HERO_ASSET_VERSION =
  process.env.NEXT_PUBLIC_HERO_ASSET_VERSION || "20260217-hero-1"
const defaultImageSrc = `/main/1.webp?v=${encodeURIComponent(HERO_ASSET_VERSION)}`

export function HeroSection({
  gifSrc,
  videoSrc,
  posterSrc = defaultImageSrc,
  title = "뉴 시즌 컬렉션 출시",
  subtitle = "최신 트렌드로 스타일을 완성해 보세요",
}: {
  gifSrc?: string
  videoSrc?: string
  posterSrc?: string
  title?: string
  subtitle?: string
}) {
  return (
    <section className="relative">
      <div className="relative h-[400px] w-full overflow-hidden sm:h-[500px] md:h-[600px] lg:h-[800px]">
        {gifSrc ? (
          <Image
            src={gifSrc}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            priority
            unoptimized
          />
        ) : videoSrc ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            // 전체 파일을 먼저 받지 않고 메타데이터만 받아 첫 렌더를 빠르게 유지합니다.
            preload="metadata"
            poster={posterSrc}
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
        ) : (
          <Image
            src={posterSrc}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/35 to-black/60">
          <div className="absolute -left-16 top-8 h-56 w-56 rounded-full bg-amber-300/20 blur-3xl" />
          <div className="absolute -right-20 bottom-6 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl" />
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-white">
          <motion.div
            className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/25 px-3 py-1 text-xs font-medium backdrop-blur"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            New Season Curation
          </motion.div>

          <motion.h1
            className="mb-3 text-center text-2xl font-bold tracking-tight sm:mb-4 sm:text-4xl md:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {title}
          </motion.h1>

          <motion.p
            className="mb-4 max-w-2xl text-center text-base text-white/90 sm:mb-6 sm:text-lg md:text-xl"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            {subtitle}
          </motion.p>

          <motion.div
            className="flex flex-wrap justify-center gap-3 sm:gap-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <Button size="lg" asChild className="min-h-[44px] min-w-[120px] shadow-xl shadow-black/20">
              <Link href="/category/new">신상품 보기</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="min-h-[44px] min-w-[120px] border-white bg-white/10 text-white shadow-xl shadow-black/20 backdrop-blur-sm hover:bg-white/20"
              asChild
            >
              <Link href="/category/sale">세일 상품</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
