"use client"

import { motion } from "framer-motion"

export function NoteSkeleton() {
    return (
        <div className="min-h-full bg-black text-white p-6 lg:p-16 max-w-4xl mx-auto space-y-12">
            {/* Header / Meta Skeleton */}
            <div className="flex items-center justify-end mb-4">
                <div className="w-24 h-4 bg-neutral-900/50 rounded animate-pulse" />
            </div>

            {/* Title Skeleton */}
            <div className="space-y-4">
                <div className="w-3/4 h-12 bg-neutral-900/50 rounded-xl animate-pulse" />
            </div>

            {/* Content Blocks Skeleton */}
            <div className="space-y-8 mt-12">
                <div className="space-y-3">
                    <div className="w-full h-4 bg-neutral-900/50 rounded animate-pulse" />
                    <div className="w-5/6 h-4 bg-neutral-900/50 rounded animate-pulse" />
                    <div className="w-4/6 h-4 bg-neutral-900/50 rounded animate-pulse" />
                </div>

                <div className="w-full h-64 bg-neutral-900/30 rounded-2xl animate-pulse flex items-center justify-center">
                    <div className="w-12 h-12 border-2 border-neutral-800 border-t-neutral-600 rounded-full animate-spin opacity-20" />
                </div>

                <div className="space-y-3">
                    <div className="w-full h-4 bg-neutral-900/50 rounded animate-pulse" />
                    <div className="w-2/3 h-4 bg-neutral-900/50 rounded animate-pulse" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="h-32 bg-neutral-900/30 rounded-xl animate-pulse" />
                    <div className="h-32 bg-neutral-900/30 rounded-xl animate-pulse" />
                </div>
            </div>

            <style jsx>{`
                @keyframes pulse {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 0.6; }
                }
                .animate-pulse {
                    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}</style>
        </div>
    )
}
