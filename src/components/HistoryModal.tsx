import React, { useState, useEffect } from 'react';
import {
  History,
  X,
  RotateCcw,
  Trash2,
  Calendar,
  Layers,
  FileText,
  User,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { FormTemplate, SavedSubmission, TemplateHistoryEntry } from '../types';
import {
  idbGetTemplateHistory,
  idbDeleteTemplateHistory,
  idbClearAllTemplateHistory,
  idbGetSubmissions,
  idbDeleteSubmission,
  idbClearAllSubmissions,
  idbSaveTemplate,
  idbPruneTemplateHistoryKeepOnlyCurrent,
} from '../utils/idbStorage';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTemplate: FormTemplate;
  onRestoreTemplate: (restored: FormTemplate) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  currentTemplate,
  onRestoreTemplate,
}) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'submissions'>('templates');
  const [templateHistory, setTemplateHistory] = useState<TemplateHistoryEntry[]>([]);
  const [submissions, setSubmissions] = useState<SavedSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [hist, subs] = await Promise.all([
        idbGetTemplateHistory(),
        idbGetSubmissions(),
      ]);
      setTemplateHistory(hist);
      setSubmissions(subs);
    } catch (e) {
      console.error('Error loading history:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePruneHistory = async () => {
    try {
      const remaining = await idbPruneTemplateHistoryKeepOnlyCurrent();
      setTemplateHistory(remaining);
      setSuccessMessage('Usunięto wcześniejsze wersje. Pozostawiono tylko aktualną wersję!');
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (e) {
      console.error('Failed to prune history:', e);
    }
  };

  const handleClearAllTemplates = async () => {
    try {
      await idbClearAllTemplateHistory();
      setTemplateHistory([]);
      setSuccessMessage('Historia wersji formularza została całkowicie wyczyszczona!');
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (e) {
      console.error('Failed to clear template history:', e);
    }
  };

  const handleClearAllSubmissions = async () => {
    try {
      await idbClearAllSubmissions();
      setSubmissions([]);
      setSuccessMessage('Wszystkie zapisane wpisy gości zostały usunięte!');
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (e) {
      console.error('Failed to clear submissions:', e);
    }
  };

  const handleRestore = async (entry: TemplateHistoryEntry) => {
    const restored: FormTemplate = {
      id: entry.templateId || currentTemplate.id,
      name: entry.templateName || currentTemplate.name,
      fileName: entry.fileName || currentTemplate.fileName,
      pdfDataUrl: entry.pdfDataUrl !== undefined ? entry.pdfDataUrl : currentTemplate.pdfDataUrl,
      pageCount: entry.pageCount || currentTemplate.pageCount,
      pageAspectRatios: currentTemplate.pageAspectRatios,
      fields: JSON.parse(JSON.stringify(entry.fields || [])),
      createdAt: currentTemplate.createdAt,
      updatedAt: new Date().toISOString(),
    };

    await idbSaveTemplate(restored);
    onRestoreTemplate(restored);
    setSuccessMessage('Pomyślnie przywrócono wybraną wersję formularza!');
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1200);
  };

  const handleDeleteHistoryEntry = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await idbDeleteTemplateHistory(id);
      setTemplateHistory((prev) => prev.filter((h) => h.id !== id));
      setSuccessMessage('Wpis został usunięty z historii');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err) {
      console.error('Failed to delete history entry:', err);
    }
  };

  const handleDeleteSubmission = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await idbDeleteSubmission(id);
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      setSuccessMessage('Wpis gościa został usunięty');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err) {
      console.error('Failed to delete submission:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Historia formularza</h3>
              <p className="text-xs text-stone-500">
                Wersje szablonu oraz zapisane wpisy gości
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success toast inside modal */}
        {successMessage && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab selector and Actions */}
        <div className="flex items-center justify-between border-b border-stone-200 px-6 pt-2 bg-white">
          <div className="flex gap-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('templates')}
              className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'templates'
                  ? 'border-amber-600 text-amber-800'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Wersje formularza ({templateHistory.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('submissions')}
              className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'submissions'
                  ? 'border-amber-600 text-amber-800'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Wpisy gości ({submissions.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 mb-2">
            {activeTab === 'templates' && templateHistory.length > 1 && (
              <button
                type="button"
                onClick={handlePruneHistory}
                className="px-2.5 py-1 text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Usuń wcześniejsze wersje i pozostaw wyłącznie aktualną"
              >
                <Trash2 className="w-3.5 h-3.5 text-amber-700" />
                <span>Zostaw tylko aktualną</span>
              </button>
            )}

            {activeTab === 'templates' && templateHistory.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllTemplates}
                className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Usuń całą historię wersji"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Wyczyść całą historię</span>
              </button>
            )}

            {activeTab === 'submissions' && submissions.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllSubmissions}
                className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Wyczyść wszystkie zapisane wpisy gości"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Usuń wszystkie wpisy</span>
              </button>
            )}
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-stone-50/50">
          {isLoading ? (
            <div className="text-center py-12 text-stone-400 text-xs font-semibold">
              Ładowanie historii...
            </div>
          ) : activeTab === 'templates' ? (
            templateHistory.length === 0 ? (
              <div className="text-center py-12 text-stone-400 space-y-2">
                <Clock className="w-8 h-8 mx-auto stroke-1 text-stone-300" />
                <p className="text-sm font-semibold text-stone-600">Brak zapisanych wersji</p>
                <p className="text-xs text-stone-400">
                  Historia wersji jest pusta. Kliknięcie "Zapisz formularz" w projektancie utworzy aktualną wersję.
                </p>
              </div>
            ) : (
              templateHistory.map((entry, idx) => {
                const isCurrent = idx === 0;
                const dateObj = new Date(entry.savedAt);
                const dateFormatted = dateObj.toLocaleDateString('pl-PL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                });
                const timeFormatted = dateObj.toLocaleTimeString('pl-PL', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                return (
                  <div
                    key={entry.id}
                    className={`bg-white border rounded-xl p-4 shadow-2xs transition-all flex items-center justify-between gap-4 ${
                      isCurrent ? 'border-amber-400 ring-1 ring-amber-300/50' : 'border-stone-200'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-900">
                          {dateFormatted}, {timeFormatted}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">
                            Aktywna wersja
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-stone-500">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-stone-400" />
                          <span>{entry.fileName || 'Adal_GuestBook_2026.pdf'}</span>
                        </span>
                        <span>•</span>
                        <span>{entry.fieldCount} pól interaktywnych</span>
                        <span>•</span>
                        <span>{entry.pageCount} str.</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRestore(entry)}
                        className="px-3 py-1.5 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Przywróć ten stan formularza"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Przywróć</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteHistoryEntry(entry.id, e)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Usuń wpis z historii"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )
          ) : submissions.length === 0 ? (
            <div className="text-center py-12 text-stone-400 space-y-2">
              <User className="w-8 h-8 mx-auto stroke-1 text-stone-300" />
              <p className="text-sm font-semibold text-stone-600">Brak wypełnionych formularzy gości</p>
              <p className="text-xs text-stone-400">
                Gdy goście wypełnią kartę i zapiszą ją na dysku, pojawi się ona na tej liście.
              </p>
            </div>
          ) : (
            submissions.map((sub) => {
              const dateObj = new Date(sub.submittedAt);
              const dateStr = dateObj.toLocaleDateString('pl-PL') + ' ' + dateObj.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
              const client =
                sub.values['p1_company_name'] ||
                sub.values['field_client_info'] ||
                sub.values['p1_company_address'] ||
                'Gość';

              return (
                <div
                  key={sub.id}
                  className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-stone-500" />
                      <span>{client as string}</span>
                    </p>
                    <div className="flex items-center gap-3 text-xs text-stone-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <span>{dateStr}</span>
                      </span>
                      <span>•</span>
                      <span className="truncate max-w-[200px]">{sub.fileName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSubmission(sub.id, e)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Usuń wpis"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs text-stone-500">
          <span>Zmiany są trwale zapamiętane w pamięci urządzenia.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
