"use client"

import * as Y from "yjs"
import { getSupabase } from "@/lib/supabase"
import type { RealtimeChannel } from "@supabase/supabase-js"
import * as awarenessProtocol from "y-protocols/awareness"

// User color palette for collaboration
const USER_COLORS = [
    "#E91E63", // Pink
    "#2196F3", // Blue
    "#4CAF50", // Green
    "#FF9800", // Orange
    "#9C27B0", // Purple
    "#00BCD4", // Cyan
    "#FF5722", // Deep Orange
    "#607D8B", // Blue Grey
    "#3F51B5", // Indigo
    "#009688", // Teal
]

// Generate consistent color from user ID
export function getUserColor(userId: string): string {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    }
    return USER_COLORS[Math.abs(hash) % USER_COLORS.length]
}

export type CollaborationUser = {
    id: string
    name: string
    color: string
}

type BroadcastPayload = {
    payload?: {
        update?: string
    }
}

type AwarenessUpdateParams = {
    added: number[]
    updated: number[]
    removed: number[]
}

/**
 * Custom Yjs provider using Supabase Realtime Broadcast
 * Syncs document changes and awareness state between clients
 */
export class SupabaseBroadcastProvider {
    doc: Y.Doc
    awareness: awarenessProtocol.Awareness
    channel: RealtimeChannel | null = null
    roomId: string
    user: CollaborationUser
    private synced = false
    private destroyed = false

    constructor(
        doc: Y.Doc,
        roomId: string,
        user: CollaborationUser
    ) {
        this.doc = doc
        this.roomId = roomId
        this.user = user
        this.awareness = new awarenessProtocol.Awareness(doc)

        // Set local user state
        this.awareness.setLocalState({
            user: {
                id: user.id,
                name: user.name,
                color: user.color,
            }
        })

        this.connect()
    }

    private connect() {
        if (this.destroyed) return

        const supabase = getSupabase()

        this.channel = supabase
            .channel(`yjs-${this.roomId}`, {
                config: {
                    broadcast: { self: false }
                }
            })
            .on("broadcast", { event: "yjs-update" }, (data: BroadcastPayload) => {
                if (data.payload?.update) {
                    const update = this.base64ToUint8Array(data.payload.update)
                    Y.applyUpdate(this.doc, update, "remote")
                }
            })
            .on("broadcast", { event: "yjs-awareness" }, (data: BroadcastPayload) => {
                if (data.payload?.update) {
                    const update = this.base64ToUint8Array(data.payload.update)
                    awarenessProtocol.applyAwarenessUpdate(this.awareness, update, "remote")
                }
            })
            .on("broadcast", { event: "yjs-sync-request" }, () => {
                // Someone is requesting full state
                this.broadcastFullState()
            })
            .on("broadcast", { event: "yjs-sync-response" }, (data: BroadcastPayload) => {
                if (data.payload?.update && !this.synced) {
                    const update = this.base64ToUint8Array(data.payload.update)
                    Y.applyUpdate(this.doc, update, "remote")
                    this.synced = true
                }
            })
            .subscribe((status: string) => {
                if (status === "SUBSCRIBED") {
                    // Request initial state from other clients
                    this.channel?.send({
                        type: "broadcast",
                        event: "yjs-sync-request",
                        payload: {}
                    })

                    // Broadcast awareness after connection
                    setTimeout(() => this.broadcastAwareness(), 100)
                }
            })

        // Listen for local document updates
        this.doc.on("update", this.handleDocUpdate)

        // Listen for awareness updates
        this.awareness.on("update", this.handleAwarenessUpdate)
    }

    private handleDocUpdate = (update: Uint8Array, origin: string) => {
        if (origin === "remote" || this.destroyed) return

        this.channel?.send({
            type: "broadcast",
            event: "yjs-update",
            payload: {
                update: this.uint8ArrayToBase64(update)
            }
        })
    }

    private handleAwarenessUpdate = ({ added, updated, removed }: AwarenessUpdateParams) => {
        if (this.destroyed) return

        const changedClients = added.concat(updated).concat(removed)
        const update = awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)

        this.channel?.send({
            type: "broadcast",
            event: "yjs-awareness",
            payload: {
                update: this.uint8ArrayToBase64(update)
            }
        })
    }

    private broadcastFullState() {
        if (this.destroyed) return

        const state = Y.encodeStateAsUpdate(this.doc)
        this.channel?.send({
            type: "broadcast",
            event: "yjs-sync-response",
            payload: {
                update: this.uint8ArrayToBase64(state)
            }
        })
    }

    private broadcastAwareness() {
        if (this.destroyed) return

        const update = awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this.doc.clientID])
        this.channel?.send({
            type: "broadcast",
            event: "yjs-awareness",
            payload: {
                update: this.uint8ArrayToBase64(update)
            }
        })
    }

    private uint8ArrayToBase64(arr: Uint8Array): string {
        return btoa(String.fromCharCode(...arr))
    }

    private base64ToUint8Array(base64: string): Uint8Array {
        const binary = atob(base64)
        const arr = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
            arr[i] = binary.charCodeAt(i)
        }
        return arr
    }

    destroy() {
        this.destroyed = true

        // Remove local awareness state
        awarenessProtocol.removeAwarenessStates(this.awareness, [this.doc.clientID], "local")

        // Remove listeners
        this.doc.off("update", this.handleDocUpdate)
        this.awareness.off("update", this.handleAwarenessUpdate)

        // Unsubscribe from channel
        if (this.channel) {
            const supabase = getSupabase()
            supabase.removeChannel(this.channel)
            this.channel = null
        }
    }
}
