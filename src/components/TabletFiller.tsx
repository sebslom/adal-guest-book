import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  RotateCcw,
  Check,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Lock,
  PenTool,
  Upload,
  Camera,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FormField, FormTemplate, FilledValues, SavedSubmission } from '../types';
import { RenderedPage, generateFilledPdf } from '../utils/pdfHelper';
import { generateAdalGuestBookPdf } from '../utils/adalPdfExporter';
import { EmailSenderModal } from './EmailSenderModal';
import { ResetConfirmModal } from './ResetConfirmModal';
import { SignatureModal } from './SignatureModal';
import { AdalFormBackground } from './AdalFormBackground';
import { idbSaveSubmission, idbGetSubmissions } from '../utils/idbStorage';

interface TabletFillerProps {
  template: FormTemplate;
  renderedPages?: RenderedPage[];
  onSwitchToDesigner: () => void;
}

export const TabletFiller: React.FC<TabletFillerProps> = ({
  template,
  renderedPages = [],
  onSwitchToDesigner,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [values, setValues] = useState<FilledValues>(() => {
    const initial: FilledValues = {};
    template.fields.forEach((f) => {
      if (f.type === 'checkbox' || f.type === 'radio') {
        initial[f.id] = false;
      } else if (f.type === 'image' || f.type === 'signature') {
        initial[f.id] = undefined;
      } else {
        initial[f.id] = '';
      }
    });
    return initial;
  });

  // 5-Click Lock state
  const [lockClickCount, setLockClickCount] = useState<number>(0);
  const lockTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Main page UI language (PL / ENG)
  const [lang, setLang] = useState<'PL' | 'ENG'>(() => {
    try {
      const stored = localStorage.getItem('adal_ui_lang');
      if (stored === 'ENG' || stored === 'PL') return stored;
    } catch {
      // ignore
    }
    return 'PL';
  });

  const handleToggleLang = (newLang: 'PL' | 'ENG') => {
    setLang(newLang);
    try {
      localStorage.setItem('adal_ui_lang', newLang);
    } catch {
      // ignore
    }
  };

  const isEng = lang === 'ENG';

  // Modals state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isSketchModalOpen, setIsSketchModalOpen] = useState(false);
  const [activeSignatureField, setActiveSignatureField] = useState<FormField | null>(null);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // File input ref for camera/photos
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [currentImageFieldId, setCurrentImageFieldId] = useState<string | null>(null);

  const currentPageData = renderedPages.find((p) => p.pageNumber === currentPage) || renderedPages[0];
  const pageFields = template.fields.filter((f) => f.page === currentPage);
  const totalPages = Math.max(
    template.pageCount || 1,
    renderedPages.length || 1,
    ...template.fields.map((f) => f.page || 1),
    2
  );

  // Handle 5 clicks on the lock in the top right corner - resets after 5 clicks and after timeout
  const handleLockClick = () => {
    setLockClickCount((prev) => {
      const next = prev + 1;
      if (lockTimerRef.current) {
        clearTimeout(lockTimerRef.current);
      }

      if (next >= 5) {
        // Trigger designer / editor password authentication
        onSwitchToDesigner();
        // Resets after 5 clicks so next time user must click 5 times again
        return 0;
      } else {
        lockTimerRef.current = setTimeout(() => {
          setLockClickCount(0);
        }, 3000);
        return next;
      }
    });
  };

  const handleTextChange = (fieldId: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleCheckboxToggle = (fieldId: string) => {
    setValues((prev) => {
      const current = Boolean(prev[fieldId]);
      return { ...prev, [fieldId]: !current };
    });
  };

  const handleRadioSelect = (field: FormField) => {
    setValues((prev) => {
      const next = { ...prev };
      if (field.groupName) {
        template.fields
          .filter((f) => f.type === 'radio' && f.groupName === field.groupName)
          .forEach((f) => {
            next[f.id] = false;
          });
        next[field.id] = true;
      } else {
        next[field.id] = !Boolean(prev[field.id]);
      }
      return next;
    });
  };

  const handleImageClick = (fieldId: string) => {
    setCurrentImageFieldId(fieldId);
    imageInputRef.current?.click();
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentImageFieldId) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setValues((prev) => ({ ...prev, [currentImageFieldId]: dataUrl }));
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleRemoveImage = (fieldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setValues((prev) => ({ ...prev, [fieldId]: undefined }));
  };

  // Reset all values for the next guest
  const handleConfirmReset = () => {
    const blank: FilledValues = {};
    template.fields.forEach((f) => {
      if (f.type === 'checkbox' || f.type === 'radio') blank[f.id] = false;
      else if (f.type === 'image' || f.type === 'signature') blank[f.id] = undefined;
      else blank[f.id] = '';
    });
    setValues(blank);
    setSaveSuccessMessage('Formularz został wyczyszczony. Karta gościa jest całkowicie pusta.');
    setTimeout(() => setSaveSuccessMessage(null), 3500);
  };

  // Save to Disk as 2-page PDF (1:1 identical to original - quick download)
  const handleSaveToDisk = async () => {
    setIsGeneratingPdf(true);
    try {
      const dateStr = (values['p1_date'] || new Date().toISOString().slice(0, 10))
        .toString()
        .replace(/[^0-9-.]/g, '');
      const companyRaw = (values['p1_company_name'] || values['field_client_info'] || 'Gosc')
        .toString()
        .trim();
      const companyClean = companyRaw.replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ_-]/g, '_').slice(0, 25);
      const safeName = template.fileName ? template.fileName.replace(/\.pdf$/i, '') : 'Adal_GuestBook_2026';
      const fileName = `${safeName}_${companyClean || 'Firma'}_${dateStr}.pdf`;

      if (renderedPages && renderedPages.length > 0) {
        // 1:1 original PDF reproduction with user fields
        const result = await generateFilledPdf(renderedPages, template.fields, values);
        const a = document.createElement('a');
        a.href = result.dataUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        const { doc } = await generateAdalGuestBookPdf(values, template.fields);
        doc.save(fileName);
      }

      // Save submission record in IndexedDB
      const now = new Date();
      const submission: SavedSubmission = {
        id: 'sub_' + Date.now(),
        templateId: template.id,
        templateName: template.name,
        fileName,
        pdfBlobUrl: '',
        values: values,
        submittedAt: now.toISOString(),
      };
      await idbSaveSubmission(submission);

      confetti({
        particleCount: 65,
        spread: 60,
        origin: { y: 0.7 },
      });

      setSaveSuccessMessage(
        isEng
          ? `Successfully saved "${fileName}" to disk!`
          : `Pomyślnie zapisano plik "${fileName}" na dysku!`
      );
      setTimeout(() => setSaveSuccessMessage(null), 5000);
    } catch (err) {
      console.error(err);
      alert(isEng ? 'An error occurred while generating the PDF file.' : 'Wystąpił błąd podczas generowania pliku PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-200 overflow-hidden select-none">
      {/* Hidden file input for photos */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileChange}
        className="hidden"
      />

      {/* Single Minimalist Action Bar */}
      <header className="bg-white border-b border-stone-200 px-3 sm:px-5 py-2 flex items-center justify-between gap-3 z-30 shadow-xs">
        {/* Left: Core Form Actions (Od nowa formularz, Zapisz na dysku) */}
        <div className="flex items-center flex-wrap gap-2">
          {/* OD NOWA FORMULARZ */}
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 active:scale-95 rounded-xl transition-all shadow-2xs cursor-pointer"
            title={isEng ? 'Clear all fields and start fresh' : 'Wyczyść wszystkie pola i rozpocznij nowy wpis'}
          >
            <RotateCcw className="w-4 h-4 text-stone-600 shrink-0" />
            <span>{isEng ? 'Reset form' : 'Od nowa formularz'}</span>
          </button>

          {/* ZAPISZ NA DYSKU */}
          <button
            type="button"
            onClick={handleSaveToDisk}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            title={isEng ? 'Save filled form to disk as PDF' : 'Zapisz wypełniony formularz na dysku jako plik PDF'}
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>
              {isGeneratingPdf
                ? (isEng ? 'Saving...' : 'Zapisywanie...')
                : (isEng ? 'Save to disk' : 'Zapisz na dysku')}
            </span>
          </button>

          {/* Separator */}
          <div className="hidden sm:block h-5 w-px bg-stone-200 mx-1" />

          {/* Page Switcher: [<] Strona X na Y [>] */}
          <div className="flex items-center bg-stone-100 p-0.5 rounded-xl border border-stone-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200/80 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              title={isEng ? 'Previous page' : 'Poprzednia strona'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 py-1 text-xs font-bold text-stone-800 select-none whitespace-nowrap min-w-[95px] text-center">
              {isEng ? `Page ${currentPage} of ${totalPages}` : `Strona ${currentPage} na ${totalPages}`}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200/80 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              title={isEng ? 'Next page' : 'Następna strona'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="hidden md:flex items-center bg-stone-100 px-1.5 py-0.5 rounded-xl border border-stone-200 gap-1 text-xs">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(60, z - 15))}
              className="p-1 text-stone-600 hover:bg-stone-200 rounded-md cursor-pointer"
              title={isEng ? 'Zoom out' : 'Pomniejsz'}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-stone-600 text-[11px] w-10 text-center">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(160, z + 15))}
              className="p-1 text-stone-600 hover:bg-stone-200 rounded-md cursor-pointer"
              title={isEng ? 'Zoom in' : 'Powiększ'}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ENG / PL Language Toggle */}
          <div className="flex items-center bg-stone-100 p-0.5 rounded-xl border border-stone-200">
            <button
              type="button"
              onClick={() => handleToggleLang('PL')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                lang === 'PL'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
              title="Przełącz na język polski"
            >
              PL
            </button>
            <button
              type="button"
              onClick={() => handleToggleLang('ENG')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                lang === 'ENG'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
              title="Switch to English"
            >
              ENG
            </button>
          </div>
        </div>

        {/* Right: ONLY the padlock icon (completely inert, silent 5-click trigger) */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={handleLockClick}
            className="p-2 text-stone-400 select-none cursor-default focus:outline-none transition-none"
            aria-label={isEng ? 'Lock' : 'Kłódka'}
            tabIndex={-1}
          >
            <Lock className="w-5 h-5 stroke-[1.8]" />
          </button>
        </div>
      </header>

      {/* Success Notification Banner */}
      {saveSuccessMessage && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold text-center shadow-md animate-in fade-in flex items-center justify-center gap-2 z-30">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* Main Form Sheet Viewport */}
      <main className="flex-1 overflow-auto p-3 sm:p-6 flex justify-center items-start">
        <div
          style={{ width: `${(820 * zoomLevel) / 100}px` }}
          className="transition-all duration-75 relative bg-white shadow-2xl rounded-sm border border-stone-300"
        >
          <div
            className="relative w-full"
            style={{
              paddingTop: `${(currentPageData?.aspectRatio || 1.414) * 100}%`,
            }}
          >
            {/* Real PDF page background 1:1 if rendered, or Adal vector background */}
            {currentPageData?.dataUrl ? (
              <img
                src={currentPageData.dataUrl}
                alt={`Strona ${currentPage}`}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="absolute inset-0 w-full h-full pointer-events-none select-none">
                <AdalFormBackground page={currentPage} />
              </div>
            )}

            {/* Overlaid Form Fields */}
            {pageFields.map((field) => {
              const val = values[field.id];

              return (
                <div
                  key={field.id}
                  style={{
                    left: `${field.x}%`,
                    top: `${field.y}%`,
                    width: `${field.width}%`,
                    height: `${field.height}%`,
                  }}
                  className="absolute z-20 group"
                >
                  {/* 1. CHECKBOX FIELD */}
                  {field.type === 'checkbox' && (
                    <button
                      type="button"
                      onClick={() => handleCheckboxToggle(field.id)}
                      className={`w-full h-full flex items-center justify-center rounded-xs transition-all focus:outline-none cursor-pointer ${
                        Boolean(val)
                          ? 'bg-amber-600/15 border-2 border-amber-600 text-stone-900 font-black'
                          : 'border border-stone-400/50 hover:border-amber-500 hover:bg-amber-50/40'
                      }`}
                      title={field.label}
                    >
                      {Boolean(val) ? (
                        <Check className="w-[85%] h-[85%] stroke-[3.5] text-stone-900" />
                      ) : null}
                    </button>
                  )}

                  {/* 2. RADIO BUTTON FIELD */}
                  {field.type === 'radio' && (
                    <button
                      type="button"
                      onClick={() => handleRadioSelect(field)}
                      className={`w-full h-full flex items-center justify-center rounded-full transition-all focus:outline-none cursor-pointer ${
                        Boolean(val)
                          ? 'bg-amber-600/20 border-2 border-amber-600 text-stone-900'
                          : 'border border-stone-400/50 hover:border-amber-500 hover:bg-amber-50/40'
                      }`}
                      title={field.label}
                    >
                      {Boolean(val) ? (
                        <div className="w-2.5 h-2.5 bg-amber-600 rounded-full" />
                      ) : null}
                    </button>
                  )}

                  {/* 3. SINGLE LINE TEXT FIELD */}
                  {field.type === 'text' && (
                    <input
                      type="text"
                      value={typeof val === 'string' ? val : ''}
                      onChange={(e) => handleTextChange(field.id, e.target.value)}
                      placeholder={field.placeholder || ''}
                      style={{
                        fontSize: field.fontSize ? `${field.fontSize}px` : undefined,
                        textAlign: field.align || 'left',
                      }}
                      className="w-full h-full px-1.5 py-0.5 text-xs sm:text-sm font-medium text-stone-900 bg-white hover:bg-white focus:bg-white focus:outline-none border border-stone-300/80 focus:border-amber-500 rounded-xs transition-colors shadow-2xs"
                    />
                  )}

                  {/* 4. DATE FIELD */}
                  {field.type === 'date' && (
                    <input
                      type="text"
                      value={typeof val === 'string' ? val : ''}
                      onChange={(e) => handleTextChange(field.id, e.target.value)}
                      placeholder="DD.MM.YYYY"
                      style={{
                        fontSize: field.fontSize ? `${field.fontSize}px` : undefined,
                        textAlign: field.align || 'center',
                      }}
                      className="w-full h-full px-1.5 py-0.5 text-xs sm:text-sm font-medium text-stone-900 bg-white hover:bg-white focus:bg-white focus:outline-none border border-stone-300/80 focus:border-amber-500 rounded-xs transition-colors shadow-2xs"
                    />
                  )}

                  {/* 5. MULTI-LINE NOTES / TEXTAREA */}
                  {field.type === 'textarea' && (
                    <textarea
                      value={typeof val === 'string' ? val : ''}
                      onChange={(e) => handleTextChange(field.id, e.target.value)}
                      placeholder={field.placeholder || (isEng ? 'Enter notes or client requirements...' : 'Wpisz notatki lub ustalenia z klientem...')}
                      rows={6}
                      style={{
                        fontSize: field.fontSize ? `${field.fontSize}px` : undefined,
                        lineHeight: field.lineHeight ? `${field.lineHeight}` : '1.35',
                        textAlign: field.align || 'left',
                      }}
                      className="w-full h-full p-2 text-xs sm:text-sm font-medium text-stone-900 bg-white hover:bg-white focus:bg-white focus:outline-none rounded-xs border border-stone-300/80 focus:border-amber-500 resize-none transition-all shadow-2xs"
                    />
                  )}

                  {/* 6. SKETCH / IMAGE / PROJECT BOX FIELD */}
                  {(field.type === 'image' || field.type === 'signature') && (
                    <div className="w-full h-full relative rounded-xs border border-stone-300 hover:border-amber-500 bg-white transition-all flex flex-col items-center justify-center p-1 shadow-2xs">
                      {val && typeof val === 'string' && val.startsWith('data:image') ? (
                        <div className="relative w-full h-full flex items-center justify-center bg-white">
                          <img
                            src={val}
                            alt={field.label}
                            className="max-w-full max-h-full object-contain pointer-events-none bg-white"
                          />
                          <button
                            type="button"
                            onClick={(e) => handleRemoveImage(field.id, e)}
                            className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow-md cursor-pointer"
                            title={isEng ? 'Remove sketch' : 'Usuń szkic'}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1 text-stone-500 text-center">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveSignatureField(field);
                                setIsSketchModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-stone-300 rounded-lg shadow-2xs hover:bg-amber-50 text-stone-700 flex items-center gap-1 cursor-pointer"
                              title={isEng ? 'Draw by hand on tablet' : 'Rysuj odręcznie na tablecie'}
                            >
                              <PenTool className="w-3 h-3 text-amber-600" />
                              <span>{isEng ? 'Draw sketch' : 'Rysuj szkic'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleImageClick(field.id)}
                              className="px-2 py-1 text-[11px] font-semibold bg-white border border-stone-300 rounded-lg shadow-2xs hover:bg-amber-50 text-stone-700 flex items-center gap-1 cursor-pointer"
                              title={isEng ? 'Upload photo or drawing' : 'Wgraj zdjęcie lub rysunek'}
                            >
                              <Upload className="w-3 h-3 text-stone-600" />
                              <span>{isEng ? 'Upload' : 'Wgraj'}</span>
                            </button>
                          </div>
                          <span className="text-[10px] text-stone-400">
                            {field.label}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Email Sender Modal with Recipient List */}
      <EmailSenderModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        values={values}
        fields={template.fields}
        renderedPages={renderedPages}
        lang={lang}
      />

      {/* Reset Confirmation Modal */}
      <ResetConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleConfirmReset}
        lang={lang}
      />

      {/* Sketch / Drawing Canvas Modal */}
      <SignatureModal
        isOpen={isSketchModalOpen}
        onClose={() => {
          setIsSketchModalOpen(false);
          setActiveSignatureField(null);
        }}
        title={isEng ? 'Project Sketch / Handwritten Notes' : 'Szkic projektu / Notatki odręczne'}
        lang={lang}
        initialValue={
          activeSignatureField && typeof values[activeSignatureField.id] === 'string'
            ? (values[activeSignatureField.id] as string)
            : undefined
        }
        onSave={(dataUrl) => {
          if (activeSignatureField) {
            setValues((prev) => ({ ...prev, [activeSignatureField.id]: dataUrl }));
          }
          setIsSketchModalOpen(false);
          setActiveSignatureField(null);
        }}
      />
    </div>
  );
};
