import { createClient } from '@supabase/supabase-js';
import { Folder, LectureDocument, LectureMetadata } from '../types';

const SUPABASE_URL = 'https://ajcidgcuwcoefkzdpjod.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY2lkZ2N1d2NvZWZremRwam9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NDk1MzMsImV4cCI6MjA3OTEyNTUzM30.TK3AxI5YDIHFMdbGGTUSYigax4UoQcZMjJBuTGpojoU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Folder Operations ---

export const saveFolder = async (folder: Folder): Promise<void> => {
  const { error } = await supabase
    .from('folders')
    .upsert({
      id: folder.id,
      title: folder.title,
      description: folder.description,
      created_at: folder.createdAt // Mapping camelCase to snake_case usually done in DB setup or manually here
    });

  if (error) throw error;
};

export const getAllFolders = async (): Promise<Folder[]> => {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    createdAt: row.created_at
  }));
};

export const getFolderById = async (id: string): Promise<Folder | undefined> => {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return undefined;

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    createdAt: data.created_at
  };
};

export const deleteFolder = async (id: string): Promise<void> => {
  // Note: Cascading delete should ideally be set up in Supabase SQL (Foreign Keys),
  // otherwise we might leave orphaned documents if not handled here.
  // For simplicity, we delete the folder. 
  // Ideally: fetch docs -> delete storage files -> delete docs -> delete folder.
  
  // 1. Fetch all docs to find PDFs to delete
  const { data: docs } = await supabase.from('documents').select('pdf_url').eq('folder_id', id);
  
  if (docs && docs.length > 0) {
      // Extract paths from URLs to delete from storage
      // URL format: .../storage/v1/object/public/course-pdfs/folderId/docId.pdf
      const pathsToRemove = docs.map(d => {
          const url = d.pdf_url;
          const parts = url.split('/course-pdfs/');
          return parts.length > 1 ? parts[1] : null;
      }).filter(p => p !== null) as string[];
      
      if (pathsToRemove.length > 0) {
         await supabase.storage.from('course-pdfs').remove(pathsToRemove);
      }
  }

  // 2. Delete documents (Supabase FK cascade usually handles this, but we do it explicitly to be safe)
  await supabase.from('documents').delete().eq('folder_id', id);

  // 3. Delete folder
  const { error } = await supabase.from('folders').delete().eq('id', id);
  if (error) throw error;
};

// --- Document Operations ---

export const saveDocument = async (doc: Omit<LectureDocument, 'pdfUrl'>, pdfFile: File): Promise<void> => {
  // 1. Upload PDF to Storage
  const filePath = `${doc.folderId}/${doc.id}.pdf`;
  
  const { error: uploadError } = await supabase.storage
    .from('course-pdfs')
    .upload(filePath, pdfFile, {
        cacheControl: '3600',
        upsert: true
    });

  if (uploadError) throw uploadError;

  // 2. Get Public URL
  const { data: { publicUrl } } = supabase.storage
    .from('course-pdfs')
    .getPublicUrl(filePath);

  // 3. Save Metadata to DB
  const { error: dbError } = await supabase
    .from('documents')
    .insert({
      id: doc.id,
      folder_id: doc.folderId,
      title: doc.title,
      created_at: doc.createdAt,
      json_data: doc.jsonData, // Supabase handles JSON automatically if column is JSONB
      pdf_url: publicUrl
    });

  if (dbError) throw dbError;
};

export const getDocumentsByFolder = async (folderId: string): Promise<LectureMetadata[]> => {
  const { data, error } = await supabase
    .from('documents')
    .select('id, folder_id, title, created_at')
    .eq('folder_id', folderId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    folderId: row.folder_id,
    title: row.title,
    createdAt: row.created_at
  }));
};

export const getDocumentById = async (id: string): Promise<LectureDocument | undefined> => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return undefined;

  return {
    id: data.id,
    folderId: data.folder_id,
    title: data.title,
    createdAt: data.created_at,
    pdfUrl: data.pdf_url, // Mapped from DB column
    jsonData: data.json_data
  };
};

export const deleteDocument = async (id: string): Promise<void> => {
  // 1. Get info to delete file
  const doc = await getDocumentById(id);
  if (doc) {
      const parts = doc.pdfUrl.split('/course-pdfs/');
      if (parts.length > 1) {
          await supabase.storage.from('course-pdfs').remove([parts[1]]);
      }
  }

  // 2. Delete DB Record
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw error;
};
