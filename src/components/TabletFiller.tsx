import React, { useState, useRef } from 'react';
import {
  Download,
  Mail,
  RotateCcw,
  Camera,
  PenTool,
  Check,
  CheckSquare,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Clock,
  Settings,
  X,
  Calendar,
  Layers,
  Radio as RadioIcon,
  Link as LinkIcon,
  ExternalLink,
  Plus,
  Lock,
  Upload,
  Link2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FormField, FormTemplate, FilledValues, SavedSubmission } from '../types';
import { RenderedPage, generateFilledPdf } from '../utils/pdfHelper';
import { SignatureModal } from './SignatureModal';
import { EmailModal } from './EmailModal';
import { HistoryModal } from './HistoryModal';
import { ResetConfirmModal } from './ResetConfirmModal';
import { PasswordModal } from './PasswordModal';
import { idbSaveSubmission, idbGetSubmissions, isDesignerAuthenticated } from '../utils/idbStorage';

interface TabletFillerProps {
  template: FormTemplate;
  renderedPages: RenderedPage[];
  onSwitchToDesigner: () => void;
  onOpenLoadModal: (initialMode: 'link' | 'disk') => void;
}

export const TabletFiller: React.FC<TabletFillerProps> = ({
  template,
  renderedPages,
  onSwitchToDesigner,
  onOpenLoadModal,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [values, setValues] = useState<FilledValues>(() => {
    const initial: FilledValues = {};
    template.fields.forEach((f) => {
      if (f.defaultValue !== undefined) {
        initial[f.id] = f.defaultValue;
      }
    });
    return initial;
  });

  // Modals state
  const [activeSignatureField, setActiveSignatureField] = useState<FormField | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [submissions, setSubmissions] = useState<SavedSubmission[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // File input ref for camera/photos
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [currentImageFieldId, setCurrentImageFieldId] = useState<string | null>(null);

  // Load submissions on mount
  React.useEffect(() => {
    idbGetSubmissions().then(setSubmissions);
  }, []);

  const currentPageData = renderedPages.find((p) => p.pageNumber === currentPage) || renderedPages[0];
  const pageFields = template.fields.filter((f) => f.page === currentPage);

  // Compute progress
  const totalFields = template.fields.length;
  const filledFieldsCount = template.fields.filter((f) => {
    const v = values[f.id];
    if (f.type === 'checkbox' || f.type === 'radio') return v === true;
    return v !== undefined && v !== '' && v !== null;
  }).length;
  const progressPercent = totalFields > 0 ? Math.round((filledFieldsCount / totalFields) * 100) : 0;

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
        // Deselect other radio buttons in the same group
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

  const handleSignatureSave = (dataUrl: string) => {
    if (activeSignatureField) {
      setValues((prev) => ({ ...prev, [activeSignatureField.id]: dataUrl }));
    }
  };

  const handleClearSignature = (fieldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setValues((prev) => ({ ...prev, [fieldId]: undefined }));
  };

  // Reset all fields for the next form entry without overwriting the template
  const handleConfirmReset = () => {
    const blank: FilledValues = {};
    template.fields.forEach((f) => {
      if (f.type === 'checkbox' || f.type === 'radio') blank[f.id] = false;
      else blank[f.id] = '';
    });
    setValues(blank);
    setSaveSuccessMessage('Arkusz został wyczyszczony! Możesz wprowadzać nowe dane.');
    setTimeout(() => setSaveSuccessMessage(null), 3500);
  };

  // Save to Disk as a brand-new PDF file and record in submission history
  const handleSaveAndDownloadPdf = async (): Promise<string> => {
    setIsGeneratingPdf(true);
    try {
      const { blob } = await generateFilledPdf(renderedPages, template.fields, values);
      const downloadUrl = URL.createObjectURL(blob);

      // Create unique timestamped file name
      const now = new Date();
      const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const baseClean = template.name.replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ_-]/g, '_');
      const fileName = `${baseClean}_wypelniony_${dateStr}.pdf`;

      // Save submission record into database
      const newSubmission: SavedSubmission = {
        id: 'sub_' + Date.now(),
        templateId: template.id,
        templateName: template.name,
        fileName,
        pdfBlobUrl: downloadUrl,
        values: values,
        submittedAt: now.toISOString(),
      };

      await idbSaveSubmission(newSubmission);
      const updatedList = await idbGetSubmissions();
      setSubmissions(updatedList);

      // Trigger browser download
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Celebrate success
      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.7 },
      });

      setSaveSuccessMessage(`Dokument "${fileName}" został pomyślnie zapisany na dysku!`);
      setTimeout(() => setSaveSuccessMessage(null), 5000);

      return downloadUrl;
    } catch (err) {
      console.error('Błąd zapisu pliku PDF:', err);
      alert('Wystąpił błąd podczas generowania pliku PDF. Spróbuj ponownie.');
      throw err;
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDesignerClick = () => {
    if (isDesignerAuthenticated()) {
      onSwitchToDesigner();
    } else {
      setIsPasswordModalOpen(true);
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-200 overflow-hidden select-none">
      {/* Hidden file input for camera/photos */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageFileChange}
        className="hidden"
      />

      {/* Primary Tablet Action Bar */}
      <div className="bg-white border-b border-stone-200 px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 z-30 shadow-xs">
        {/* Left: Key Form Actions (Nowy formularz, Zapisz na dysku, Wyślij email) */}
        <div className="flex items-center flex-wrap gap-2">
          {/* NOWY FORMULARZ */}
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 active:scale-95 rounded-xl transition-all shadow-2xs"
            title="Wyczyść wszystkie pola i zacznij wypełniać kolejny arkusz"
          >
            <RotateCcw className="w-4 h-4 text-stone-600 shrink-0" />
            <span>Nowy formularz</span>
          </button>

          {/* ZAPISZ NA DYSKU */}
          <button
            type="button"
            onClick={() => handleSaveAndDownloadPdf()}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 rounded-xl shadow-xs transition-all disabled:opacity-50"
            title="Zapisz wypełniony arkusz jako nowy plik PDF na urządzeniu"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>{isGeneratingPdf ? 'Generowanie PDF...' : 'Zapisz na dysku'}</span>
          </button>

          {/* WYŚLIJ EMAIL */}
          <button
            type="button"
            onClick={() => setIsEmailModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-stone-700 bg-amber-50 hover:bg-amber-100/80 active:scale-95 border border-amber-200/80 rounded-xl transition-all shadow-2xs"
            title="Wyślij wypełniony formularz pocztą e-mail"
          >
            <Mail className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Wyślij e-mail</span>
          </button>

          {/* HISTORIA FORMULARZA */}
          <button
            type="button"
            onClick={() => setIsHistoryModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors"
            title="Zobacz wcześniejsze wypełnienia tego arkusza"
          >
            <Clock className="w-4 h-4 text-stone-500 shrink-0" />
            <span className="hidden md:inline">Historia formularza</span>
            {submissions.length > 0 && (
              <span className="px-1.5 py-0.2 bg-stone-200 text-stone-800 text-[10px] font-bold rounded-full">
                {submissions.length}
              </span>
            )}
          </button>
        </div>

        {/* Right: PDF Loaders & Designer Mode with Password */}
        <div className="flex items-center flex-wrap gap-2">
          {/* ZAŁADUJ PDF Z LINKU */}
          <button
            type="button"
            onClick={() => onOpenLoadModal('link')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200 rounded-xl transition-colors"
            title="Załaduj plik PDF z linku Google Drive lub bezpośredniego adresu URL"
          >
            <Link2 className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Załaduj z linku Google</span>
            <span className="sm:hidden">Z linku</span>
          </button>

          {/* ZAŁADUJ PDF Z DYSKU */}
          <button
            type="button"
            onClick={() => onOpenLoadModal('disk')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
            title="Wybierz plik PDF z pamięci komputera lub tabletu"
          >
            <Upload className="w-3.5 h-3.5 text-stone-600 shrink-0" />
            <span className="hidden sm:inline">Załaduj z dysku</span>
            <span className="sm:hidden">Z dysku</span>
          </button>

          <div className="h-5 w-px bg-stone-200 hidden lg:block" />

          {/* PROJEKTANT SZABLONU I EDYCJA (JEDNYM PRZYCISKIEM Z HASŁEM) */}
          <button
            type="button"
            onClick={handleDesignerClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200/90 border border-stone-300 rounded-xl transition-colors"
            title="Przejdź do edycji pól i układu szablonu (wymaga hasła)"
          >
            <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Projektant / Edycja</span>
          </button>
        </div>
      </div>

      {/* Secondary Bar: Navigation & Page/Zoom info */}
      <div className="bg-stone-100/90 border-b border-stone-200 px-4 py-1.5 flex items-center justify-between text-xs text-stone-600 z-20">
        <div className="flex items-center gap-3">
          {/* Multi-page controls */}
          {template.pageCount > 1 && (
            <div className="flex items-center bg-white px-2 py-0.5 rounded-lg border border-stone-200 gap-1.5 shadow-2xs">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded text-stone-600 hover:bg-stone-100 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-stone-900">
                Strona {currentPage} z {template.pageCount}
              </span>
              <button
                type="button"
                disabled={currentPage >= template.pageCount}
                onClick={() => setCurrentPage((p) => Math.min(template.pageCount, p + 1))}
                className="p-1 rounded text-stone-600 hover:bg-stone-100 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Progress Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-stone-500 hidden sm:inline">Uzupełniono:</span>
            <div className="w-24 sm:w-32 bg-stone-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-amber-600 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-stone-700">{progressPercent}%</span>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
            className="p-1.5 text-stone-600 hover:bg-white rounded-lg transition-colors"
            title="Pomniejsz"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-medium text-stone-700 w-10 text-center">{zoomLevel}%</span>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(180, z + 15))}
            className="p-1.5 text-stone-600 hover:bg-white rounded-lg transition-colors"
            title="Powiększ"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel(100)}
            className="px-2 py-0.5 text-xs text-stone-600 hover:bg-white rounded-md transition-colors"
          >
            100%
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {saveSuccessMessage && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold text-center shadow-md animate-fadeIn flex items-center justify-center gap-2 z-30">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* Interactive Sheet Container */}
      <div className="flex-1 overflow-auto p-3 sm:p-6 flex justify-center items-start">
        <div
          style={{ width: `${(820 * zoomLevel) / 100}px` }}
          className="transition-all duration-75 relative bg-white shadow-2xl rounded-sm border border-stone-300"
        >
          {currentPageData ? (
            <div
              className="relative w-full"
              style={{
                paddingTop: `${(currentPageData.aspectRatio || 1.414) * 100}%`,
              }}
            >
              {/* Background PDF page render */}
              <img
                src={currentPageData.dataUrl}
                alt={`Strona ${currentPage}`}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                referrerPolicy="no-referrer"
              />

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
                        className={`w-full h-full flex items-center justify-center rounded-xs transition-all focus:outline-none ${
                          Boolean(val ?? field.defaultValue)
                            ? 'bg-amber-600/15 border-2 border-amber-600 text-stone-900 font-black'
                            : 'bg-white/80 border-2 border-stone-400 hover:border-amber-500 hover:bg-amber-50/40'
                        }`}
                        title={field.label}
                      >
                        {Boolean(val ?? field.defaultValue) ? (
                          <Check className="w-[85%] h-[85%] stroke-[3.5] text-stone-900" />
                        ) : null}
                      </button>
                    )}

                    {/* 2. RADIO BUTTON FIELD */}
                    {field.type === 'radio' && (
                      <button
                        type="button"
                        onClick={() => handleRadioSelect(field)}
                        className={`w-full h-full flex items-center justify-center rounded-full transition-all focus:outline-none ${
                          Boolean(val ?? field.defaultValue)
                            ? 'bg-amber-600/15 border-2 border-amber-600'
                            : 'bg-white/80 border-2 border-stone-400 hover:border-amber-500 hover:bg-amber-50/40'
                        }`}
                        title={field.label + (field.groupName ? ` (Grupa: ${field.groupName})` : '')}
                      >
                        {Boolean(val ?? field.defaultValue) && (
                          <div className="w-[50%] h-[50%] rounded-full bg-amber-600 shadow-2xs" />
                        )}
                      </button>
                    )}

                    {/* 3. LINK / URL FIELD */}
                    {field.type === 'link' && (
                      <div className="w-full h-full flex items-center bg-white/85 hover:bg-white border border-blue-300 rounded-xs px-2 shadow-2xs group/link">
                        <a
                          href={field.linkUrl || (val as string) || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            if (!field.linkUrl && !val) e.preventDefault();
                          }}
                          className="w-full flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-xs font-semibold underline truncate"
                          title={field.linkUrl || (val as string) || field.label}
                        >
                          <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{(val as string) || field.label || field.linkUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 opacity-60 group-hover/link:opacity-100" />
                        </a>
                      </div>
                    )}

                    {/* 4. TEXT INPUT FIELD */}
                    {field.type === 'text' && (
                      <input
                        type="text"
                        value={(val as string) || ''}
                        onChange={(e) => handleTextChange(field.id, e.target.value)}
                        placeholder={field.placeholder || ''}
                        className="w-full h-full px-2 text-stone-900 font-semibold bg-white/75 hover:bg-white focus:bg-white border border-stone-300 focus:border-amber-600 rounded-xs text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 shadow-2xs transition-all"
                        style={{
                          fontSize: `calc(${field.fontSize || 13}px * ${zoomLevel / 100})`,
                        }}
                      />
                    )}

                    {/* 5. DATE INPUT FIELD */}
                    {field.type === 'date' && (
                      <div className="relative w-full h-full">
                        <input
                          type="date"
                          value={(val as string) || ''}
                          onChange={(e) => handleTextChange(field.id, e.target.value)}
                          className="w-full h-full px-2 text-stone-900 font-semibold bg-white/75 hover:bg-white focus:bg-white border border-stone-300 focus:border-amber-600 rounded-xs text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 shadow-2xs"
                        />
                      </div>
                    )}

                    {/* 6. TEXTAREA (NOTATKI / OPIS) */}
                    {field.type === 'textarea' && (
                      <textarea
                        value={(val as string) || ''}
                        onChange={(e) => handleTextChange(field.id, e.target.value)}
                        placeholder={field.placeholder || ''}
                        className="w-full h-full p-2 text-stone-900 font-medium bg-white/75 hover:bg-white focus:bg-white border border-stone-300 focus:border-amber-600 rounded-xs text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/40 resize-none shadow-2xs"
                        style={{
                          fontSize: `calc(${field.fontSize || 12}px * ${zoomLevel / 100})`,
                        }}
                      />
                    )}

                    {/* 7. IMAGE / CAMERA FIELD */}
                    {field.type === 'image' && (
                      <div
                        onClick={() => handleImageClick(field.id)}
                        className={`w-full h-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-1.5 cursor-pointer transition-all overflow-hidden relative ${
                          val
                            ? 'border-sky-500 bg-sky-50/20'
                            : 'border-sky-400/80 bg-sky-50/50 hover:bg-sky-100/60 hover:border-sky-600'
                        }`}
                        title={field.label}
                      >
                        {val ? (
                          <>
                            <img
                              src={val as string}
                              alt="Wgrane zdjęcie"
                              className="w-full h-full object-contain pointer-events-none"
                            />
                            <button
                              type="button"
                              onClick={(e) => handleRemoveImage(field.id, e)}
                              className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full shadow-md hover:bg-rose-700 transition-colors"
                              title="Usuń zdjęcie"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <div className="text-center text-sky-700 flex flex-col items-center gap-1">
                            <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
                            <span className="text-[10px] sm:text-xs font-semibold leading-tight">
                              {field.label}
                            </span>
                            <span className="text-[9px] text-sky-600/80 hidden sm:inline">
                              Dotknij, aby zrobić zdjęcie
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 8. SIGNATURE FIELD */}
                    {field.type === 'signature' && (
                      <div
                        onClick={() => setActiveSignatureField(field)}
                        className={`w-full h-full border-2 rounded-lg flex flex-col items-center justify-center p-1.5 cursor-pointer transition-all relative overflow-hidden ${
                          val
                            ? 'border-indigo-500 bg-white'
                            : 'border-dashed border-indigo-400/80 bg-indigo-50/40 hover:bg-indigo-100/50'
                        }`}
                        title={field.label}
                      >
                        {val ? (
                          <>
                            <img
                              src={val as string}
                              alt="Podpis"
                              className="w-full h-full object-contain pointer-events-none"
                            />
                            <button
                              type="button"
                              onClick={(e) => handleClearSignature(field.id, e)}
                              className="absolute top-1 right-1 p-1 bg-stone-700 text-white rounded-full shadow-md hover:bg-rose-600 transition-colors"
                              title="Wyczyść podpis"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <div className="text-center text-indigo-700 flex flex-col items-center gap-1">
                            <PenTool className="w-5 h-5 sm:w-6 sm:h-6" />
                            <span className="text-[10px] sm:text-xs font-semibold leading-tight">
                              {field.label}
                            </span>
                            <span className="text-[9px] text-indigo-600/80 hidden sm:inline">
                              Dotknij, aby złożyć podpis
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-stone-400">Ładowanie arkusza PDF...</div>
          )}
        </div>
      </div>

      {/* Signature Modal */}
      {activeSignatureField && (
        <SignatureModal
          isOpen={Boolean(activeSignatureField)}
          onClose={() => setActiveSignatureField(null)}
          onSave={handleSignatureSave}
          title={activeSignatureField.label}
        />
      )}

      {/* Email Sending Modal */}
      <EmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onGeneratePdfBlob={handleSaveAndDownloadPdf}
        templateName={template.name}
      />

      {/* History Modal */}
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        submissions={submissions}
        onDeleteSubmission={async (id) => {
          const { idbDeleteSubmission } = await import('../utils/idbStorage');
          await idbDeleteSubmission(id);
          const updated = await idbGetSubmissions();
          setSubmissions(updated);
        }}
      />

      {/* Reset Confirmation Modal (Nowy formularz) */}
      <ResetConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleConfirmReset}
      />

      {/* Password Modal for Designer Access */}
      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={() => onSwitchToDesigner()}
      />
    </div>
  );
};
