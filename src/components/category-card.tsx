"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
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

        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % images.length)
        }, interval)

        return () => clearInterval(timer)
    }, [images.length, interval])

    return (
        <Link
            href={href}
            // 카테고리 카드 수가 적으므로 prefetch를 켜서 클릭 직후 전환을 빠르게 만듭니다.
            onMouseEnter={() => warmCategoryRoute(router, href)}
            onTouchStart={() => warmCategoryRoute(router, href)}
            onFocus={() => warmCategoryRoute(router, href)}
            className="group relative h-[150px] sm:h-[200px] md:h-[270px] lg:h-[340px] rounded-lg overflow-hidden block"
        >
            <div className="absolute inset-0 w-full h-full bg-gray-200">
                <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                        key={images[index]}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1, ease: "easeInOut" }}
                        className="absolute inset-0 w-full h-full"
                    >
                        <Image
                            src={images[index]}
                            alt={label}
                            fill
                            sizes="(max-width: 768px) 50vw, 25vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            // 카테고리 썸네일은 S3 WebP를 그대로 써서 초기 재인코딩 지연을 줄입니다.
                            unoptimized
                            // 카드가 4개 이상 동시에 보이므로 eager 로딩을 피해서 초기 트래픽을 줄입니다.
                        />
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Overlay & Label */}
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center z-10">
                <span className="text-white text-xl font-semibold drop-shadow-md">
                    {label}
                </span>
            </div>
        </Link>
    )
}
