// Excel de agenda "vinculado": el usuario sincroniza la biblioteca de SharePoint con OneDrive
// (o "Agregar acceso directo a Mis archivos") y elige el .xlsx local una sola vez. Guardamos el
// FileSystemFileHandle en IndexedDB (no es serializable a localStorage) y, en cada recarga, lo
// volvemos a leer — siempre trae la última versión que OneDrive haya sincronizado.
// Solo Chrome/Edge de escritorio implementan la File System Access API.

const DB_NAME = 'unitask-agenda';
const STORE = 'handles';
const KEY = 'linked-excel';

// Tipos mínimos: lib.dom de TS no incluye showOpenFilePicker ni queryPermission/requestPermission.
type PermissionMode = { mode: 'read' };
interface LinkedHandle extends FileSystemFileHandle {
    queryPermission?: (d: PermissionMode) => Promise<PermissionState>;
    requestPermission?: (d: PermissionMode) => Promise<PermissionState>;
}

export function isLinkedFileSupported(): boolean {
    return typeof window !== 'undefined' && 'showOpenFilePicker' in window && 'indexedDB' in window;
}

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function idb<T>(mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest): Promise<T> {
    const db = await openDb();
    try {
        return await new Promise<T>((resolve, reject) => {
            const req = op(db.transaction(STORE, mode).objectStore(STORE));
            req.onsuccess = () => resolve(req.result as T);
            req.onerror = () => reject(req.error);
        });
    } finally {
        db.close();
    }
}

export async function getLinkedHandle(): Promise<LinkedHandle | null> {
    if (!isLinkedFileSupported()) return null;
    try {
        return (await idb<LinkedHandle | undefined>('readonly', s => s.get(KEY))) ?? null;
    } catch (err) {
        console.warn('[agenda-linked-file] no se pudo leer el handle de IndexedDB', err);
        return null;
    }
}

export async function unlinkFile(): Promise<void> {
    await idb('readwrite', s => s.delete(KEY));
}

/** Abre el selector, guarda el handle y devuelve el File. Devuelve null si el usuario cancela. */
export async function pickAndLinkFile(): Promise<File | null> {
    let handle: LinkedHandle;
    try {
        [handle] = await (window as any).showOpenFilePicker({
            id: 'agenda-excel',
            multiple: false,
            types: [{
                description: 'Excel de agenda',
                accept: {
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                    'application/vnd.ms-excel': ['.xls'],
                    'application/vnd.ms-excel.sheet.binary.macroEnabled.12': ['.xlsb'],
                },
            }],
        });
    } catch (err: any) {
        if (err?.name === 'AbortError') return null; // usuario canceló
        throw err;
    }
    await idb('readwrite', s => s.put(handle, KEY));
    return handle.getFile();
}

/**
 * Relee el Excel vinculado. Debe llamarse desde un click (requestPermission exige gesto de usuario).
 * Lanza errores con mensaje accionable (causa + solución) para mostrarlos tal cual en un toast.
 */
export async function readLinkedFile(handle: LinkedHandle): Promise<File> {
    const perm = { mode: 'read' } as const;
    let state = (await handle.queryPermission?.(perm)) ?? 'granted';
    if (state !== 'granted') state = (await handle.requestPermission?.(perm)) ?? 'denied';
    if (state !== 'granted') {
        throw new Error('El navegador no ha concedido permiso de lectura sobre el Excel vinculado. Pulsa de nuevo "Recargar" y acepta el aviso "Permitir", o vuelve a vincular el archivo.');
    }
    try {
        return await handle.getFile();
    } catch (err: any) {
        console.error('[agenda-linked-file] getFile falló', { name: err?.name, message: err?.message, file: handle.name });
        if (err?.name === 'NotFoundError') {
            throw new Error(`No se encuentra "${handle.name}" en la carpeta sincronizada (se ha movido, renombrado o se dejó de sincronizar). Vuelve a vincularlo desde "Importar" → "Vincular Excel sincronizado".`);
        }
        if (err?.name === 'NotReadableError') {
            throw new Error(`"${handle.name}" no se puede leer ahora mismo — normalmente OneDrive lo está sincronizando o es un archivo "solo en línea" sin conexión. Espera a que el icono de OneDrive muestre el check verde y reintenta; para evitarlo, marca la carpeta como "Mantener siempre en este dispositivo".`);
        }
        throw err;
    }
}
