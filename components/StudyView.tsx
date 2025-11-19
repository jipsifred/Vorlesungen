import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { ArrowLeft, ChevronLeft, ChevronRight, BookOpen, AlertCircle } from 'lucide-react';
import { getDocumentById } from '../services/supabase'; // Changed to supabase
import { LectureDocument } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

// Import styles for react-pdf
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Setup PDF.js worker for Vite
// We use the local dependency to ensure stability on Vercel instead of relying on CDN
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();

// Helper to detect range of pages to render content
const getPageContent = (doc: LectureDocument, pageNum: number) => {
  return doc.jsonData.pages.find(p => p.page_number === pageNum);
};

export const StudyView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [doc, setDoc] = useState<LectureDocument | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfWidth, setPdfWidth] = useState<number>(600);
  const pdfWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const data = await getDocumentById(id);
      if (data) {
        setDoc(data);
      } else {
        navigate('/');
      }
    };
    load();
  }, [id, navigate]);

  useEffect(() => {
    // Resize observer to make PDF responsive to its container
    if (!pdfWrapperRef.current) return;
    
    const updateWidth = () => {
      if(pdfWrapperRef.current) {
        setPdfWidth(pdfWrapperRef.current.offsetWidth - 48); // Subtract padding
      }
    };

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(pdfWrapperRef.current);
    updateWidth();

    return () => resizeObserver.disconnect();
  }, [pdfWrapperRef.current]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const changePage = (offset: number) => {
    setPageNumber(prev => Math.min(Math.max(1, prev + offset), numPages || 1));
  };

  if (!doc) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-pulse flex flex-col items-center">
           <div className="h-10 w-10 bg-emerald-400 rounded-full mb-4 opacity-50"></div>
           <div className="text-slate-500 font-medium">Materialien werden geladen...</div>
        </div>
      </div>
    );
  }

  const currentContent = getPageContent(doc, pageNumber);

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">
      {/* Top Bar */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm shrink-0 z-10">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/')} 
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors group"
            title="Zurück zur Übersicht"
          >
            <ArrowLeft className="w-5 h-5 group-hover:text-slate-800" />
          </button>
          <h1 className="font-semibold text-slate-800 truncate max-w-md">{doc.title}</h1>
        </div>
        
        <div className="flex items-center space-x-4 bg-slate-50 rounded-lg p-1 border border-slate-200">
          <button 
            onClick={() => changePage(-1)} 
            disabled={pageNumber <= 1}
            className="p-1.5 rounded-md hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:shadow-none transition-all"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <span className="text-sm font-mono text-slate-600 min-w-[5rem] text-center">
             Seite {pageNumber} / {numPages || '--'}
          </span>
          <button 
            onClick={() => changePage(1)} 
            disabled={pageNumber >= (numPages || 1)}
            className="p-1.5 rounded-md hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:shadow-none transition-all"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </header>

      {/* Split Content */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left: PDF Viewer */}
        <div className="flex-1 bg-slate-200/50 overflow-y-auto p-6 flex justify-center" ref={pdfWrapperRef}>
           <div className="shadow-lg rounded-lg overflow-hidden bg-white min-h-[500px]">
             <Document
                file={doc.pdfUrl} // Updated property name from blob to url
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="h-[600px] w-[400px] bg-white flex items-center justify-center text-slate-400">
                    PDF wird geladen...
                  </div>
                }
                error={
                   <div className="p-10 flex flex-col items-center justify-center h-[400px] w-full bg-white text-slate-500">
                      <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
                      <p>PDF konnte nicht geladen werden.</p>
                   </div>
                }
             >
                <Page 
                  pageNumber={pageNumber} 
                  width={pdfWidth} 
                  className="pdf-page"
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
             </Document>
           </div>
        </div>

        {/* Right: Content Panel */}
        <div className="flex-1 bg-white border-l border-slate-200 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-8 md:p-10">
            {currentContent ? (
              <div className="animate-fadeIn">
                <div className="flex items-center mb-6 space-x-2">
                   <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                     Seite {currentContent.page_number}
                   </span>
                   {currentContent.topic_summary && (
                     <span className="text-slate-400 text-sm border-l border-slate-200 pl-3 line-clamp-1">
                       {currentContent.topic_summary}
                     </span>
                   )}
                </div>
                <MarkdownRenderer content={currentContent.content} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-300 py-20 select-none">
                <BookOpen className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">Keine Notizen verfügbar</p>
                <p className="text-sm mt-2 text-center max-w-xs">Für diese Seite wurden keine zusätzlichen Erklärungen in der JSON-Datei hinterlegt.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};