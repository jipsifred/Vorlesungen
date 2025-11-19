export interface PageContent {
  page_number: number;
  topic_summary: string;
  content: string;
}

export interface LectureJSON {
  lecture_title: string;
  pages: PageContent[];
}

export interface Folder {
  id: string;
  title: string;
  createdAt: number;
  description?: string;
}

export interface LectureDocument {
  id: string;
  folderId: string;
  title: string;
  createdAt: number;
  pdfUrl: string; // Changed from Blob to string (URL) for Supabase Storage
  jsonData: LectureJSON;
}

// Für Listenansichten
export interface LectureMetadata {
  id: string;
  folderId: string;
  title: string;
  createdAt: number;
}