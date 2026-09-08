import React, { useState, useRef } from 'react';
import {
  Link2,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
  Upload,
  HardDrive,
} from 'lucide-react';
import {
  fetchPdfFromUrl,
  extractGoogleDriveId,
  readPdfFileFromDisk,
} from '../utils/urlPdfLoader';
import { renderPdfPages, RenderedPage } from '../utils/pdfHelper';

interface GooglePdfLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPdfLoaded: (dataUrl: string, fileName: string, pages: RenderedPage[]) => void;
}

export const GooglePdfLoadModal: React.FC<GooglePdfLoadModalProps> = ({
  isOpen,
  onClose,
  onPdfLoaded,
}) => {
  const [tab, setTab] = useState<'google' | 'disk'>('google');
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('Pobieranie pliku PDF...');
  const [error, setError] = useState<string | null>(null);

  const diskFileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      setError('Wprowadź link do pliku PDF');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStatus('Pobieranie pliku PDF przez bezpieczny kanał...');

    try {
      const { dataUrl, fileName } = await fetchPdfFromUrl(cleanUrl);
      setLoadingStatus('Renderowanie stron w rozdzielczości 1:1...');
      
      const pages = await renderPdfPages(dataUrl, 1400);
      if (pages.length === 0) {
        throw new Error('Plik PDF nie zawiera żadnych stron.');
      }

      onPdfLoaded(dataUrl, fileName, pages);
      onClose();
    } catch (err: unknown) {
      console.error(err);
      const isGoogle = Boolean(extractGoogleDriveId(cleanUrl));
      setError(
        isGoogle
          ? 'Google zablokowało bezpośredni dostęp. Upewnij się, że plik ma uprawnienie "Każda osoba mająca link może przeglądać". Jeśli problem się powtarza, pobierz plik z Google na dysk i użyj zakładki "Z dysku komputera".'
          : 'Nie udało się pobrać pliku z podanego linku. Sprawdź poprawność adresu lub załaduj plik z dysku komputera.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiskFile = async (file: File) => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    setLoadingStatus('Wczytywanie pliku PDF z dysku...');

    try {
      const { dataUrl, fileName } = await readPdfFileFromDisk(file);
      setLoadingStatus('Renderowanie stron w rozdzielczości 1:1...');

      const pages = await renderPdfPages(dataUrl, 1400);
      if (pages.length === 0) {
        throw new Error('Wybrany plik PDF jest pusty.');
      }

      onPdfLoaded(dataUrl, fileName, pages);
      onClose();
    } catch (err: unknown) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : 'Wystąpił błąd podczas odczytu pliku z dysku.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isLoading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleDiskFile(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-lg w-full p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
              {tab === 'google' ? <Link2 className="w-5 h-5" /> : <HardDrive className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                {tab === 'google' ? 'Wczytaj PDF z linku Google' : 'Wczytaj PDF z dysku komputera'}
              </h3>
              <p className="text-xs text-stone-500">
                Podkład zostanie załadowany w oryginalnej jakości 1:1
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-lg disabled:opacity-30 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-200 gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setTab('google');
              setError(null);
            }}
            disabled={isLoading}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              tab === 'google'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Link Google Drive / URL</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('disk');
              setError(null);
            }}
            disabled={isLoading}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              tab === 'disk'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Z dysku komputera</span>
          </button>
        </div>

        {/* Tab 1: Google Drive URL */}
        {tab === 'google' && (
          <form onSubmit={handleUrlSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Link do pliku PDF na Google Drive:
              </label>
              <input
                type="url"
                placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-stone-300 rounded-xl bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
              />
              <p className="text-[11px] text-stone-500 mt-1.5 leading-relaxed">
                Upewnij się, że plik na Google Drive ma ustawienie:{' '}
                <span className="font-semibold text-stone-700">"Każda osoba mająca link ma dostęp do przeglądania"</span>.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs text-rose-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTab('disk')}
                  className="font-bold text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Przejdź do wczytania bezpośrednio z dysku (100% niezawodne)</span>
                </button>
              </div>
            )}

            {isLoading && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center gap-3 text-xs text-blue-900">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
                <div className="space-y-0.5">
                  <p className="font-semibold">{loadingStatus}</p>
                  <p className="text-[11px] text-blue-700">Przygotowywanie widoku 1:1 dla ekranu tabletu</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={isLoading || !url.trim()}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Wczytywanie...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5" />
                    <span>Wczytaj PDF</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Local Disk File Upload */}
        {tab === 'disk' && (
          <div className="space-y-4">
            <input
              ref={diskFileInputRef}
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleDiskFile(file);
              }}
              className="hidden"
            />

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => diskFileInputRef.current?.click()}
              className="border-2 border-dashed border-stone-300 hover:border-blue-500 bg-stone-50 hover:bg-blue-50/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
            >
              <div className="p-3 bg-white rounded-2xl shadow-xs border border-stone-200 group-hover:scale-110 transition-transform mb-3 text-blue-600">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-stone-800">
                Kliknij, aby wybrać plik PDF z dysku
              </p>
              <p className="text-xs text-stone-500 mt-1">lub przeciągnij i upuść plik tutaj</p>
              <span className="inline-block mt-3 px-3 py-1 bg-stone-200 text-stone-700 rounded-full text-[11px] font-medium">
                Obsługiwany format: .pdf
              </span>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {isLoading && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center gap-3 text-xs text-blue-900">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
                <div className="space-y-0.5">
                  <p className="font-semibold">{loadingStatus}</p>
                  <p className="text-[11px] text-blue-700">Przetwarzanie dokumentu 1:1...</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              >
                Anuluj
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
