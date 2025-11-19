import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Trash2, Folder, FolderOpen, Upload, ArrowLeft, GraduationCap } from 'lucide-react';
import { Button } from './Button';
import { 
  saveFolder, 
  getAllFolders, 
  deleteFolder, 
  saveDocument, 
  getDocumentsByFolder, 
  deleteDocument 
} from '../services/supabase'; // Changed import to supabase
import { Folder as FolderType, LectureMetadata, LectureJSON } from '../types';

export const Dashboard: React.FC = () => {
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [currentFolder, setCurrentFolder] = useState<FolderType | null>(null);
  const [documents, setDocuments] = useState<LectureMetadata[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create_folder' | 'create_document'>('create_folder');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    if (currentFolder) {
      loadDocuments(currentFolder.id);
    }
  }, [currentFolder]);

  const loadFolders = async () => {
    try {
      const data = await getAllFolders();
      setFolders(data);
    } catch (e) {
      console.error("Fehler beim Laden der Ordner", e);
    }
  };

  const loadDocuments = async (folderId: string) => {
    try {
      const data = await getDocumentsByFolder(folderId);
      setDocuments(data);
    } catch (e) {
      console.error("Fehler beim Laden der Dokumente", e);
    }
  };

  const handleDeleteFolder = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Möchtest du diesen Kurs und alle darin enthaltenen Vorlesungen wirklich löschen?")) {
      await deleteFolder(id);
      loadFolders();
    }
  };

  const handleDeleteDocument = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Möchtest du diese Vorlesung wirklich löschen?")) {
      await deleteDocument(id);
      if (currentFolder) loadDocuments(currentFolder.id);
    }
  };

  const openCreateFolderModal = () => {
    setModalMode('create_folder');
    resetForm();
    setIsModalOpen(true);
  };

  const openCreateDocumentModal = () => {
    setModalMode('create_document');
    resetForm();
    setIsModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title) {
      setError("Bitte gib einen Titel ein.");
      return;
    }

    setIsLoading(true);

    try {
      if (modalMode === 'create_folder') {
        const newFolder: FolderType = {
          id: crypto.randomUUID(),
          title,
          description,
          createdAt: Date.now()
        };
        await saveFolder(newFolder);
        loadFolders();
      } else {
        // Document Creation
        if (!pdfFile || !jsonInput || !currentFolder) {
          setError("Bitte lade ein PDF hoch und gib die JSON-Daten ein.");
          setIsLoading(false);
          return;
        }

        let parsedJson: LectureJSON;
        try {
          parsedJson = JSON.parse(jsonInput);
          if (!parsedJson.pages || !Array.isArray(parsedJson.pages)) {
             throw new Error("JSON muss ein 'pages'-Array enthalten.");
          }
        } catch (jsonErr) {
          throw new Error("Ungültiges JSON-Format. Bitte Syntax prüfen.");
        }

        const newDocId = crypto.randomUUID();

        const newDocMetadata = {
          id: newDocId,
          folderId: currentFolder.id,
          title,
          createdAt: Date.now(),
          jsonData: parsedJson
        };

        // Pass file separately to service to handle storage upload
        await saveDocument(newDocMetadata, pdfFile);
        loadDocuments(currentFolder.id);
      }

      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || "Ein Fehler ist aufgetreten.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPdfFile(null);
    setJsonInput('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Area */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <div className="flex items-center space-x-2 text-sm text-slate-400 mb-1">
               <span 
                 className={`cursor-pointer hover:text-emerald-600 transition-colors ${!currentFolder ? 'font-semibold text-emerald-600' : ''}`}
                 onClick={() => setCurrentFolder(null)}
               >
                 Meine Vorlesungen
               </span>
               {currentFolder && (
                 <>
                   <span>/</span>
                   <span className="font-semibold text-emerald-600">{currentFolder.title}</span>
                 </>
               )}
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center">
              {currentFolder ? (
                 <>
                   <button onClick={() => setCurrentFolder(null)} className="mr-3 md:hidden text-slate-400">
                     <ArrowLeft />
                   </button>
                   {currentFolder.title}
                 </>
              ) : "Meine Vorlesungen"}
            </h1>
            <p className="text-slate-500 mt-1">
              {currentFolder ? "Vorlesungsmaterialien verwalten" : "Organisiere deine Kurse und Lernmaterialien."}
            </p>
          </div>
          
          <Button onClick={currentFolder ? openCreateDocumentModal : openCreateFolderModal}>
            <Plus className="w-5 h-5 mr-2" />
            {currentFolder ? "Vorlesung hinzufügen" : "Neuer Kurs"}
          </Button>
        </header>

        {/* Content Area */}
        {!currentFolder ? (
          // FOLDERS VIEW
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {folders.length === 0 ? (
              <div className="col-span-full text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
                <div className="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <GraduationCap className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">Willkommen</h3>
                <p className="text-slate-500 max-w-md mx-auto mb-8">
                  Erstelle deinen ersten Kurs (z.B. "Mathematik I"), um zu starten.
                </p>
                <Button onClick={openCreateFolderModal}>Ersten Kurs erstellen</Button>
              </div>
            ) : (
              folders.map((folder) => (
                <div 
                  key={folder.id}
                  onClick={() => setCurrentFolder(folder)}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer group relative overflow-hidden flex flex-col h-48"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-emerald-50 p-3 rounded-xl group-hover:bg-emerald-100 transition-colors">
                      <Folder className="w-6 h-6 text-emerald-600" />
                    </div>
                    <button 
                      onClick={(e) => handleDeleteFolder(e, folder.id)}
                      className="text-slate-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2 line-clamp-1">{folder.title}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2 flex-grow">
                    {folder.description || "Keine Beschreibung"}
                  </p>
                  <div className="text-xs text-slate-400 pt-4 mt-auto border-t border-slate-50 flex items-center">
                    <span>Erstellt am {new Date(folder.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          // DOCUMENTS VIEW
          <div className="space-y-4">
            {documents.length === 0 ? (
               <div className="text-center py-16 bg-white/50 rounded-2xl border-2 border-dashed border-slate-200">
                  <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <FolderOpen className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-700 mb-1">Dieser Kurs ist leer</h3>
                  <p className="text-slate-400 mb-6">Füge Vorlesungsunterlagen hinzu.</p>
                  <Button variant="secondary" onClick={openCreateDocumentModal}>
                     <Upload className="w-4 h-4 mr-2" />
                     Jetzt hochladen
                  </Button>
               </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                 {documents.map((doc) => (
                   <div 
                     key={doc.id}
                     onClick={() => navigate(`/study/${doc.id}`)}
                     className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer flex items-center group"
                   >
                      <div className="bg-slate-50 p-3 rounded-lg mr-5 text-slate-500 group-hover:text-emerald-600 group-hover:bg-emerald-50 transition-colors">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex-grow">
                         <h4 className="font-semibold text-slate-800 text-lg">{doc.title}</h4>
                         <p className="text-xs text-slate-400 mt-1">Hinzugefügt am {new Date(doc.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center">
                        <button 
                          onClick={(e) => handleDeleteDocument(e, doc.id)}
                          className="text-slate-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                          title="Löschen"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <div className="ml-2 text-slate-300 group-hover:text-emerald-500">
                           <ArrowLeft className="w-5 h-5 rotate-180" />
                        </div>
                      </div>
                   </div>
                 ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-800">
                {modalMode === 'create_folder' ? "Neuen Kurs erstellen" : "Vorlesung hinzufügen"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2">
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {modalMode === 'create_folder' ? "Kursname" : "Titel der Vorlesung"}
                </label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-slate-50 focus:bg-white"
                  placeholder={modalMode === 'create_folder' ? "z.B. Theoretische Informatik" : "z.B. Kapitel 1: Einführung"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              {modalMode === 'create_folder' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Beschreibung (Optional)</label>
                  <textarea 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-slate-50 focus:bg-white"
                    rows={3}
                    placeholder="Kurze Beschreibung des Moduls..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  ></textarea>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">PDF Datei</label>
                    <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center hover:border-emerald-400 hover:bg-emerald-50/30 transition-all group cursor-pointer">
                      <input 
                        type="file" 
                        accept="application/pdf"
                        onChange={(e) => setPdfFile(e.target.files ? e.target.files[0] : null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className={`p-3 rounded-full mb-3 ${pdfFile ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400 group-hover:text-emerald-500'}`}>
                        {pdfFile ? <FileText className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                      </div>
                      <p className="text-sm font-medium text-slate-700">
                        {pdfFile ? pdfFile.name : "PDF hier ablegen oder klicken"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">{pdfFile ? `${(pdfFile.size / 1024 / 1024).toFixed(2)} MB` : "Max. 50MB"}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Erklärungen (JSON)
                      <span className="ml-2 text-xs text-slate-400 font-normal bg-slate-100 px-2 py-0.5 rounded">Format: {"{ pages: [...] }"}</span>
                    </label>
                    <textarea 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-mono text-xs text-slate-600 bg-slate-50 focus:bg-white"
                      rows={8}
                      placeholder='{ "lecture_title": "...", "pages": [{ "page_number": 1, "content": "..." }] }'
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                    ></textarea>
                  </div>
                </>
              )}

              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 flex items-start">
                  <span className="font-bold mr-2">!</span> {error}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-50">
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Abbrechen</Button>
                <Button type="submit" isLoading={isLoading}>
                  {modalMode === 'create_folder' ? "Kurs erstellen" : "Speichern"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};