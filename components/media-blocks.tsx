"use client"

import { createReactBlockSpec } from "@blocknote/react"
import { useState, useRef } from "react"
import { Image as ImageIcon, Film, Loader2, X, Trash2 } from "lucide-react"

// Media Block Props
interface MediaBlockProps {
    attachmentId: string
    url: string
    caption: string
    type: "image" | "video" | "audio"
    fileName: string
}

// Image Block Renderer
const ImageBlockRender = ({ block, editor }: any) => {
    const { url, caption, attachmentId } = block.props as MediaBlockProps
    const [isHovered, setIsHovered] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [imgError, setImgError] = useState(false)

    const handleDelete = () => {
        editor.removeBlocks([block.id])
    }

    if (!url) {
        return (
            <div className="w-full py-4 flex items-center justify-center text-neutral-500 bg-neutral-900/50 rounded-lg border border-dashed border-neutral-700">
                <ImageIcon className="w-6 h-6 mr-2" />
                <span>이미지 없음</span>
            </div>
        )
    }

    return (
        <div
            className="my-2 relative group"
            contentEditable={false}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="relative rounded-lg overflow-hidden bg-neutral-900/50 border border-neutral-800">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
                        <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
                    </div>
                )}
                {imgError ? (
                    <div className="w-full py-8 flex flex-col items-center justify-center text-neutral-500">
                        <ImageIcon className="w-8 h-8 mb-2" />
                        <span className="text-sm">이미지를 불러올 수 없습니다</span>
                    </div>
                ) : (
                    <img
                        src={url}
                        alt={caption || "이미지"}
                        className="max-w-full h-auto"
                        onLoad={() => setIsLoading(false)}
                        onError={() => { setIsLoading(false); setImgError(true) }}
                        style={{ display: isLoading ? 'none' : 'block' }}
                    />
                )}

                {/* Hover actions */}
                {isHovered && !isLoading && !imgError && (
                    <div className="absolute top-2 right-2 flex gap-1">
                        <button
                            onClick={handleDelete}
                            className="p-1.5 bg-red-600/90 hover:bg-red-500 rounded-md transition-colors"
                            title="삭제"
                        >
                            <Trash2 className="w-4 h-4 text-white" />
                        </button>
                    </div>
                )}
            </div>

            {/* Caption */}
            {caption && (
                <div className="text-center text-sm text-neutral-500 mt-2">
                    {caption}
                </div>
            )}
        </div>
    )
}

// Video Block Renderer
const VideoBlockRender = ({ block, editor }: any) => {
    const { url, caption, attachmentId } = block.props as MediaBlockProps
    const [isHovered, setIsHovered] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [videoError, setVideoError] = useState(false)

    const handleDelete = () => {
        editor.removeBlocks([block.id])
    }

    if (!url) {
        return (
            <div className="w-full py-4 flex items-center justify-center text-neutral-500 bg-neutral-900/50 rounded-lg border border-dashed border-neutral-700">
                <Film className="w-6 h-6 mr-2" />
                <span>영상 없음</span>
            </div>
        )
    }

    return (
        <div
            className="my-2 relative group"
            contentEditable={false}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="relative rounded-lg overflow-hidden bg-neutral-900/50 border border-neutral-800">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
                        <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
                    </div>
                )}
                {videoError ? (
                    <div className="w-full py-8 flex flex-col items-center justify-center text-neutral-500">
                        <Film className="w-8 h-8 mb-2" />
                        <span className="text-sm">영상을 불러올 수 없습니다</span>
                    </div>
                ) : (
                    <video
                        src={url}
                        controls
                        className="max-w-full h-auto"
                        onLoadedData={() => setIsLoading(false)}
                        onError={() => { setIsLoading(false); setVideoError(true) }}
                        style={{ display: isLoading ? 'none' : 'block' }}
                    />
                )}

                {/* Hover actions */}
                {isHovered && !isLoading && !videoError && (
                    <div className="absolute top-2 right-2 flex gap-1">
                        <button
                            onClick={handleDelete}
                            className="p-1.5 bg-red-600/90 hover:bg-red-500 rounded-md transition-colors"
                            title="삭제"
                        >
                            <Trash2 className="w-4 h-4 text-white" />
                        </button>
                    </div>
                )}
            </div>

            {/* Caption */}
            {caption && (
                <div className="text-center text-sm text-neutral-500 mt-2">
                    {caption}
                </div>
            )}
        </div>
    )
}

// Create the custom image block spec
export const ImageBlock = createReactBlockSpec(
    {
        type: "customImage",
        propSchema: {
            attachmentId: { default: "" },
            url: { default: "" },
            caption: { default: "" },
            type: { default: "image" as const },
            fileName: { default: "" }
        },
        content: "none"
    },
    { render: ImageBlockRender }
)

// Create the custom video block spec
export const VideoBlock = createReactBlockSpec(
    {
        type: "customVideo",
        propSchema: {
            attachmentId: { default: "" },
            url: { default: "" },
            caption: { default: "" },
            type: { default: "video" as const },
            fileName: { default: "" }
        },
        content: "none"
    },
    { render: VideoBlockRender }
)

// Extract attachment IDs from blocks (for sync)
export function extractAttachmentIds(blocks: any[]): Set<string> {
    const ids = new Set<string>()

    const traverse = (items: any[]) => {
        for (const block of items) {
            if (
                (block.type === "customImage" || block.type === "customVideo") &&
                block.props?.attachmentId
            ) {
                ids.add(block.props.attachmentId)
            }
            if (block.children?.length) {
                traverse(block.children)
            }
        }
    }

    traverse(blocks)
    return ids
}
