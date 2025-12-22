"use client"

import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { CreditCard, Users, Folder, LogOut } from "lucide-react"

export function Header() {
    const { user, signOut } = useAuth()

    if (!user) return null

    return (
        <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-black/50 backdrop-blur-xl">
            <div className="flex items-center gap-6">
                <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <img src="/Darkboard.svg" alt="Darkboard" className="w-auto h-6" />
                </Link>
                <nav className="hidden md:flex items-center gap-6 border-l border-neutral-800 pl-6 h-6">
                    <Link href="/expense" className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
                        <CreditCard className="w-4 h-4" />
                    </Link>
                    <Link href="/team" className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
                        <Users className="w-4 h-4" />
                    </Link>
                    <Link href="/project" className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
                        <Folder className="w-4 h-4" />
                    </Link>
                </nav>
            </div>

            <div className="flex items-center gap-4">
                <span className="text-xs text-neutral-500 hidden sm:inline-block">{user.email}</span>
                <button
                    onClick={() => signOut()}
                    className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors"
                    title="로그아웃"
                >
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
        </header>
    )
}
