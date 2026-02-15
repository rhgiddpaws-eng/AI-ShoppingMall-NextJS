"use client"
/**
 * 히어로 섹션: GIF / 동영상 또는 이미지 배경 + 오버레이 텍스트·CTA (framer-motion)
 * - gifSrc 있으면 애니메이션 GIF 배경 (브라우저 호환 좋음)
 * - videoSrc 있으면 video 배경 (autoplay muted loop playsInline)
 * - 없으면 posterSrc 이미지
 */

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

const defaultImageSrc = "/main/1-hq.webp"

export function HeroSection({
  gifSrc,
  videoSrc,
  posterSrc = defaultImageSrc,
  title = "패션 컬렉션 출시",
  subtitle = "최신 트렌드로 패션을 준비하세요",
}: {
  gifSrc?: string
  videoSrc?: string
  posterSrc?: string
  title?: string
  subtitle?: string
}) {
  return (
    <section className="relative">
      <div className="relative h-[400px] sm:h-[500px] md:h-[600px] lg:h-[800px] w-full overflow-hidden">
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
            poster={posterSrc}
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src={videoSrc} type="video/mp4" />
            <Image src={posterSrc} alt="" fill sizes="100vw" className="object-cover" priority />
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
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
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
            className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-3 sm:mb-4 tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {title}
          </motion.h1>
          <motion.p
            className="text-base sm:text-lg md:text-xl text-center mb-4 sm:mb-6 max-w-2xl text-white/90"
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
              className="bg-white/10 backdrop-blur-sm border-white text-white hover:bg-white/20 min-h-[44px] min-w-[120px] shadow-xl shadow-black/20"
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
