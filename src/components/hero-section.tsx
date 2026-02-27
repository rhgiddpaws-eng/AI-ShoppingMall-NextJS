"use client"

/**
 * 히어로 섹션입니다.
 * - 첫 화면은 포스터 이미지로 빠르게 그립니다.
 * - 동영상은 첫 페인트 이후, 네트워크가 괜찮을 때만 지연 로딩합니다.
 * - 동영상이 재생 가능 상태가 되면 크로스페이드로 부드럽게 전환합니다.
 */

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"

// 히어로 기본 포스터에 버전 쿼리를 붙여 캐시된 이전 이미지를 노출하지 않도록 합니다.
const HERO_ASSET_VERSION =
  process.env.NEXT_PUBLIC_HERO_ASSET_VERSION || "20260217-hero-1"
const defaultImageSrc = `/main/1.webp?v=${encodeURIComponent(HERO_ASSET_VERSION)}`
// 첫 진입 시 LCP를 먼저 안정화하기 위해 비디오 로딩을 잠시 뒤로 미룹니다.
const HERO_VIDEO_DEFER_MS = 800

type NavigatorConnection = {
  saveData?: boolean
  effectiveType?: string
}

function canDeferLoadVideo() {
  if (typeof window === "undefined") return false

  // 절약 모드/저속 네트워크에서는 동영상 로딩을 건너뛰어 초기 체감을 우선합니다.
  const connection = (navigator as Navigator & { connection?: NavigatorConnection })
    .connection
  if (connection?.saveData) return false

  const effectiveType = (connection?.effectiveType || "").toLowerCase()
  if (
    effectiveType === "slow-2g" ||
    effectiveType === "2g" ||
    effectiveType === "3g"
  ) {
    return false
  }

  return true
}

export function HeroSection({
  gifSrc,
  videoSrc,
  posterSrc = defaultImageSrc,
  title = "신규 시즌 컬렉션 출시",
  subtitle = "최신 트렌드로 스타일을 완성해 보세요.",
}: {
  gifSrc?: string
  videoSrc?: string
  posterSrc?: string
  title?: string
  subtitle?: string
}) {
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false)
  // 비디오가 실제로 재생 가능해지면 true로 전환해 크로스페이드합니다.
  const [videoReady, setVideoReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!videoSrc) return
    if (!canDeferLoadVideo()) return

    const browserGlobal = globalThis as typeof globalThis & {
      requestIdleCallback?: (callback: () => void) => number
      cancelIdleCallback?: (handle: number) => void
    }

    let timeoutId: number | undefined
    let idleId: number | undefined

    if (typeof browserGlobal.requestIdleCallback === "function") {
      idleId = browserGlobal.requestIdleCallback(() => {
        timeoutId = window.setTimeout(() => {
          setShouldLoadVideo(true)
        }, HERO_VIDEO_DEFER_MS)
      })
    } else {
      timeoutId = window.setTimeout(() => {
        setShouldLoadVideo(true)
      }, HERO_VIDEO_DEFER_MS)
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId)
      if (idleId && typeof browserGlobal.cancelIdleCallback === "function") {
        browserGlobal.cancelIdleCallback(idleId)
      }
    }
  }, [videoSrc])

  // 비디오가 재생 가능해지면 크로스페이드 전환합니다.
  const handleCanPlay = () => {
    setVideoReady(true)
  }

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
        ) : (
          <>
            {/* 포스터 이미지: 비디오가 완전히 준비될 때까지 계속 표시합니다. */}
            <Image
              src={posterSrc}
              alt=""
              fill
              sizes="100vw"
              className={`object-cover transition-opacity duration-700 ${videoReady ? "opacity-0" : "opacity-100"
                }`}
              priority
            />

            {/* 비디오: 로딩 후 canplay 이벤트 시 페이드인합니다. */}
            {shouldLoadVideo && videoSrc && (
              <video
                ref={videoRef}
                autoPlay
                muted
                loop
                playsInline
                // metadata를 먼저 받아 첫 프레임을 빠르게 표시합니다.
                preload="auto"
                onCanPlay={handleCanPlay}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${videoReady ? "opacity-100" : "opacity-0"
                  }`}
              >
                <source src={videoSrc} type="video/mp4" />
              </video>
            )}
          </>
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/35 to-black/60">
          <div className="absolute -left-16 top-8 h-56 w-56 rounded-full bg-amber-300/20 blur-3xl" />
          <div className="absolute -right-20 bottom-6 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl" />
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-white">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/25 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            New Season Curation
          </div>

          <h1 className="mb-3 text-center text-2xl font-bold tracking-tight sm:mb-4 sm:text-4xl md:text-5xl lg:text-6xl">
            {title}
          </h1>

          <p className="mb-4 max-w-2xl text-center text-base text-white/90 sm:mb-6 sm:text-lg md:text-xl">
            {subtitle}
          </p>

          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
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
          </div>
        </div>
      </div>
    </section>
  )
}
