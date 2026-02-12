/**
 * Client-side media storage using IndexedDB.
 * Media files (photos, videos, audio) are stored locally on the device,
 * NOT in the database. Only a reference key is stored in the DB.
 * This keeps the database lightweight — like WhatsApp's approach.
 */

const DB_NAME = 'bonded_media';
const STORE_NAME = 'media_files';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp');
                store.createIndex('type', 'type');
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export interface LocalMedia {
    id: string;          // Unique key (also stored as media_local_ref in DB)
    data: Blob;          // Actual media bytes
    type: 'image' | 'video' | 'audio';
    mimeType: string;
    timestamp: number;
    isEphemeral?: boolean; // Auto-delete after first view
}

/** Save media locally (returns the reference key for the database) */
export async function saveMedia(file: File | Blob, type: LocalMedia['type'], isEphemeral = false): Promise<string> {
    const db = await openDB();
    const id = `media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const media: LocalMedia = {
        id,
        data: file,
        type,
        mimeType: file.type,
        timestamp: Date.now(),
        isEphemeral,
    };

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(media);
        tx.oncomplete = () => resolve(id);
        tx.onerror = () => reject(tx.error);
    });
}

/** Get media by reference key */
export async function getMedia(id: string): Promise<LocalMedia | null> {
    const db = await openDB();
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
    });
}

/** Get media as an object URL for display */
export async function getMediaURL(id: string): Promise<string | null> {
    const media = await getMedia(id);
    if (!media) return null;
    return URL.createObjectURL(media.data);
}

/** Delete media (for ephemeral content after viewing) */
export async function deleteMedia(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/** View ephemeral media — auto-deletes after viewing */
export async function viewEphemeralMedia(id: string): Promise<string | null> {
    const url = await getMediaURL(id);
    if (url) {
        // Schedule deletion after a short delay (gives time to render)
        setTimeout(() => deleteMedia(id), 5000);
    }
    return url;
}

/** Clean up old media (call periodically) */
export async function cleanupOldMedia(maxAgeMs = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const db = await openDB();
    const cutoff = Date.now() - maxAgeMs;
    let deleted = 0;

    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('timestamp');
        const range = IDBKeyRange.upperBound(cutoff);
        const cursor = index.openCursor(range);

        cursor.onsuccess = () => {
            const c = cursor.result;
            if (c) {
                c.delete();
                deleted++;
                c.continue();
            }
        };

        tx.oncomplete = () => resolve(deleted);
    });
}

/** Get total storage used */
export async function getStorageUsage(): Promise<{ count: number; bytes: number }> {
    const db = await openDB();
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const cursor = store.openCursor();
        let count = 0;
        let bytes = 0;

        cursor.onsuccess = () => {
            const c = cursor.result;
            if (c) {
                count++;
                bytes += (c.value as LocalMedia).data.size;
                c.continue();
            }
        };

        tx.oncomplete = () => resolve({ count, bytes });
    });
}
