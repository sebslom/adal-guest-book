import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Type,
  CheckSquare,
  Image as ImageIcon,
  PenTool,
  Calendar,
  Trash2,
  Copy,
  ClipboardPaste,
  Check,
  Sliders,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileCheck,
  MousePointer,
  HelpCircle,
  Radio,
  Link as LinkIcon,
  Save,
  HardDrive,
  History,
  Upload,
} from 'lucide-react';
import { FormField, FormTemplate, FieldType } from '../types';
import { RenderedPage, renderPdfPages } from '../utils/pdfHelper';
import { readPdfFileFromDisk } from '../utils/urlPdfLoader';
import { AdalFormBackground } from './AdalFormBackground';
import { GooglePdfLoadModal } from './GooglePdfLoadModal';
import { HistoryModal } from './HistoryModal';

interface TemplateDesignerProps {
  template: FormTemplate;
  renderedPages: RenderedPage[];
  onUpdateTemplate: (updated: FormTemplate) => void;
  onSwitchToFiller: () => void;
}

export const TemplateDesigner: React.FC<TemplateDesignerProps> = ({
  template,
  renderedPages,
  onUpdateTemplate,
  onSwitchToFiller,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [localPages, setLocalPages] = useState<RenderedPage[]>(renderedPages);
  const [isGoogleLoadOpen, setIsGoogleLoadOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const diskPdfInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setLocalPages(renderedPages);
  }, [renderedPages]);

  const handleDirectDiskUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showNotification('Wczytywanie i przetwarzanie pliku PDF z dysku...');
      const { dataUrl, fileName } = await readPdfFileFromDisk(file);
      const pages = await renderPdfPages(dataUrl, 1400);

      if (pages.length === 0) {
        alert('Wybrany plik PDF jest pusty.');
        return;
      }

      setLocalPages(pages);
      const updated: FormTemplate = {
        ...template,
        fileName,
        pdfDataUrl: dataUrl,
        pageCount: pages.length,
        pageAspectRatios: pages.map((p) => p.aspectRatio),
        updatedAt: new Date().toISOString(),
      };
      onUpdateTemplate(updated);
      showNotification(
        `Wczytano plik "${fileName}" (${pages.length} str.). Kliknij "Zapisz formularz", aby zapisać na stałe.`
      );
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Błąd podczas wczytywania pliku z dysku.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<FieldType | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [resizingFieldId, setResizingFieldId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  });
  const [clipboardField, setClipboardField] = useState<FormField | null>(null);
  const [designerNotification, setDesignerNotification] = useState<string | null>(null);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const pageContainerRef = useRef<HTMLDivElement | null>(null);

  const currentPageData = localPages.find((p) => p.pageNumber === currentPage) || localPages[0];
  const pageFields = template.fields.filter((f) => f.page === currentPage);
  const selectedField = template.fields.find((f) => f.id === selectedFieldId);

  const showNotification = useCallback((message: string) => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    setDesignerNotification(message);
    notificationTimeoutRef.current = setTimeout(() => {
      setDesignerNotification(null);
    }, 2400);
  }, []);

  const handleCopy = useCallback(() => {
    if (!selectedField) return;
    setClipboardField({ ...selectedField });
    showNotification(`Skopiowano okienko "${selectedField.label}" (Ctrl+C)`);
  }, [selectedField, showNotification]);

  const handlePaste = useCallback(() => {
    if (!clipboardField) return;

    // Place on current page and offset slightly
    let newX = clipboardField.x + 2.5;
    let newY = clipboardField.y + 2.5;

    if (newX + clipboardField.width > 99) {
      newX = Math.max(1, 99 - clipboardField.width);
    }
    if (newY + clipboardField.height > 99) {
      newY = Math.max(1, 99 - clipboardField.height);
    }

    const newField: FormField = {
      ...clipboardField,
      id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      page: currentPage,
      x: Number(newX.toFixed(2)),
      y: Number(newY.toFixed(2)),
      label: clipboardField.label.includes('(kopia)')
        ? clipboardField.label
        : `${clipboardField.label} (kopia)`,
    };

    const updated = {
      ...template,
      fields: [...template.fields, newField],
      updatedAt: new Date().toISOString(),
    };

    onUpdateTemplate(updated);
    setSelectedFieldId(newField.id);
    setClipboardField(newField);
    showNotification(`Wklejono okienko "${newField.label}" (Ctrl+V)`);
  }, [clipboardField, currentPage, template, onUpdateTemplate, showNotification]);

  // Keyboard navigation, delete, and Ctrl+C / Ctrl+V
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (e.key === 'Escape') {
        setActiveTool(null);
        setSelectedFieldId(null);
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFieldId && !isInput) {
        e.preventDefault();
        handleDeleteField(selectedFieldId);
        return;
      }

      // Ctrl+C or Cmd+C (Copy)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        if (!isInput && selectedField) {
          e.preventDefault();
          handleCopy();
          return;
        }
      }

      // Ctrl+V or Cmd+V (Paste)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        if (!isInput && clipboardField) {
          e.preventDefault();
          handlePaste();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFieldId, selectedField, clipboardField, handleCopy, handlePaste]);

  const handleAddField = (type: FieldType, clickXPercent: number, clickYPercent: number) => {
    let width = 25;
    let height = 4;
    let label = 'Pole tekstowe';

    if (type === 'checkbox') {
      width = 3.5;
      height = 2.5;
      label = 'Kratka do zaznaczenia';
    } else if (type === 'radio') {
      width = 3.5;
      height = 2.5;
      label = 'Opcja (Radio)';
    } else if (type === 'link') {
      width = 25;
      height = 4;
      label = 'Odnośnik / Link URL';
    } else if (type === 'image') {
      width = 35;
      height = 18;
      label = 'Miejsce na zdjęcie / obrazek';
    } else if (type === 'signature') {
      width = 35;
      height = 12;
      label = 'Podpis odręczny';
    } else if (type === 'textarea') {
      width = 40;
      height = 14;
      label = 'Pole uwag / opis';
    } else if (type === 'date') {
      width = 20;
      height = 4;
      label = 'Data';
    }

    // Keep inside bounds
    const x = Math.max(1, Math.min(clickXPercent - width / 2, 99 - width));
    const y = Math.max(1, Math.min(clickYPercent - height / 2, 99 - height));

    const newField: FormField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      label,
      page: currentPage,
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      width: Number(width.toFixed(2)),
      height: Number(height.toFixed(2)),
      defaultValue: type === 'checkbox' ? false : '',
    };

    const updated = {
      ...template,
      fields: [...template.fields, newField],
      updatedAt: new Date().toISOString(),
    };
    onUpdateTemplate(updated);
    setSelectedFieldId(newField.id);
    setActiveTool(null);
  };

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeTool) {
      setSelectedFieldId(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    handleAddField(activeTool, clickX, clickY);
  };

  const handleFieldMouseDown = (e: React.MouseEvent, field: FormField) => {
    e.stopPropagation();
    setSelectedFieldId(field.id);

    if (pageContainerRef.current) {
      const rect = pageContainerRef.current.getBoundingClientRect();
      const clickX = ((e.clientX - rect.left) / rect.width) * 100;
      const clickY = ((e.clientY - rect.top) / rect.height) * 100;

      setDraggingFieldId(field.id);
      setDragOffset({
        x: clickX - field.x,
        y: clickY - field.y,
      });
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent, field: FormField) => {
    e.stopPropagation();
    setResizingFieldId(field.id);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      w: field.width,
      h: field.height,
    });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (draggingFieldId && pageContainerRef.current) {
        const rect = pageContainerRef.current.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * 100;
        const mouseY = ((e.clientY - rect.top) / rect.height) * 100;

        const field = template.fields.find((f) => f.id === draggingFieldId);
        if (!field) return;

        let newX = mouseX - dragOffset.x;
        let newY = mouseY - dragOffset.y;

        newX = Math.max(0, Math.min(newX, 100 - field.width));
        newY = Math.max(0, Math.min(newY, 100 - field.height));

        const updatedFields = template.fields.map((f) =>
          f.id === draggingFieldId ? { ...f, x: Number(newX.toFixed(2)), y: Number(newY.toFixed(2)) } : f
        );
        onUpdateTemplate({ ...template, fields: updatedFields });
      } else if (resizingFieldId && pageContainerRef.current) {
        const rect = pageContainerRef.current.getBoundingClientRect();
        const deltaX = ((e.clientX - resizeStart.x) / rect.width) * 100;
        const deltaY = ((e.clientY - resizeStart.y) / rect.height) * 100;

        const field = template.fields.find((f) => f.id === resizingFieldId);
        if (!field) return;

        const newW = Math.max(2, Math.min(resizeStart.w + deltaX, 100 - field.x));
        const newH = Math.max(1.5, Math.min(resizeStart.h + deltaY, 100 - field.y));

        const updatedFields = template.fields.map((f) =>
          f.id === resizingFieldId ? { ...f, width: Number(newW.toFixed(2)), height: Number(newH.toFixed(2)) } : f
        );
        onUpdateTemplate({ ...template, fields: updatedFields });
      }
    },
    [draggingFieldId, dragOffset, resizingFieldId, resizeStart, template, onUpdateTemplate]
  );

  const handleMouseUp = () => {
    setDraggingFieldId(null);
    setResizingFieldId(null);
  };

  const handleDeleteField = (id: string) => {
    const updated = {
      ...template,
      fields: template.fields.filter((f) => f.id !== id),
      updatedAt: new Date().toISOString(),
    };
    onUpdateTemplate(updated);
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const handleDuplicateField = (field: FormField) => {
    const newField: FormField = {
      ...field,
      id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      x: Math.min(field.x + 3, 100 - field.width),
      y: Math.min(field.y + 3, 100 - field.height),
      label: `${field.label} (kopia)`,
    };
    const updated = {
      ...template,
      fields: [...template.fields, newField],
      updatedAt: new Date().toISOString(),
    };
    onUpdateTemplate(updated);
    setSelectedFieldId(newField.id);
  };

  const updateSelectedFieldProps = (props: Partial<FormField>) => {
    if (!selectedFieldId) return;
    const updated = {
      ...template,
      fields: template.fields.map((f) => (f.id === selectedFieldId ? { ...f, ...props } : f)),
      updatedAt: new Date().toISOString(),
    };
    onUpdateTemplate(updated);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-65px)] overflow-hidden bg-stone-200">
      {/* Left / Top Toolbar with tools & field properties */}
      <div className="w-full lg:w-80 bg-white border-r border-stone-200 flex flex-col shrink-0 overflow-y-auto shadow-sm z-20">
        {/* Tool selector */}
        <div className="p-4 border-b border-stone-200 bg-stone-50/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Dodaj pole do dokumentu
            </span>
            <span className="text-[11px] text-stone-500">Kliknij narzędzie</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveTool(activeTool === 'text' ? null : 'text')}
              className={`p-2.5 rounded-xl border text-left flex items-center gap-2 text-xs font-semibold transition-all ${
                activeTool === 'text'
                  ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-200'
                  : 'bg-white border-stone-200 text-stone-700 hover:border-amber-300 hover:bg-stone-50'
              }`}
            >
              <Type className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Tekst (kratka)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool(activeTool === 'checkbox' ? null : 'checkbox')}
              className={`p-2.5 rounded-xl border text-left flex items-center gap-2 text-xs font-semibold transition-all ${
                activeTool === 'checkbox'
                  ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-200'
                  : 'bg-white border-stone-200 text-stone-700 hover:border-amber-300 hover:bg-stone-50'
              }`}
            >
              <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Kwadracik (✓)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool(activeTool === 'radio' ? null : 'radio')}
              className={`p-2.5 rounded-xl border text-left flex items-center gap-2 text-xs font-semibold transition-all ${
                activeTool === 'radio'
                  ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-200'
                  : 'bg-white border-stone-200 text-stone-700 hover:border-amber-300 hover:bg-stone-50'
              }`}
            >
              <Radio className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Radio button (●)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool(activeTool === 'link' ? null : 'link')}
              className={`p-2.5 rounded-xl border text-left flex items-center gap-2 text-xs font-semibold transition-all ${
                activeTool === 'link'
                  ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-200'
                  : 'bg-white border-stone-200 text-stone-700 hover:border-amber-300 hover:bg-stone-50'
              }`}
            >
              <LinkIcon className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Link / URL</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool(activeTool === 'image' ? null : 'image')}
              className={`p-2.5 rounded-xl border text-left flex items-center gap-2 text-xs font-semibold transition-all ${
                activeTool === 'image'
                  ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-200'
                  : 'bg-white border-stone-200 text-stone-700 hover:border-amber-300 hover:bg-stone-50'
              }`}
            >
              <ImageIcon className="w-4 h-4 text-sky-600 shrink-0" />
              <span>Miejsce na obraz</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool(activeTool === 'signature' ? null : 'signature')}
              className={`p-2.5 rounded-xl border text-left flex items-center gap-2 text-xs font-semibold transition-all ${
                activeTool === 'signature'
                  ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-200'
                  : 'bg-white border-stone-200 text-stone-700 hover:border-amber-300 hover:bg-stone-50'
              }`}
            >
              <PenTool className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Podpis odręczny</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool(activeTool === 'date' ? null : 'date')}
              className={`p-2.5 rounded-xl border text-left flex items-center gap-2 text-xs font-semibold transition-all ${
                activeTool === 'date'
                  ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-200'
                  : 'bg-white border-stone-200 text-stone-700 hover:border-amber-300 hover:bg-stone-50'
              }`}
            >
              <Calendar className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Data</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool(activeTool === 'textarea' ? null : 'textarea')}
              className={`p-2.5 rounded-xl border text-left flex items-center gap-2 text-xs font-semibold transition-all ${
                activeTool === 'textarea'
                  ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-200'
                  : 'bg-white border-stone-200 text-stone-700 hover:border-amber-300 hover:bg-stone-50'
              }`}
            >
              <Sliders className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Notatki / Opis</span>
            </button>
          </div>

          {activeTool ? (
            <div className="mt-3 p-2.5 bg-amber-100/70 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center gap-2 animate-pulse">
              <MousePointer className="w-4 h-4 shrink-0 text-amber-700" />
              <span>Kliknij w dokumencie w miejscu, gdzie ma być nowe pole!</span>
            </div>
          ) : (
            <p className="mt-2.5 text-[11px] text-stone-500 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" />
              Wybierz pole powyżej lub kliknij istniejące pole, aby je edytować.
            </p>
          )}
        </div>

        {/* Selected field inspector */}
        <div className="p-4 flex-1 space-y-4">
          {selectedField ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <span className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-600" /> Właściwości okna
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleCopy}
                    title="Kopiuj okienko (Ctrl+C)"
                    className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handlePaste}
                    disabled={!clipboardField}
                    title={clipboardField ? `Wklej: ${clipboardField.label} (Ctrl+V)` : 'Wklej okienko (Ctrl+V)'}
                    className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors disabled:opacity-30"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicateField(selectedField)}
                    title="Zduplikuj pole"
                    className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 opacity-60" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteField(selectedField.id)}
                    title="Usuń pole (Delete)"
                    className="p-1.5 text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Etykieta / Nazwa pola
                </label>
                <input
                  type="text"
                  value={selectedField.label}
                  onChange={(e) => updateSelectedFieldProps({ label: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                />
              </div>

              {selectedField.type === 'radio' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Nazwa grupy opcji (dla powiązanych pól)
                  </label>
                  <input
                    type="text"
                    value={selectedField.groupName || ''}
                    onChange={(e) => updateSelectedFieldProps({ groupName: e.target.value })}
                    placeholder="np. stan_instalacji (opcjonalnie)"
                    className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                  <p className="text-[10px] text-stone-400 mt-1">
                    Pola o tej samej nazwie grupy będą działać jak klasyczne radio buttony (wybór jednej opcji).
                  </p>
                </div>
              )}

              {selectedField.type === 'link' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Adres docelowy linku (URL)
                  </label>
                  <input
                    type="text"
                    value={selectedField.linkUrl || ''}
                    onChange={(e) => updateSelectedFieldProps({ linkUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                </div>
              )}

              {selectedField.type !== 'checkbox' && selectedField.type !== 'radio' && selectedField.type !== 'signature' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Podpowiedź (placeholder)
                  </label>
                  <input
                    type="text"
                    value={selectedField.placeholder || ''}
                    onChange={(e) => updateSelectedFieldProps({ placeholder: e.target.value })}
                    placeholder="np. Wpisz wartość..."
                    className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                </div>
              )}

              {/* Formatowanie tekstu i odstępy między wierszami */}
              {(selectedField.type === 'text' || selectedField.type === 'textarea') && (
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-3 text-xs">
                  <div className="text-[11px] font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-amber-700" />
                    <span>Format tekstu i odstępy (interlinia)</span>
                  </div>

                  {/* Odstęp między wierszami (Line Height) */}
                  <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-stone-200">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-stone-700">
                        Odstęp między wierszami:
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0.8"
                          max="3.5"
                          step="0.05"
                          value={selectedField.lineHeight || 1.35}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              updateSelectedFieldProps({ lineHeight: Math.max(0.8, Math.min(4.0, Number(val.toFixed(2)))) });
                            }
                          }}
                          className="w-16 px-2 py-0.5 text-xs text-right font-mono font-bold text-stone-900 bg-stone-50 border border-stone-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <span className="text-stone-400 text-[10px]">x</span>
                      </div>
                    </div>

                    <input
                      type="range"
                      min="0.9"
                      max="2.5"
                      step="0.05"
                      value={selectedField.lineHeight || 1.35}
                      onChange={(e) => updateSelectedFieldProps({ lineHeight: parseFloat(e.target.value) })}
                      className="w-full accent-amber-600 cursor-pointer"
                    />

                    {/* Presety interlinii */}
                    <div className="grid grid-cols-4 gap-1 pt-1">
                      {[
                        { label: '1.15 Ciasne', val: 1.15 },
                        { label: '1.35 Norm', val: 1.35 },
                        { label: '1.6 Luźne', val: 1.6 },
                        { label: '2.0 Podwójne', val: 2.0 },
                      ].map((preset) => {
                        const isCurrent = Math.abs((selectedField.lineHeight || 1.35) - preset.val) < 0.05;
                        return (
                          <button
                            key={preset.val}
                            type="button"
                            onClick={() => updateSelectedFieldProps({ lineHeight: preset.val })}
                            className={`py-1 px-0.5 text-[9px] font-medium rounded border text-center transition-colors cursor-pointer ${
                              isCurrent
                                ? 'bg-amber-600 text-white border-amber-600 font-bold shadow-2xs'
                                : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Rozmiar czcionki */}
                  <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-stone-200">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-stone-700">
                        Rozmiar czcionki:
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="8"
                          max="48"
                          step="1"
                          value={selectedField.fontSize || 12}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) {
                              updateSelectedFieldProps({ fontSize: Math.max(8, Math.min(60, val)) });
                            }
                          }}
                          className="w-16 px-2 py-0.5 text-xs text-right font-mono font-bold text-stone-900 bg-stone-50 border border-stone-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <span className="text-stone-400 text-[10px]">px</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 pt-0.5">
                      {[10, 11, 12, 14, 16, 18].map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => updateSelectedFieldProps({ fontSize: size })}
                          className={`flex-1 py-1 text-[10px] font-mono rounded border transition-colors cursor-pointer ${
                            (selectedField.fontSize || 12) === size
                              ? 'bg-amber-600 text-white border-amber-600 font-bold'
                              : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border-stone-200'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Wyrównanie tekstu */}
                  <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-stone-200">
                    <span className="text-[11px] font-semibold text-stone-700">Wyrównanie:</span>
                    <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-md border border-stone-200">
                      {(['left', 'center', 'right'] as const).map((aln) => (
                        <button
                          key={aln}
                          type="button"
                          onClick={() => updateSelectedFieldProps({ align: aln })}
                          className={`px-2.5 py-0.5 text-[10px] font-semibold rounded capitalize cursor-pointer transition-colors ${
                            (selectedField.align || 'left') === aln
                              ? 'bg-white text-stone-900 shadow-2xs'
                              : 'text-stone-500 hover:text-stone-800'
                          }`}
                        >
                          {aln === 'left' ? 'Lewo' : aln === 'center' ? 'Środek' : 'Prawo'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Ręczne wpisywanie wymiarów i położenia okna */}
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3 text-xs shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1">
                    <Maximize2 className="w-3.5 h-3.5 text-amber-700" /> Rozmiar okna (wpisz ręcznie)
                  </span>
                  <span className="text-[10px] text-stone-500 font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200">
                    % strony
                  </span>
                </div>

                {/* Szerokość (W) */}
                <div className="space-y-1 bg-white p-2.5 rounded-lg border border-stone-200">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-stone-700">
                      Szerokość (W):
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="0.1"
                        value={selectedField.width}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            const clamped = Math.max(1, Math.min(100 - selectedField.x, Number(val.toFixed(2))));
                            updateSelectedFieldProps({ width: clamped });
                          }
                        }}
                        className="w-20 px-2 py-1 text-xs text-right font-mono font-bold text-stone-900 bg-stone-50 border border-stone-300 rounded focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="text-stone-500 font-medium text-xs">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="0.5"
                    value={selectedField.width}
                    onChange={(e) => updateSelectedFieldProps({ width: parseFloat(e.target.value) })}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                </div>

                {/* Wysokość (H) */}
                <div className="space-y-1 bg-white p-2.5 rounded-lg border border-stone-200">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-stone-700">
                      Wysokość (H):
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0.5"
                        max="100"
                        step="0.1"
                        value={selectedField.height}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            const clamped = Math.max(0.5, Math.min(100 - selectedField.y, Number(val.toFixed(2))));
                            updateSelectedFieldProps({ height: clamped });
                          }
                        }}
                        className="w-20 px-2 py-1 text-xs text-right font-mono font-bold text-stone-900 bg-stone-50 border border-stone-300 rounded focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="text-stone-500 font-medium text-xs">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="60"
                    step="0.5"
                    value={selectedField.height}
                    onChange={(e) => updateSelectedFieldProps({ height: parseFloat(e.target.value) })}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                </div>

                {/* Położenie okna X i Y */}
                <div className="bg-white p-2.5 rounded-lg border border-stone-200 space-y-1.5">
                  <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                    Położenie okna (X / Y)
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-stone-600 mb-0.5 block">X (od lewej):</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="99"
                          step="0.1"
                          value={selectedField.x}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              const clamped = Math.max(0, Math.min(100 - selectedField.width, Number(val.toFixed(2))));
                              updateSelectedFieldProps({ x: clamped });
                            }
                          }}
                          className="w-full px-2 py-1 text-xs text-right font-mono font-semibold bg-stone-50 border border-stone-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <span className="text-stone-400 text-[10px]">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-stone-600 mb-0.5 block">Y (od góry):</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="99"
                          step="0.1"
                          value={selectedField.y}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              const clamped = Math.max(0, Math.min(100 - selectedField.height, Number(val.toFixed(2))));
                              updateSelectedFieldProps({ y: clamped });
                            }
                          }}
                          className="w-full px-2 py-1 text-xs text-right font-mono font-semibold bg-stone-50 border border-stone-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <span className="text-stone-400 text-[10px]">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Szybkie przyciski korekty rozmiaru */}
                <div className="pt-0.5">
                  <div className="text-[10px] text-stone-500 mb-1 font-medium">
                    Korekta rozmiaru krok po kroku:
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        updateSelectedFieldProps({
                          width: Math.max(1, Number((selectedField.width - 1).toFixed(2))),
                        })
                      }
                      className="px-1 py-1 text-[10px] font-mono font-semibold bg-white hover:bg-stone-100 border border-stone-200 rounded text-stone-700 text-center"
                      title="Zmniejsz szerokość o 1%"
                    >
                      W -1%
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateSelectedFieldProps({
                          width: Math.min(
                            100 - selectedField.x,
                            Number((selectedField.width + 1).toFixed(2))
                          ),
                        })
                      }
                      className="px-1 py-1 text-[10px] font-mono font-semibold bg-white hover:bg-stone-100 border border-stone-200 rounded text-stone-700 text-center"
                      title="Zwiększ szerokość o 1%"
                    >
                      W +1%
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateSelectedFieldProps({
                          height: Math.max(0.5, Number((selectedField.height - 0.5).toFixed(2))),
                        })
                      }
                      className="px-1 py-1 text-[10px] font-mono font-semibold bg-white hover:bg-stone-100 border border-stone-200 rounded text-stone-700 text-center"
                      title="Zmniejsz wysokość o 0.5%"
                    >
                      H -0.5%
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateSelectedFieldProps({
                          height: Math.min(
                            100 - selectedField.y,
                            Number((selectedField.height + 0.5).toFixed(2))
                          ),
                        })
                      }
                      className="px-1 py-1 text-[10px] font-mono font-semibold bg-white hover:bg-stone-100 border border-stone-200 rounded text-stone-700 text-center"
                      title="Zwiększ wysokość o 0.5%"
                    >
                      H +0.5%
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDeleteField(selectedField.id)}
                className="w-full py-2 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Usuń to pole (Delete)
              </button>
            </div>
          ) : (
            <div className="text-center py-8 text-stone-400 space-y-2">
              <MousePointer className="w-8 h-8 mx-auto stroke-1 text-stone-300" />
              <p className="text-xs">Kliknij pole na dokumencie, aby dostosować jego rozmiar i nazwę.</p>
            </div>
          )}
        </div>

        {/* Bottom mode switch button */}
        <div className="p-4 bg-stone-50 border-t border-stone-200">
          <button
            type="button"
            onClick={() => {
              onUpdateTemplate(template);
              showNotification('Formularz został pomyślnie zapisany!');
              setTimeout(() => onSwitchToFiller(), 300);
            }}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Zapisz formularz i wyjdź</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        className="flex-1 flex flex-col h-full overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Document control bar */}
        <div className="px-6 py-2.5 bg-white border-b border-stone-200 flex items-center justify-between shrink-0 shadow-2xs z-10">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-stone-700">
              Strona {currentPage} z {template.pageCount}
            </span>
            {template.pageCount > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded text-stone-600 hover:bg-stone-100 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
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
            <span className="text-xs text-stone-400">|</span>
            <span className="text-xs text-stone-600">
              Pól na stronie: <span className="font-semibold text-stone-900">{pageFields.length}</span>
            </span>
          </div>

          {/* Copy and Paste controls (Ctrl+C / Ctrl+V) */}
          <div className="flex items-center gap-1.5 bg-stone-50 p-1 rounded-xl border border-stone-200">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!selectedField}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 disabled:opacity-40 transition-colors shadow-2xs"
              title={
                selectedField
                  ? `Kopiuj "${selectedField.label}" (Ctrl+C)`
                  : 'Zaznacz okienko, aby skopiować (Ctrl+C)'
              }
            >
              <Copy className="w-3.5 h-3.5 text-amber-600" />
              <span>Kopiuj</span>
              <kbd className="text-[9px] bg-stone-100 text-stone-500 px-1 py-0.5 rounded font-mono border border-stone-200">
                Ctrl+C
              </kbd>
            </button>

            <button
              type="button"
              onClick={handlePaste}
              disabled={!clipboardField}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 disabled:opacity-40 transition-colors shadow-2xs"
              title={
                clipboardField
                  ? `Wklej: ${clipboardField.label} (Ctrl+V)`
                  : 'Wklej okienko (Ctrl+V) - najpierw skopiuj (Ctrl+C)'
              }
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-amber-600" />
              <span>Wklej</span>
              <kbd className="text-[9px] bg-stone-100 text-stone-500 px-1 py-0.5 rounded font-mono border border-stone-200">
                Ctrl+V
              </kbd>
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
              className="p-1.5 text-stone-600 hover:bg-stone-100 rounded-lg"
              title="Pomniejsz"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-stone-600 w-12 text-center">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(180, z + 15))}
              className="p-1.5 text-stone-600 hover:bg-stone-100 rounded-lg"
              title="Powiększ"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(100)}
              className="px-2 py-1 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg"
              title="Resetuj zoom"
            >
              100%
            </button>

            {/* Hidden file input for direct disk PDF upload */}
            <input
              ref={diskPdfInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleDirectDiskUpload}
              className="hidden"
            />

            {/* Wczytaj z dysku */}
            <button
              type="button"
              onClick={() => diskPdfInputRef.current?.click()}
              className="ml-2 px-3 py-1.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 active:scale-95 border border-stone-300 rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Wczytaj podkład formularza bezpośrednio z pliku PDF na Twoim komputerze"
            >
              <Upload className="w-3.5 h-3.5 text-stone-600" />
              <span>Wczytaj z dysku</span>
            </button>

            {/* Wczytaj z linku Google */}
            <button
              type="button"
              onClick={() => setIsGoogleLoadOpen(true)}
              className="ml-1 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 active:scale-95 border border-blue-200 rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Wczytaj podkład formularza PDF z linku Google Drive lub bezpośredniego adresu URL"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Wczytaj z Google</span>
            </button>

            {/* Historia */}
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="ml-1 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 active:scale-95 border border-amber-200 rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Zobacz historię wersji formularza oraz wpisy gości"
            >
              <History className="w-3.5 h-3.5 text-amber-700" />
              <span>Historia</span>
            </button>

            {/* Zapisz formularz button in top bar */}
            <button
              type="button"
              onClick={() => {
                onUpdateTemplate(template);
                showNotification('Formularz został pomyślnie i trwale zapisany!');
                setTimeout(() => onSwitchToFiller(), 350);
              }}
              className="ml-2 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Zastosuj i zapisz formularz na stałe do strony głównej"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Zapisz formularz</span>
            </button>
          </div>
        </div>

        {/* Scrollable PDF page canvas area */}
        <div className="flex-1 overflow-auto p-6 flex justify-center items-start">
          <div
            style={{ width: `${(820 * zoomLevel) / 100}px` }}
            className="transition-all duration-75 relative bg-white shadow-xl rounded-sm border border-stone-300"
          >
            {/* Page background image / canvas */}
            <div
              ref={pageContainerRef}
              onClick={handlePageClick}
              className={`relative w-full select-none ${
                activeTool ? 'cursor-crosshair ring-2 ring-amber-400' : 'cursor-default'
              }`}
              style={{
                paddingTop: `${(currentPageData?.aspectRatio || 1.414) * 100}%`,
              }}
            >
              {/* Background vector or real PDF image 1:1 */}
              {currentPageData?.dataUrl ? (
                <img
                  src={currentPageData.dataUrl}
                  alt={`Strona ${currentPage}`}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="absolute inset-0 w-full h-full pointer-events-none select-none">
                  <AdalFormBackground page={currentPage} />
                </div>
              )}

                {/* Overlaid Interactive Fields */}
                {pageFields.map((field) => {
                  const isSelected = field.id === selectedFieldId;

                  return (
                    <div
                      key={field.id}
                      onMouseDown={(e) => handleFieldMouseDown(e, field)}
                      style={{
                        left: `${field.x}%`,
                        top: `${field.y}%`,
                        width: `${field.width}%`,
                        height: `${field.height}%`,
                      }}
                      className={`absolute group cursor-move rounded transition-shadow ${
                        isSelected
                          ? 'border-2 border-amber-500 bg-amber-500/20 shadow-md ring-2 ring-amber-300/60 z-30'
                          : 'border border-dashed border-amber-600/70 bg-amber-200/20 hover:border-amber-500 hover:bg-amber-300/30 z-20'
                      }`}
                    >
                      {/* Field badge/label */}
                      <div className="absolute -top-5 left-0 bg-stone-900/90 text-white text-[10px] font-medium px-1.5 py-0.5 rounded shadow-xs whitespace-nowrap pointer-events-none flex items-center gap-1">
                        {field.type === 'checkbox' && <CheckSquare className="w-2.5 h-2.5 text-emerald-400" />}
                        {field.type === 'radio' && <Radio className="w-2.5 h-2.5 text-emerald-400" />}
                        {field.type === 'link' && <LinkIcon className="w-2.5 h-2.5 text-blue-400" />}
                        {field.type === 'text' && <Type className="w-2.5 h-2.5 text-amber-400" />}
                        {field.type === 'image' && <ImageIcon className="w-2.5 h-2.5 text-sky-400" />}
                        {field.type === 'signature' && <PenTool className="w-2.5 h-2.5 text-indigo-400" />}
                        {field.type === 'date' && <Calendar className="w-2.5 h-2.5 text-rose-400" />}
                        {field.type === 'textarea' && <Sliders className="w-2.5 h-2.5 text-purple-400" />}
                        <span>{field.label}</span>
                      </div>

                      {/* Content preview icon */}
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-600/80 font-medium select-none overflow-hidden px-1">
                        {field.type === 'checkbox' ? (
                          <div className="w-4 h-4 border border-stone-400 rounded-xs flex items-center justify-center text-stone-700 text-xs">
                            ✓
                          </div>
                        ) : field.type === 'radio' ? (
                          <div className="w-4 h-4 rounded-full border-2 border-stone-500 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-stone-700" />
                          </div>
                        ) : field.type === 'link' ? (
                          <span className="flex items-center gap-1 text-[10px] text-blue-600 font-semibold truncate">
                            <LinkIcon className="w-3 h-3 shrink-0" /> {field.linkUrl || field.label}
                          </span>
                        ) : field.type === 'image' ? (
                          <span className="flex items-center gap-1 text-[10px]">
                            <ImageIcon className="w-3.5 h-3.5" /> [Miejsce na foto]
                          </span>
                        ) : field.type === 'signature' ? (
                          <span className="flex items-center gap-1 text-[10px]">
                            <PenTool className="w-3.5 h-3.5" /> [Podpis]
                          </span>
                        ) : (
                          <span className="truncate italic text-[11px]">
                            {field.placeholder || field.label}
                          </span>
                        )}
                      </div>

                      {/* Resize handle & live dimensions on bottom of selected field */}
                      {isSelected && (
                        <>
                          <div className="absolute -bottom-5 left-0 bg-stone-900/90 text-amber-300 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs whitespace-nowrap pointer-events-none z-40 border border-stone-700">
                            W: {field.width}% × H: {field.height}%
                          </div>
                          <div
                            onMouseDown={(e) => handleResizeMouseDown(e, field)}
                            className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-600 rounded-full cursor-se-resize border-2 border-white shadow-xs z-40 hover:scale-125 transition-transform"
                            title="Przeciągnij, aby zmienić rozmiar okna"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Floating notification toast for Copy / Paste actions */}
      {designerNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-stone-700 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
          <span>{designerNotification}</span>
        </div>
      )}

      {/* Google Drive PDF Load Modal */}
      <GooglePdfLoadModal
        isOpen={isGoogleLoadOpen}
        onClose={() => setIsGoogleLoadOpen(false)}
        onPdfLoaded={(dataUrl, fileName, pages) => {
          setLocalPages(pages);
          const updated: FormTemplate = {
            ...template,
            fileName,
            pdfDataUrl: dataUrl,
            pageCount: pages.length,
            pageAspectRatios: pages.map((p) => p.aspectRatio),
            updatedAt: new Date().toISOString(),
          };
          onUpdateTemplate(updated);
          showNotification(
            `Wczytano plik PDF (${pages.length} str.). Kliknij "Zapisz formularz", aby zapisać na stałe.`
          );
        }}
      />

      {/* History Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        currentTemplate={template}
        onRestoreTemplate={(restored) => {
          onUpdateTemplate(restored);
          showNotification('Przywrócono wersję formularza z historii!');
        }}
      />
    </div>
  );
};
