"use client"

import { useState, useEffect } from "react"

export const DeadlineTimer = ({ dueDate }: { dueDate: string | null }) => {
    const [timeLeft, setTimeLeft] = useState<string>("")

    useEffect(() => {
        if (!dueDate) {
            setTimeLeft("ETERNAL MISSION")
            return
        }

        const interval = setInterval(() => {
            const now = new Date().getTime()
            const target = new Date(dueDate).getTime()
            const distance = target - now

            if (distance < 0) {
                setTimeLeft("MISSION EXPIRED")
                clearInterval(interval)
                return
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24))
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const mins = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
            const secs = Math.floor((distance % (1000 * 60)) / 1000)

            setTimeLeft(`${days}D ${hours}H ${mins}M ${secs}S`)
        }, 1000)

        return () => clearInterval(interval)
    }, [dueDate])

    return (
        <div className="flex flex-col items-center">
            <span className="text-[8px] font-bold text-muted-foreground/30 uppercase tracking-[0.4em] mb-1.5 leading-none font-suit">Operation Window</span>
            <span className="text-xs font-mono font-bold text-foreground tracking-[0.2em] leading-none">{timeLeft}</span>
        </div>
    )
}
