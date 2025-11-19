import { Folder, LectureDocument, LectureMetadata } from '../types';

const DB_NAME = 'EcoStudyDB';
const DB_VERSION = 2; // Version bump für neue Struktur
const FOLDER_STORE = 'folders';
const DOCUMENT_STORE = 'documents';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Store für Kurse/Ordner
      if (!db.objectStoreNames.contains(FOLDER_STORE)) {
        db.createObjectStore(FOLDER_STORE, { keyPath: 'id' });
      }

      // Store für Vorlesungen/Dokumente
      if (!db.objectStoreNames.contains(DOCUMENT_STORE)) {
        const docStore = db.createObjectStore(DOCUMENT_STORE, { keyPath: 'id' });
        docStore.createIndex('folderId', 'folderId', { unique: false });
      }
    };
  });
};

// --- Folder Operations ---

export const saveFolder = async (folder: Folder): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FOLDER_STORE, 'readwrite');
    const store = transaction.objectStore(FOLDER_STORE);
    const request = store.put(folder);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAllFolders = async (): Promise<Folder[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FOLDER_STORE, 'readonly');
    const store = transaction.objectStore(FOLDER_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const folders = request.result as Folder[];
      resolve(folders.sort((a, b) => b.createdAt - a.createdAt));
    };
    request.onerror = () => reject(request.error);
  });
};

export const getFolderById = async (id: string): Promise<Folder | undefined> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FOLDER_STORE, 'readonly');
    const store = transaction.objectStore(FOLDER_STORE);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const deleteFolder = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FOLDER_STORE, DOCUMENT_STORE], 'readwrite');
    
    // 1. Delete folder
    const folderStore = transaction.objectStore(FOLDER_STORE);
    folderStore.delete(id);

    // 2. Delete all documents in that folder
    const docStore = transaction.objectStore(DOCUMENT_STORE);
    const index = docStore.index('folderId');
    const range = IDBKeyRange.only(id);
    
    // Cursor approach to delete related docs
    index.openCursor(range).onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

// --- Document Operations ---

export const saveDocument = async (doc: LectureDocument): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DOCUMENT_STORE, 'readwrite');
    const store = transaction.objectStore(DOCUMENT_STORE);
    const request = store.put(doc);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getDocumentsByFolder = async (folderId: string): Promise<LectureMetadata[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DOCUMENT_STORE, 'readonly');
    const store = transaction.objectStore(DOCUMENT_STORE);
    const index = store.index('folderId');
    const request = index.getAll(IDBKeyRange.only(folderId));

    request.onsuccess = () => {
      const docs = request.result as LectureDocument[];
      const metadata = docs.map(d => ({
        id: d.id,
        folderId: d.folderId,
        title: d.title,
        createdAt: d.createdAt
      })).sort((a, b) => b.createdAt - a.createdAt);
      resolve(metadata);
    };
    request.onerror = () => reject(request.error);
  });
};

export const getDocumentById = async (id: string): Promise<LectureDocument | undefined> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DOCUMENT_STORE, 'readonly');
    const store = transaction.objectStore(DOCUMENT_STORE);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const deleteDocument = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DOCUMENT_STORE, 'readwrite');
    const store = transaction.objectStore(DOCUMENT_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};