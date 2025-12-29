"use client"

import * as Y from "yjs"
import { Awareness } from "y-protocols/awareness"
import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js"

export interface SupabaseProviderConfig {
    channel: string
}

/**
 * Custom Yjs provider that uses Supabase Realtime for synchronization.
 * This replaces the y-supabase package.
 */
export class SupabaseProvider {
    public awareness: Awareness
    public readonly doc: Y.Doc

    private supabase: SupabaseClient
    private channel: RealtimeChannel | null = null
    private channelName: string
    private isDestroyed = false
    private isSynced = false

    constructor(doc: Y.Doc, supabase: SupabaseClient, config: SupabaseProviderConfig) {
        this.doc = doc
        this.supabase = supabase
        this.channelName = config.channel
        this.awareness = new Awareness(doc)

        this.setupChannel()
        this.setupDocListener()
    }

    private setupChannel() {
        this.channel = this.supabase.channel(this.channelName, {
            config: {
                broadcast: { self: false },
                presence: { key: this.doc.clientID.toString() }
            }
        })

        // Handle incoming document updates
        this.channel.on("broadcast", { event: "yjs-update" }, ({ payload }) => {
            if (this.isDestroyed) return
            try {
                const update = new Uint8Array(payload.update)
                this.doc.transact(() => {
                    Y.applyUpdate(this.doc, update, "remote")
                }, "remote")
            } catch (err) {
                // Silently ignore position errors during sync
                if (!(err instanceof RangeError)) {
                    console.error("Failed to apply Yjs update:", err)
                }
            }
        })

        // Handle incoming awareness updates
        this.channel.on("broadcast", { event: "awareness-update" }, ({ payload }) => {
            if (this.isDestroyed) return
            try {
                const update = new Uint8Array(payload.update)
                const { applyAwarenessUpdate } = require("y-protocols/awareness")
                applyAwarenessUpdate(this.awareness, update, "remote")
            } catch (err) {
                console.error("Failed to apply awareness update:", err)
            }
        })

        // Handle sync request - send full state to new clients
        this.channel.on("broadcast", { event: "sync-request" }, ({ payload }) => {
            if (this.isDestroyed) return
            if (payload.clientId !== this.doc.clientID) {
                this.sendSyncStep1()
            }
        })

        // Handle sync response - apply full state from other clients
        this.channel.on("broadcast", { event: "sync-response" }, ({ payload }) => {
            if (this.isDestroyed) return
            try {
                const update = new Uint8Array(payload.update)
                this.doc.transact(() => {
                    Y.applyUpdate(this.doc, update, "remote")
                }, "remote")
                this.isSynced = true
            } catch (err) {
                // Silently ignore position errors during initial sync
                if (!(err instanceof RangeError)) {
                    console.error("Failed to apply sync update:", err)
                }
                // Still mark as synced to allow editing
                this.isSynced = true
            }
        })

        // Subscribe and request sync
        this.channel.subscribe((status) => {
            if (status === "SUBSCRIBED") {
                // Request sync from other connected clients
                this.channel?.send({
                    type: "broadcast",
                    event: "sync-request",
                    payload: { clientId: this.doc.clientID }
                })

                // Also send our awareness state
                this.broadcastAwareness()
            }
        })
    }

    private setupDocListener() {
        // Broadcast local updates to other clients
        this.doc.on("update", (update: Uint8Array, origin: any) => {
            if (this.isDestroyed || origin === "remote") return
            this.channel?.send({
                type: "broadcast",
                event: "yjs-update",
                payload: { update: Array.from(update) }
            })
        })

        // Broadcast awareness updates
        this.awareness.on("update", ({ added, updated, removed }: { added: number[], updated: number[], removed: number[] }) => {
            if (this.isDestroyed) return
            const changedClients = added.concat(updated).concat(removed)
            if (changedClients.length > 0) {
                this.broadcastAwareness()
            }
        })
    }

    private sendSyncStep1() {
        const state = Y.encodeStateAsUpdate(this.doc)
        this.channel?.send({
            type: "broadcast",
            event: "sync-response",
            payload: { update: Array.from(state) }
        })
    }

    private broadcastAwareness() {
        try {
            const { encodeAwarenessUpdate } = require("y-protocols/awareness")
            const update = encodeAwarenessUpdate(this.awareness, [this.doc.clientID])
            this.channel?.send({
                type: "broadcast",
                event: "awareness-update",
                payload: { update: Array.from(update) }
            })
        } catch (err) {
            console.error("Failed to broadcast awareness:", err)
        }
    }

    get synced(): boolean {
        return this.isSynced
    }

    destroy() {
        this.isDestroyed = true

        // Remove local awareness state
        const { removeAwarenessStates } = require("y-protocols/awareness")
        removeAwarenessStates(this.awareness, [this.doc.clientID], "local")

        // Unsubscribe from channel
        if (this.channel) {
            this.supabase.removeChannel(this.channel)
            this.channel = null
        }

        this.awareness.destroy()
    }
}
