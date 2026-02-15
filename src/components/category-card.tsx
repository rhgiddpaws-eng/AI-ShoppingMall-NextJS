"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"

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
                            priority={index === 0}
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
