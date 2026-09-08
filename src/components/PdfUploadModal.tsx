import React, { useRef, useState } from 'react';
import { X, Upload, FileText, Check, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { FormTemplate } from '../types';
import { renderPdfPages, generateSamplePdfDataUrl } from '../utils/pdfHelper';

interface PdfUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateCreated: (template: FormTemplate) => void;
}

export const PdfUploadModal: React.FC<PdfUploadModalProps> = ({
  isOpen,
  onClose,
  onTemplateCreated,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  if (!isOpen) return null;

  const processPdfFile = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Proszę wybrać poprawny plik w formacie .pdf');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Read as Data URL
      const reader = new FileReader();
      const fileDataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Render pages to verify and get dimensions
      const pages = await renderPdfPages(fileDataUrl);
      if (pages.length === 0) {
        throw new Error('Nie udało się odczytać stron z pliku PDF.');
      }

      const now = new Date().toISOString();
      const nameToUse = templateName.trim() || file.name.replace(/\.[^/.]+$/, '');

      const newTemplate: FormTemplate = {
        id: 'tpl_' + Date.now(),
        name: nameToUse,
        fileName: file.name,
        pdfDataUrl: fileDataUrl,
        pageCount: pages.length,
        pageAspectRatios: pages.map((p) => p.aspectRatio),
        fields: [], // Start with blank fields so user can mark their own fields!
        createdAt: now,
        updatedAt: now,
      };

      onTemplateCreated(newTemplate);
      onClose();
    } catch (err: unknown) {
      console.error('Error loading PDF:', err);
      setError(
        'Wystąpił błąd podczas wczytywania pliku PDF. Upewnij się, że plik nie jest uszkodzony ani zahasłowany.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processPdfFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processPdfFile(file);
    }
  };

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
    } catch (err) {
      console.error(err);
      setError('Nie udało się wygenerować szablonu demonstracyjnego.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-stone-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-stone-900">Wczytaj własny plik PDF</h3>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
              Nazwa szablonu (opcjonalnie)
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="np. Karta odbioru klimatyzacji, Protokół zdawczo-odbiorczy..."
              className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50/50"
            />
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !loading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-amber-500 bg-amber-50/60 ring-4 ring-amber-100'
                : 'border-stone-300 bg-stone-50/70 hover:border-amber-400 hover:bg-stone-50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="application/pdf,.pdf"
              className="hidden"
            />

            {loading ? (
              <div className="flex flex-col items-center justify-center space-y-3 py-4">
                <Loader2 className="w-9 h-9 text-amber-600 animate-spin" />
                <p className="text-sm font-medium text-stone-700">Wczytywanie i konwersja stron PDF...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <FileText className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-800">
                    Kliknij, aby wybrać plik PDF lub przeciągnij go tutaj
                  </p>
                  <p className="text-xs text-stone-500 mt-1">Obsługiwany format: dokumenty PDF (.pdf)</p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-lg shadow-2xs">
                  <Upload className="w-3.5 h-3.5" />
                  Wybierz z dysku / tabletu
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="relative flex py-1 items-center">
            <div className="grow border-t border-stone-200"></div>
            <span className="shrink mx-3 text-xs text-stone-400 uppercase font-medium">albo</span>
            <div className="grow border-t border-stone-200"></div>
          </div>

          <button
            type="button"
            onClick={handleUseSample}
            disabled={loading}
            className="w-full p-3.5 border border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 rounded-xl text-left flex items-center justify-between transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-900 group-hover:text-amber-900">
                  Wczytaj gotowy wzór demonstracyjny (Protokół)
                </p>
                <p className="text-[11px] text-stone-500">Zawiera tekst, checklistę, ramkę na foto i podpis</p>
              </div>
            </div>
            <Check className="w-4 h-4 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        <div className="flex items-center justify-end px-6 py-3.5 bg-stone-50 border-t border-stone-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 transition-colors"
          >
            Anuluj
          </button>
        </div>
      </div>
    </div>
  );
};
