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
import { Button } from "@/components/ui/button"

const defaultImageSrc = "/main/1.webp"

export function HeroSection({
  gifSrc,
  videoSrc,
  posterSrc = defaultImageSrc,
  title = "여름 컬렉션 출시",
  subtitle = "최신 트렌드로 여름을 준비하세요",
}: {
  gifSrc?: string
  videoSrc?: string
  posterSrc?: string
  title?: string
  subtitle?: string
}) {
  return (
    <section className="relative">
      <div className="relative h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] w-full overflow-hidden">
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
        <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-white p-4">
          <motion.h1
            className="text-2xl sm:text-4xl md:text-5xl font-bold text-center mb-3 sm:mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {title}
          </motion.h1>
          <motion.p
            className="text-base sm:text-lg md:text-xl text-center mb-4 sm:mb-6 max-w-xl"
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
            <Button size="lg" asChild className="min-h-[44px] min-w-[120px]">
              <Link href="/category/new">신상품 보기</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-white/10 backdrop-blur-sm border-white text-white hover:bg-white/20 min-h-[44px] min-w-[120px]"
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
