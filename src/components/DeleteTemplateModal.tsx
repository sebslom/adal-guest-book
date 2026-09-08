import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface DeleteTemplateModalProps {
  isOpen: boolean;
  templateName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteTemplateModal: React.FC<DeleteTemplateModalProps> = ({
  isOpen,
  templateName,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-rose-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/15 text-rose-700 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900">Usuń szablon PDF</h2>
              <p className="text-[11px] text-stone-500">Trwałe usunięcie z pamięci urządzenia</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-stone-600 leading-relaxed">
            Czy na pewno chcesz bezpowrotnie usunąć szablon <strong className="text-stone-900">"{templateName}"</strong> wraz ze wszystkimi zdefiniowanymi polami?
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Usuń szablon</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
