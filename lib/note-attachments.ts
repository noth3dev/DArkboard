import { getSupabase } from "./supabase"

export interface NoteAttachment {
    id: string
    note_id: string
    workspace_id: string | null
    uploaded_by: string
    file_name: string
    file_path: string
    file_size: number
    mime_type: string
    is_deleted: boolean
    created_at: string
}

interface UploadOptions {
    noteId: string
    workspaceId?: string
    userId: string
    file: File
}

interface UploadResult {
    success: boolean
    attachment?: NoteAttachment
    url?: string
    error?: string
}

/**
 * Upload a file to note-attachments bucket
 */
export async function uploadNoteAttachment({
    noteId,
    workspaceId,
    userId,
    file
}: UploadOptions): Promise<UploadResult> {
    const supabase = getSupabase()

    try {
        // Generate unique file path: workspace_id/note_id/uuid_filename
        const fileExt = file.name.split('.').pop()
        const uniqueId = crypto.randomUUID()
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const filePath = workspaceId
            ? `${workspaceId}/${noteId}/${uniqueId}_${sanitizedName}`
            : `direct/${noteId}/${uniqueId}_${sanitizedName}`

        // Upload to storage
        const { error: uploadError } = await supabase.storage
            .from('note-attachments')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            })

        if (uploadError) {
            console.error("Storage upload error:", uploadError)
            return { success: false, error: uploadError.message }
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('note-attachments')
            .getPublicUrl(filePath)

        // Save metadata to note_attachments table
        const { data: attachment, error: dbError } = await supabase
            .from('note_attachments')
            .insert({
                note_id: noteId,
                workspace_id: workspaceId,
                uploaded_by: userId,
                file_name: file.name,
                file_path: filePath,
                file_size: file.size,
                mime_type: file.type,
                is_deleted: false
            })
            .select()
            .single()

        if (dbError) {
            // Rollback: delete from storage if db insert failed
            await supabase.storage.from('note-attachments').remove([filePath])
            console.error("DB insert error:", dbError)
            return { success: false, error: dbError.message }
        }

        return {
            success: true,
            attachment,
            url: urlData.publicUrl
        }
    } catch (err) {
        console.error("Upload error:", err)
        return { success: false, error: String(err) }
    }
}

/**
 * Soft-delete an attachment (mark as deleted but keep for undo)
 */
export async function softDeleteAttachment(
    attachmentId: string,
    deletedBy: string
): Promise<boolean> {
    const supabase = getSupabase()

    const { error } = await supabase
        .from('note_attachments')
        .update({
            is_deleted: true,
            deleted_at: new Date().toISOString(),
            deleted_by: deletedBy
        })
        .eq('id', attachmentId)

    return !error
}

/**
 * Restore a soft-deleted attachment (for undo)
 */
export async function restoreAttachment(attachmentId: string): Promise<boolean> {
    const supabase = getSupabase()

    const { error } = await supabase
        .from('note_attachments')
        .update({
            is_deleted: false,
            deleted_at: null,
            deleted_by: null
        })
        .eq('id', attachmentId)

    return !error
}

/**
 * Permanently delete an attachment (from both DB and storage)
 */
export async function permanentlyDeleteAttachment(
    attachmentId: string
): Promise<boolean> {
    const supabase = getSupabase()

    // Get file path first
    const { data: attachment } = await supabase
        .from('note_attachments')
        .select('file_path')
        .eq('id', attachmentId)
        .single()

    if (!attachment) return false

    // Delete from storage
    const { error: storageError } = await supabase.storage
        .from('note-attachments')
        .remove([attachment.file_path])

    if (storageError) {
        console.error("Storage delete error:", storageError)
        // Continue anyway to clean up DB record
    }

    // Delete from DB
    const { error: dbError } = await supabase
        .from('note_attachments')
        .delete()
        .eq('id', attachmentId)

    return !dbError
}

/**
 * Sync attachments with note content - remove orphaned attachments
 * Called when saving note content
 */
export async function syncAttachments(
    noteId: string,
    activeAttachmentIds: Set<string>
): Promise<void> {
    const supabase = getSupabase()

    // Get all non-deleted attachments for this note
    const { data: attachments } = await supabase
        .from('note_attachments')
        .select('id, is_deleted')
        .eq('note_id', noteId)

    if (!attachments) return

    // Soft-delete attachments that are no longer in content
    const toDelete = attachments.filter(
        (a: { id: string; is_deleted: boolean }) => !a.is_deleted && !activeAttachmentIds.has(a.id)
    )

    // Restore attachments that are back in content (undo support)
    const toRestore = attachments.filter(
        (a: { id: string; is_deleted: boolean }) => a.is_deleted && activeAttachmentIds.has(a.id)
    )

    if (toDelete.length > 0) {
        await supabase
            .from('note_attachments')
            .update({
                is_deleted: true,
                deleted_at: new Date().toISOString()
            })
            .in('id', toDelete.map((a: { id: string }) => a.id))
    }

    if (toRestore.length > 0) {
        await supabase
            .from('note_attachments')
            .update({
                is_deleted: false,
                deleted_at: null,
                deleted_by: null
            })
            .in('id', toRestore.map((a: { id: string }) => a.id))
    }
}

/**
 * Clean up old soft-deleted attachments (run periodically)
 * Deletes attachments that have been soft-deleted for more than 30 days
 */
export async function cleanupOldAttachments(): Promise<number> {
    const supabase = getSupabase()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Get old deleted attachments
    const { data: oldAttachments } = await supabase
        .from('note_attachments')
        .select('id, file_path')
        .eq('is_deleted', true)
        .lt('deleted_at', thirtyDaysAgo.toISOString())

    if (!oldAttachments || oldAttachments.length === 0) return 0

    // Delete from storage
    const filePaths = oldAttachments.map((a: { id: string; file_path: string }) => a.file_path)
    await supabase.storage.from('note-attachments').remove(filePaths)

    // Delete from DB
    await supabase
        .from('note_attachments')
        .delete()
        .in('id', oldAttachments.map((a: { id: string }) => a.id))

    return oldAttachments.length
}

/**
 * Get all attachments for a note
 */
export async function getNoteAttachments(
    noteId: string,
    includeDeleted = false
): Promise<NoteAttachment[]> {
    const supabase = getSupabase()

    let query = supabase
        .from('note_attachments')
        .select('*')
        .eq('note_id', noteId)

    if (!includeDeleted) {
        query = query.eq('is_deleted', false)
    }

    const { data } = await query.order('created_at', { ascending: false })
    return data || []
}

/**
 * Get attachment URL
 */
export function getAttachmentUrl(filePath: string): string {
    const supabase = getSupabase()
    const { data } = supabase.storage
        .from('note-attachments')
        .getPublicUrl(filePath)
    return data.publicUrl
}

/**
 * Check if file type is allowed
 */
export function isAllowedFileType(file: File): boolean {
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'video/mp4', 'video/webm', 'video/quicktime',
        'audio/mpeg', 'audio/wav', 'audio/ogg',
        'application/pdf'
    ]
    return allowedTypes.includes(file.type)
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
    return file.type.startsWith('image/')
}

/**
 * Check if file is a video
 */
export function isVideoFile(file: File): boolean {
    return file.type.startsWith('video/')
}

/**
 * Check if file is audio
 */
export function isAudioFile(file: File): boolean {
    return file.type.startsWith('audio/')
}

/**
 * Max file size (50MB)
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/**
 * Check if file size is within limit
 */
export function isFileSizeValid(file: File): boolean {
    return file.size <= MAX_FILE_SIZE
}
