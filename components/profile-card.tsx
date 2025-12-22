"use client"

import { useEffect, useRef, useState, type MouseEvent } from "react"

type ProfileCardProps = {
  name: string
  nameEng?: string | null
  role?: string | null
  displayName?: string | null
  phone?: string | null
}

export function ProfileCard({ name, nameEng, role, displayName, phone }: ProfileCardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [transform, setTransform] = useState<string>("rotateX(0deg) rotateY(0deg)")
  const [isFlipped, setIsFlipped] = useState(false)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    // 마운트 시 위에서 자연스럽게 내려오는 애니메이션
    const id = window.requestAnimationFrame(() => setEntered(true))
    return () => window.cancelAnimationFrame(id)
  }, [])

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const middleX = rect.width / 2
    const middleY = rect.height / 2

    const offsetX = (x - middleX) / middleX
    const offsetY = (y - middleY) / middleY

    const rotateX = -(offsetY * 6) // 상하
    const rotateYHover = offsetX * 10 // 좌우(호버)

    const baseRotateY = isFlipped ? 180 : 0

    setTransform(`rotateX(${rotateX}deg) rotateY(${baseRotateY + rotateYHover}deg)`)
  }

  function handleMouseLeave() {
    const baseRotateY = isFlipped ? 180 : 0
    setTransform(`rotateX(0deg) rotateY(${baseRotateY}deg)`)
  }

  function handleClick() {
    const next = !isFlipped
    setIsFlipped(next)
    const baseRotateY = next ? 180 : 0
    setTransform(`rotateX(0deg) rotateY(${baseRotateY}deg)`)
  }

  return (
    <div
      ref={containerRef}
      className={`w-full max-w-2xl aspect-[16/9] flex items-center justify-center transform transition-all duration-500 ease-out ${
        entered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10"
      }`}
      style={{ perspective: 1400 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div
        className="w-full h-full bg-transparent text-black relative shadow-[0_18px_45px_rgba(0,0,0,0.28)] rounded-[18px] transition-transform duration-200 ease-out cursor-pointer"
        style={{
          transform: transform,
          transformStyle: "preserve-3d",
        }}
      >
        {/* 앞면 */}
        <div
          className="absolute inset-0 bg-white rounded-[18px] flex flex-col"
          style={{ backfaceVisibility: "hidden" }}
        >
          {/* 상단 영역 */}
          <div className="flex-1 flex justify-between px-8 md:px-10 lg:px-11 pt-8 md:pt-10">
            {/* 이름 / 영문 이름(옆) / 롤(아래) */}
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">{name}</h1>
                {nameEng && (
                  <span className="text-base md:text-lg lg:text-xl font-semibold text-black">{nameEng}</span>
                )}
              </div>

              {role && (
                <p className="text-base md:text-lg lg:text-xl text-neutral-400 font-semibold whitespace-pre-line">
                  {role}
                </p>
              )}
            </div>

            {/* Ark 로고 */}
            <div className="flex items-start">
              <img src="/ark.svg" alt="Ark" className="h-9 md:h-11 lg:h-13 w-auto" />
            </div>
          </div>

          {/* 하단 영역 */}
          <div className="flex items-end justify-between px-8 md:px-10 lg:px-11 pb-6 md:pb-8">
            {/* display_name / phone */}
            <div className="space-y-1 text-sm md:text-base leading-tight">
              {displayName && <p className="font-bold">{displayName}</p>}
              {phone && <p className="text-neutral-700">{phone}</p>}
            </div>

            {/* 슬로건 */}
            <div className="text-right text-xs md:text-sm leading-relaxed tracking-[0.16em] uppercase">
              <p className="text-neutral-500">Make</p>
              <p className="text-neutral-500">Yourself</p>
              <p className="text-neutral-500">
                Tradem
                <span className="text-black font-semibold">Ark</span>
              </p>
            </div>
          </div>
        </div>

        {/* 뒷면 */}
        <div
          className="absolute inset-0 bg-white rounded-[18px] flex flex-col text-center px-8 md:px-10"
          style={{
            transform: "rotateY(180deg)",
            backfaceVisibility: "hidden",
          }}
        >
          {/* 상단 여백 */}
          <div className="flex-1" />

          {/* 중앙 Ark 로고 + 슬로건 한 줄 (카드 정중앙) */}
          <div className="flex flex-col items-center gap-4 flex-none">
            <img src="/ark.svg" alt="Ark" className="h-8 md:h-10 lg:h-11 w-auto" />
            <p className="text-[10px] md:text-xs tracking-[0.22em] uppercase">
              <span className="text-neutral-500">Make Yourself Tradem</span>
              <span className="text-black font-semibold">Ark</span>
            </p>
          </div>

          {/* 하단 도메인 */}
          <div className="flex-1 flex items-end justify-center pb-6 md:pb-7">
            <p className="text-[11px] md:text-xs text-neutral-700 tracking-[0.18em]">arks.run</p>
          </div>
        </div>
      </div>
    </div>
  )
}


