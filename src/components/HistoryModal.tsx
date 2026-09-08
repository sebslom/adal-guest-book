import React from 'react';
import { X, Clock, Trash2, Download, RefreshCw, FileText, CheckCircle2 } from 'lucide-react';
import { SavedSubmission } from '../types';
import { deleteSubmission } from '../utils/storage';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: SavedSubmission[];
  onRefresh: () => void;
  onRestoreSubmission: (submission: SavedSubmission) => void;
  onDownloadSubmissionPdf: (submission: SavedSubmission) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  submissions,
  onRefresh,
  onRestoreSubmission,
  onDownloadSubmissionPdf,
}) => {
  if (!isOpen) return null;

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Czy na pewno chcesz usunąć tę kopię z historii?')) {
      deleteSubmission(id);
      onRefresh();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-stone-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="font-semibold text-stone-900">Historia wypełnionych arkuszy</h3>
              <p className="text-xs text-stone-500">Zapisane wersje na tym urządzeniu (nie nadpisują szablonu)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-3">
          {submissions.length === 0 ? (
            <div className="text-center py-12 px-4 text-stone-400">
              <FileText className="w-12 h-12 mx-auto mb-3 stroke-1 text-stone-300" />
              <p className="text-base font-medium text-stone-600">Brak zapisanych arkuszy</p>
              <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                Każdy formularz po kliknięciu &quot;Zapisz na dysku&quot; zostanie zarchiwizowany tutaj z unikalną nazwą i sygnaturą czasową.
              </p>
            </div>
          ) : (
            submissions.map((sub) => {
              const date = new Date(sub.submittedAt);
              const formattedDate = date.toLocaleDateString('pl-PL', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={sub.id}
                  className="p-4 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-stone-900 text-sm truncate">
                        {sub.fileName}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Zapisano
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formattedDate} • Szablon: {sub.templateName}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onRestoreSubmission(sub);
                        onClose();
                      }}
                      title="Wczytaj dane do formularza"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 transition-colors shadow-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                      Wczytaj dane
                    </button>

                    <button
                      type="button"
                      onClick={() => onDownloadSubmissionPdf(sub)}
                      title="Pobierz ten PDF"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Pobierz
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDelete(sub.id, e)}
                      title="Usuń z historii"
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 bg-stone-50 border-t border-stone-200 text-xs text-stone-500">
          <span>Łącznie w historii: {submissions.length}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 transition-colors"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
