import React, { useRef, useState } from 'react';
import {
  X,
  Upload,
  Link as LinkIcon,
  HardDrive,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { FormTemplate } from '../types';
import { renderPdfPages, generateSamplePdfDataUrl } from '../utils/pdfHelper';
import { fetchPdfFromUrl, extractGoogleDriveId } from '../utils/urlPdfLoader';

interface PdfLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateCreated: (template: FormTemplate) => void;
  initialMode?: 'link' | 'disk';
}

export const PdfLoadModal: React.FC<PdfLoadModalProps> = ({
  isOpen,
  onClose,
  onTemplateCreated,
  initialMode = 'link',
}) => {
  const [activeTab, setActiveTab] = useState<'link' | 'disk'>(initialMode);
  const [googleUrl, setGoogleUrl] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleCreateTemplateFromDataUrl = async (
    fileDataUrl: string,
    originalFileName: string,
    customName?: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      const pages = await renderPdfPages(fileDataUrl);
      if (pages.length === 0) {
        throw new Error('Nie znaleziono stron w wczytanym pliku PDF.');
      }

      const now = new Date().toISOString();
      const finalName =
        (customName || '').trim() ||
        (templateName || '').trim() ||
        originalFileName.replace(/\.[^/.]+$/, '');

      const newTemplate: FormTemplate = {
        id: 'tpl_' + Date.now(),
        name: finalName,
        fileName: originalFileName,
        pdfDataUrl: fileDataUrl,
        pageCount: pages.length,
        pageAspectRatios: pages.map((p) => p.aspectRatio),
        fields: [], // Start fresh so user can place fields
        createdAt: now,
        updatedAt: now,
      };

      onTemplateCreated(newTemplate);
      onClose();
    } catch (err: unknown) {
      console.error(err);
      setError('Wystąpił błąd podczas przetwarzania pliku PDF. Upewnij się, że plik nie jest uszkodzony.');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessDiskFile = (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Proszę wybrać poprawny plik w formacie .pdf');
      return;
    }

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      handleCreateTemplateFromDataUrl(dataUrl, file.name);
    };
    reader.onerror = () => {
      setLoading(false);
      setError('Nie udało się odczytać pliku z dysku.');
    };
    reader.readAsDataURL(file);
  };

  const handleProcessUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleUrl.trim()) {
      setError('Wklej link do pliku z Dysku Google lub adres URL dokumentu PDF.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { dataUrl, fileName } = await fetchPdfFromUrl(googleUrl.trim());
      await handleCreateTemplateFromDataUrl(dataUrl, fileName);
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Błąd podczas pobierania pliku z podanego linku.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isGoogleLink = extractGoogleDriveId(googleUrl) !== null;

  const handleUseSample = () => {
    setLoading(true);
    try {
      const { dataUrl, fields } = generateSamplePdfDataUrl();
      const now = new Date().toISOString();
      const sampleTemplate: FormTemplate = {
        id: 'sample_' + Date.now(),
        name: 'Protokół Techniczny (Wzorzec demonstracyjny)',
        fileName: 'protokol_demonstracyjny.pdf',
        pdfDataUrl: dataUrl,
        pageCount: 1,
        pageAspectRatios: [1.414],
        fields: fields,
        createdAt: now,
        updatedAt: now,
      };
      onTemplateCreated(sampleTemplate);
      onClose();
    } catch (e) {
      console.error(e);
      setError('Nie udało się wygenerować szablonu demonstracyjnego.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 text-sm">Wczytaj formularz PDF</h3>
              <p className="text-[11px] text-stone-500">
                Plik zostanie trwale zapisany w pamięci aplikacji
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 p-1.5 m-4 bg-stone-100 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('link');
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'link'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5 text-amber-600" />
            <span>Link z Dysku Google</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('disk');
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'disk'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5 text-amber-600" />
            <span>Wybierz plik z dysku</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 pb-6 space-y-4">
          {/* Optional template name */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Nazwa formularza (opcjonalnie)
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="np. Protokół odbioru, Karta serwisowa..."
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50/50"
            />
          </div>

          {/* TAB 1: GOOGLE DRIVE / LINK */}
          {activeTab === 'link' && (
            <form onSubmit={handleProcessUrl} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Link do pliku PDF (Dysk Google lub URL)
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={googleUrl}
                    onChange={(e) => {
                      setGoogleUrl(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50/50"
                  />
                  <LinkIcon className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                </div>
                {isGoogleLink && (
                  <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Rozpoznano poprawny identyfikator Dysku Google
                  </p>
                )}
              </div>

              {/* Google Drive Tip Box */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">Wskazówka dotycząca Dysku Google:</strong>
                  <p className="mt-0.5 text-stone-600 leading-relaxed">
                    Upewnij się, że plik na Twoim Dysku Google ma włączone udostępnianie:{' '}
                    <span className="font-medium text-amber-950">
                      Udostępnij &gt; Każda osoba mająca link (Przeglądający)
                    </span>
                    .
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !googleUrl.trim()}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Pobieranie i wczytywanie PDF...</span>
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Pobierz i zapisz formularz z linku</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: DISK FILE */}
          {activeTab === 'disk' && (
            <div className="space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleProcessDiskFile(file);
                }}
                accept="application/pdf,.pdf"
                className="hidden"
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleProcessDiskFile(file);
                }}
                onClick={() => !loading && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-amber-500 bg-amber-50/60 ring-4 ring-amber-100'
                    : 'border-stone-300 bg-stone-50/70 hover:border-amber-400 hover:bg-stone-50'
                }`}
              >
                {loading ? (
                  <div className="flex flex-col items-center justify-center space-y-2 py-4">
                    <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
                    <p className="text-xs font-medium text-stone-700">Wczytywanie i konwersja stron PDF...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                      <HardDrive className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-stone-800">
                        Kliknij, aby wybrać plik PDF lub upuść go tutaj
                      </p>
                      <p className="text-[11px] text-stone-500 mt-0.5">Obsługiwany format: dokumenty PDF (.pdf)</p>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-lg shadow-2xs">
                      <Upload className="w-3.5 h-3.5" />
                      Wybierz z tabletu / komputera
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Or sample template */}
          <div className="relative flex py-0.5 items-center">
            <div className="grow border-t border-stone-200"></div>
            <span className="shrink mx-3 text-[10px] text-stone-400 uppercase font-medium">albo</span>
            <div className="grow border-t border-stone-200"></div>
          </div>

          <button
            type="button"
            onClick={handleUseSample}
            disabled={loading}
            className="w-full p-2.5 border border-stone-200 bg-stone-50/60 hover:bg-amber-50/50 hover:border-amber-200 rounded-xl text-left flex items-center justify-between transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-800 group-hover:text-amber-900">
                  Wczytaj wzorzec demonstracyjny (Protokół)
                </p>
                <p className="text-[10px] text-stone-400">Gotowy szablon z polami i podpisem</p>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 bg-stone-50 border-t border-stone-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 transition-colors"
          >
            Anuluj
          </button>
        </div>
      </div>
    </div>
  );
};
