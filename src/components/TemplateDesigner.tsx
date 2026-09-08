import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Type,
  CheckSquare,
  Image as ImageIcon,
  PenTool,
  Calendar,
  Trash2,
  Copy,
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
} from 'lucide-react';
import { FormField, FormTemplate, FieldType } from '../types';
import { RenderedPage } from '../utils/pdfHelper';

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

  const pageContainerRef = useRef<HTMLDivElement | null>(null);

  const currentPageData = renderedPages.find((p) => p.pageNumber === currentPage) || renderedPages[0];
  const pageFields = template.fields.filter((f) => f.page === currentPage);
  const selectedField = template.fields.find((f) => f.id === selectedFieldId);

  // Keyboard navigation & delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFieldId) {
        // Only if not focused in an input
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          handleDeleteField(selectedFieldId);
        }
      }
      if (e.key === 'Escape') {
        setActiveTool(null);
        setSelectedFieldId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFieldId]);

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
                  <Sliders className="w-3.5 h-3.5 text-amber-600" /> Właściwości pola
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleDuplicateField(selectedField)}
                    title="Duplikuj pole"
                    className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteField(selectedField.id)}
                    title="Usuń pole"
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

              {/* Geometry coordinates */}
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2 text-xs">
                <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                  Położenie i rozmiar (% strony)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-stone-500">Szerokość: {selectedField.width}%</label>
                    <input
                      type="range"
                      min="2"
                      max="95"
                      step="0.5"
                      value={selectedField.width}
                      onChange={(e) => updateSelectedFieldProps({ width: parseFloat(e.target.value) })}
                      className="w-full accent-amber-600"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-stone-500">Wysokość: {selectedField.height}%</label>
                    <input
                      type="range"
                      min="1"
                      max="60"
                      step="0.5"
                      value={selectedField.height}
                      onChange={(e) => updateSelectedFieldProps({ height: parseFloat(e.target.value) })}
                      className="w-full accent-amber-600"
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDeleteField(selectedField.id)}
                className="w-full py-2 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Usuń to pole
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
            onClick={onSwitchToFiller}
            className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <FileCheck className="w-4 h-4" />
            Przejdź do trybu tabletu (Wypełnianie)
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
          </div>
        </div>

        {/* Scrollable PDF page canvas area */}
        <div className="flex-1 overflow-auto p-6 flex justify-center items-start">
          <div
            style={{ width: `${(820 * zoomLevel) / 100}px` }}
            className="transition-all duration-75 relative bg-white shadow-xl rounded-sm border border-stone-300"
          >
            {/* Page background image / canvas */}
            {currentPageData ? (
              <div
                ref={pageContainerRef}
                onClick={handlePageClick}
                className={`relative w-full select-none ${
                  activeTool ? 'cursor-crosshair ring-2 ring-amber-400' : 'cursor-default'
                }`}
                style={{
                  paddingTop: `${(currentPageData.aspectRatio || 1.414) * 100}%`,
                }}
              >
                {/* Background image */}
                <img
                  src={currentPageData.dataUrl}
                  alt={`Strona ${currentPage}`}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  referrerPolicy="no-referrer"
                />

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

                      {/* Resize handle on bottom right */}
                      {isSelected && (
                        <div
                          onMouseDown={(e) => handleResizeMouseDown(e, field)}
                          className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-600 rounded-full cursor-se-resize border-2 border-white shadow-xs z-40 hover:scale-125 transition-transform"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center text-stone-400">Ładowanie strony PDF...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
