import React, { useState } from 'react';
import { X, Mail, Copy, Check, Download, ExternalLink, Paperclip } from 'lucide-react';
import { FormField, FilledValues } from '../types';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateName: string;
  fields: FormField[];
  values: FilledValues;
  onDownloadPdf: () => void;
  generatedFileName: string;
}

export const EmailModal: React.FC<EmailModalProps> = ({
  isOpen,
  onClose,
  templateName,
  fields,
  values,
  onDownloadPdf,
  generatedFileName,
}) => {
  const [recipient, setRecipient] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Build summary message
  const dateStr = new Date().toLocaleDateString('pl-PL');
  const timeStr = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

  const summaryLines: string[] = [];
  summaryLines.push(`Dzień dobry,\n\nPrzesyłam wypełniony arkusz: ${templateName}`);
  summaryLines.push(`Data sporządzenia: ${dateStr}, godz. ${timeStr}\n`);
  summaryLines.push('--- PODSUMOWANIE DANYCH ---');

  fields.forEach((field) => {
    const val = values[field.id];
    if (field.type === 'checkbox') {
      const isChecked = Boolean(val ?? field.defaultValue);
      summaryLines.push(`• [${isChecked ? 'TAK' : 'NIE'}] ${field.label}`);
    } else if (field.type === 'image') {
      summaryLines.push(`• ${field.label}: ${val ? '[Dołączono zdjęcie]' : '[Brak zdjęcia]'}`);
    } else if (field.type === 'signature') {
      summaryLines.push(`• ${field.label}: ${val ? '[Złożono podpis]' : '[Brak podpisu]'}`);
    } else if (val) {
      summaryLines.push(`• ${field.label}: ${val}`);
    }
  });

  summaryLines.push('\nW załączniku znajduje się wygenerowany plik PDF z dokumentacją.');
  summaryLines.push(`Nazwa pliku: ${generatedFileName}`);

  const emailBody = summaryLines.join('\n');
  const emailSubject = `Wypełniony formularz: ${templateName} (${dateStr})`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${emailSubject}\n\n${emailBody}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenMailClient = () => {
    const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(
      emailSubject
    )}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailtoUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-stone-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-stone-900">Wysyłka formularza e-mailem</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
              Adresat e-mail (opcjonalnie)
            </label>
            <input
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="np. biuro@firma.pl, kierownik@twojafirma.pl"
              className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
              Temat wiadomości
            </label>
            <input
              type="text"
              readOnly
              value={emailSubject}
              className="w-full px-3.5 py-2 text-sm border border-stone-200 rounded-xl bg-stone-100 text-stone-700"
            />
          </div>

          {/* Quick attachment card */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Paperclip className="w-5 h-5 text-amber-700 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-900">Gotowy plik PDF</p>
                <p className="text-xs text-amber-700 truncate max-w-xs">{generatedFileName}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-200/80 hover:bg-amber-300 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Pobierz PDF
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                Podgląd treści wiadomości
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800 font-medium"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-semibold">Skopiowano!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Kopiuj treść</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              readOnly
              rows={6}
              value={emailBody}
              className="w-full px-3.5 py-2 text-xs font-mono border border-stone-200 rounded-xl bg-stone-50 text-stone-700 resize-none"
            />
            <p className="text-[11px] text-stone-500 mt-1">
              * Ze względów bezpieczeństwa przeglądarki plik PDF należy zapisać na dysku i załączyć do tworzonego e-maila.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-stone-50 border-t border-stone-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 transition-colors"
          >
            Zamknij
          </button>
          <button
            type="button"
            onClick={handleOpenMailClient}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 shadow-xs transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Otwórz pocztę (Mail)
          </button>
        </div>
      </div>
    </div>
  );
};
