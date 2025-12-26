"use client"

import { useSandpack } from "@codesandbox/sandpack-react"
import { Send, Download, Loader2 } from "lucide-react"
import JSZip from "jszip"

export const SandpackSubmissionControl = ({ onSubmit, submitting }: { onSubmit: (files: any) => void, submitting: boolean }) => {
    const { sandpack } = useSandpack()

    return (
        <button
            onClick={() => onSubmit(sandpack.files)}
            disabled={submitting}
            className={`
                h-11 px-6 bg-foreground text-background rounded-2xl
                text-[10px] font-bold uppercase tracking-widest
                hover:opacity-90 transition-all active:scale-95 disabled:opacity-50
                shadow-xl shadow-white/5 flex items-center justify-center gap-3
            `}
            title="Submit Artifacts"
        >
            {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <>
                    <span>Transmit Packet</span>
                    <Send className="w-4 h-4" />
                </>
            )}
        </button>
    )
}

export const SandpackDownloadControl = () => {
    const { sandpack } = useSandpack()

    const handleDownload = async () => {
        const zip = new JSZip()
        const files = sandpack.files

        Object.keys(files).forEach((path) => {
            const content = files[path].code
            const zipPath = path.startsWith("/") ? path.slice(1) : path
            zip.file(zipPath, content)
        })

        const blob = await zip.generateAsync({ type: "blob" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = "synapse_payload.zip"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    return (
        <button
            onClick={handleDownload}
            className="p-3 bg-secondary border border-border text-muted-foreground rounded-2xl hover:text-foreground hover:bg-accent transition-all active:scale-95 flex items-center justify-center shadow-lg shadow-black/5"
            title="Download Workspace"
        >
            <Download className="w-5 h-5" />
        </button>
    )
}
