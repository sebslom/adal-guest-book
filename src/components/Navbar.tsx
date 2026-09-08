import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Tablet,
  Sliders,
  HelpCircle,
  Download,
  ChevronDown,
  Plus,
  Info,
  X,
  Lock,
  Unlock,
  Trash2,
  ExternalLink,
  Link2,
} from 'lucide-react';
import { FormTemplate } from '../types';
import { PasswordModal } from './PasswordModal';
import { DeleteTemplateModal } from './DeleteTemplateModal';
import { isDesignerAuthenticated, setDesignerAuthenticated } from '../utils/idbStorage';

interface NavbarProps {
  currentMode: 'designer' | 'filler';
  onToggleMode: (mode: 'designer' | 'filler') => void;
  templates: FormTemplate[];
  activeTemplate: FormTemplate;
  onSelectTemplate: (template: FormTemplate) => void;
  onOpenLoadModal: (mode: 'link' | 'disk') => void;
  onDeleteTemplate: (templateId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentMode,
  onToggleMode,
  templates,
  activeTemplate,
  onSelectTemplate,
  onOpenLoadModal,
  onDeleteTemplate,
}) => {
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<FormTemplate | null>(null);
  const [padlockClicks, setPadlockClicks] = useState(0);
  const padlockTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handlePadlockTripleClick = () => {
    setPadlockClicks((prev) => {
      const next = prev + 1;
      if (padlockTimeoutRef.current) {
        clearTimeout(padlockTimeoutRef.current);
      }

      if (next >= 3) {
        setIsPasswordModalOpen(true);
        return 0;
      }

      padlockTimeoutRef.current = setTimeout(() => {
        setPadlockClicks(0);
      }, 2500);

      return next;
    });
  };

  const handleLockDesigner = () => {
    setDesignerAuthenticated(false);
    onToggleMode('filler');
  };

  const handleExportTemplateJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activeTemplate, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${activeTemplate.name.replace(/\s+/g, '_')}_szablon.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <>
      <header className="h-[60px] bg-white border-b border-stone-200 px-3 sm:px-6 flex items-center justify-between z-40 relative shadow-2xs">
        {/* Left: App Logo & Template Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <Tablet className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-bold text-stone-900 leading-tight">Tablet PDF Form Studio</h1>
              <p className="text-[10px] text-stone-500 hidden sm:block">Wypełnianie i edycja dokumentów PDF</p>
            </div>
          </div>

          <div className="h-5 w-px bg-stone-200 mx-1 hidden sm:block" />

          {/* Template picker dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsTemplateDropdownOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200/80 rounded-xl transition-colors max-w-[160px] sm:max-w-xs truncate"
              title="Przełącz aktywny dokument PDF"
            >
              <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate">{activeTemplate.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            </button>

            {isTemplateDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-80 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-50 animate-fadeIn">
                <div className="px-3 py-1 text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Zapisane szablony ({templates.length})</span>
                  <span className="text-[10px] text-emerald-600 font-normal">Autozapis w urządzeniu</span>
                </div>

                <div className="max-h-64 overflow-y-auto py-1 divide-y divide-stone-50">
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className={`px-3 py-2 flex items-center justify-between hover:bg-stone-50 transition-colors ${
                        tpl.id === activeTemplate.id ? 'bg-amber-50/60 font-medium' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTemplate(tpl);
                          setIsTemplateDropdownOpen(false);
                        }}
                        className="text-left text-xs truncate flex-1 pr-2"
                      >
                        <p className={`truncate ${tpl.id === activeTemplate.id ? 'font-bold text-amber-950' : 'text-stone-800'}`}>
                          {tpl.name}
                        </p>
                        <p className="text-[10px] text-stone-400">
                          {tpl.fields.length} pól • {tpl.pageCount} {tpl.pageCount === 1 ? 'strona' : 'stron'}
                        </p>
                      </button>

                      {/* Delete template button (only allowed if more than 1 template exists) */}
                      {templates.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTemplateToDelete(tpl);
                          }}
                          className="p-1 text-stone-400 hover:text-rose-600 rounded-md transition-colors"
                          title="Usuń ten szablon"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="border-t border-stone-100 mt-1 pt-1.5 px-2 flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsTemplateDropdownOpen(false);
                      onOpenLoadModal('link');
                    }}
                    className="w-full py-1.5 px-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    Załaduj nowy PDF z linku Google Drive
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTemplateDropdownOpen(false);
                      onOpenLoadModal('disk');
                    }}
                    className="w-full py-1.5 px-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Załaduj nowy PDF z dysku
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center / Right: Mode Switcher & Designer Lock */}
        <div className="flex items-center gap-2">
          {currentMode === 'designer' ? (
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">Tryb Projektanta (Edycja pól)</span>
              </span>

              <button
                type="button"
                onClick={() => onToggleMode('filler')}
                className="px-3 py-1.5 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Tablet className="w-3.5 h-3.5 text-amber-400" />
                <span>Wróć do wypełniania na tablecie</span>
              </button>

              <button
                type="button"
                onClick={handleLockDesigner}
                className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors"
                title="Zablokuj tryb projektanta (wymaga ponownego hasła)"
              >
                <Lock className="w-4 h-4 text-stone-600" />
              </button>

              <button
                type="button"
                onClick={handleExportTemplateJson}
                className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors hidden md:block"
                title="Eksportuj szablon jako plik JSON"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center">
              {/* Only the padlock in top-right corner - requires 3 clicks to open password modal */}
              <button
                type="button"
                onClick={handlePadlockTripleClick}
                className="relative p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-all active:scale-95"
                title="Kłódka (kliknij 3 razy, aby przejść do edycji)"
                aria-label="Kłódka edycji"
              >
                <Lock
                  className={`w-5 h-5 transition-colors ${
                    padlockClicks > 0 ? 'text-amber-600 scale-105' : 'text-stone-600'
                  }`}
                />
                {padlockClicks > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs animate-bounce">
                    {padlockClicks}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Password Modal */}
      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={() => onToggleMode('designer')}
      />

      {/* Delete Template Modal */}
      {templateToDelete && (
        <DeleteTemplateModal
          isOpen={Boolean(templateToDelete)}
          templateName={templateToDelete.name}
          onClose={() => setTemplateToDelete(null)}
          onConfirm={() => {
            if (templateToDelete) {
              onDeleteTemplate(templateToDelete.id);
              setTemplateToDelete(null);
            }
          }}
        />
      )}

      {/* Instruction & Help Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-stone-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-stone-900">Instrukcja obsługi formularza</h3>
              </div>
              <button
                onClick={() => setIsHelpOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-stone-600 leading-relaxed max-h-[70vh] overflow-y-auto">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <p className="font-semibold text-amber-900">
                  Gotowe do pracy na tablecie w terenie lub biurze:
                </p>
                <p className="text-amber-800">
                  Główny ekran to wygodny widok tabletu z formularzem. Każdy wpis można pobrać jako nowy plik PDF, wysłać mailem lub wyczyścić arkusz dla kolejnego klienta bez niszczenia szablonu.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-stone-100 text-stone-900 font-bold flex items-center justify-center shrink-0 border border-stone-300">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-stone-900">Wypełnianie na tablecie</h4>
                    <p className="mt-0.5">
                      Dotknij kratki aby wpisać tekst, zaznacz kwadraciki lub radio buttony, dotknij ramki aparatu by wgrać zdjęcie z kamery urządzenia i złóż podpis palcem lub rysikiem.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-stone-100 text-stone-900 font-bold flex items-center justify-center shrink-0 border border-stone-300">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-stone-900">Nowy formularz & Zapis na dysku</h4>
                    <p className="mt-0.5">
                      Przycisk <strong>&quot;Zapisz na dysku&quot;</strong> generuje nowy plik PDF ze znacznikiem daty i godziny. Przycisk <strong>&quot;Nowy formularz&quot;</strong> czyści wszystkie pola i przygotowuje czysty arkusz dla kolejnej osoby.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-stone-100 text-stone-900 font-bold flex items-center justify-center shrink-0 border border-stone-300">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-stone-900">Wczytywanie z linku Google Drive lub dysku</h4>
                    <p className="mt-0.5">
                      Możesz wkleić bezpośredni link z dysku Google lub załadować plik PDF z urządzenia. Zostanie on trwale zapamiętany w Twojej przeglądarce.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-stone-100 text-stone-900 font-bold flex items-center justify-center shrink-0 border border-stone-300">
                    4
                  </div>
                  <div>
                    <h4 className="font-semibold text-stone-900">Zabezpieczony Projektant Szablonu</h4>
                    <p className="mt-0.5">
                      Edycja i tworzenie pól wymaga podania hasła administratora. Pozwala na dodawanie tekstu, kwadracików, zdjęć, podpisów, linków i radio buttonów.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end px-6 py-3.5 bg-stone-50 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setIsHelpOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 rounded-xl hover:bg-amber-700 transition-colors"
              >
                Rozumiem
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
