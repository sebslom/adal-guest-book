import React, { useState, useEffect } from 'react';
import { Mail, Plus, Trash2, Check, Download, ExternalLink, X, Send } from 'lucide-react';
import { FilledValues, FormField } from '../types';
import { generateAdalGuestBookPdf } from '../utils/adalPdfExporter';
import { RenderedPage, generateFilledPdf } from '../utils/pdfHelper';

interface EmailSenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  values: FilledValues;
  fields: FormField[];
  renderedPages?: RenderedPage[];
}

const STORAGE_EMAIL_RECIPIENTS_KEY = 'adal_email_recipients_list_v1';
const DEFAULT_EMAILS = [
  'biuro@adal-decorations.pl',
  'sales@adal-decorations.pl',
  'targi@adal.pl',
];

export const EmailSenderModal: React.FC<EmailSenderModalProps> = ({
  isOpen,
  onClose,
  values,
  fields,
  renderedPages,
}) => {
  const [recipients, setRecipients] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_EMAIL_RECIPIENTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_EMAILS;
  });

  const [selectedEmail, setSelectedEmail] = useState<string>('');
  const [newEmailInput, setNewEmailInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Initialize selectedEmail
  useEffect(() => {
    if (recipients.length > 0 && (!selectedEmail || !recipients.includes(selectedEmail))) {
      setSelectedEmail(recipients[0]);
    }
  }, [recipients, selectedEmail]);

  // Save recipients to localStorage
  const saveRecipientsList = (list: string[]) => {
    setRecipients(list);
    try {
      localStorage.setItem(STORAGE_EMAIL_RECIPIENTS_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save email recipients', e);
    }
  };

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newEmailInput.trim().toLowerCase();
    if (!clean) return;

    if (!clean.includes('@') || !clean.includes('.')) {
      alert('Proszę podać poprawny adres e-mail (np. imie@firma.pl)');
      return;
    }

    if (recipients.includes(clean)) {
      setSelectedEmail(clean);
      setNewEmailInput('');
      return;
    }

    const updated = [...recipients, clean];
    saveRecipientsList(updated);
    setSelectedEmail(clean);
    setNewEmailInput('');
  };

  const handleDeleteEmail = (emailToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (recipients.length <= 1) {
      alert('Lista musi zawierać przynajmniej jeden adres e-mail.');
      return;
    }
    const updated = recipients.filter((e) => e !== emailToDelete);
    saveRecipientsList(updated);
    if (selectedEmail === emailToDelete) {
      setSelectedEmail(updated[0] || '');
    }
  };

  if (!isOpen) return null;

  const company = String(values['p1_company_name'] || '').trim();
  const contact = String(values['p1_contact_person'] || '').trim();
  const emailVal = String(values['p1_email'] || '').trim();
  const phoneVal = String(values['p1_phone'] || '').trim();
  const countryVal = String(values['p1_country'] || '').trim();
  const dateVal = String(values['p1_date'] || new Date().toISOString().slice(0, 10)).trim();
  const budgetVal = String(values['p2_budget'] || '').trim();
  const deadlineVal = String(values['p2_deadline'] || '').trim();
  const notesP1 = String(values['p1_notes'] || '').trim();
  const notesP2 = String(values['p2_notes'] || '').trim();

  const titleSummary = company || contact || 'Nowy gość';
  const emailSubject = `Guest Book MAPIC 2026 - ${titleSummary}`;

  const emailBodyLines = [
    `Dzień dobry,`,
    ``,
    `Przesyłam formularz Guest Book Adal (MAPIC 2026):`,
    `--------------------------------------------------`,
    `Firma: ${company || '-' }`,
    `Osoba kontaktowa: ${contact || '-'}`,
    `Kraj: ${countryVal || '-'}`,
    `E-mail klienta: ${emailVal || '-'}`,
    `Telefon: ${phoneVal || '-'}`,
    `Data wpisu: ${dateVal}`,
    `Budżet projektu: ${budgetVal || '-'}`,
    `Termin (Deadline): ${deadlineVal || '-'}`,
    ``,
    notesP1 ? `Notatki (strona 1):\n${notesP1}\n` : '',
    notesP2 ? `Notatki (strona 2):\n${notesP2}\n` : '',
    `--------------------------------------------------`,
    `Plik PDF formularza został wygenerowany.`,
    `Pozdrawiamy,`,
    `Zespół Adal decorations`,
  ].filter(Boolean);

  const emailBody = emailBodyLines.join('\n');

  const handleSendEmail = async () => {
    if (!selectedEmail) {
      alert('Proszę wybrać odbiorcę z listy.');
      return;
    }

    try {
      setIsGenerating(true);
      setStatusMessage('Generowanie pliku PDF 1:1...');

      let fileName: string;

      if (renderedPages && renderedPages.length > 0) {
        const dateStr = (values['p1_date'] || new Date().toISOString().slice(0, 10))
          .toString()
          .replace(/[^0-9-.]/g, '');
        const companyRaw = (values['p1_company_name'] || values['field_client_info'] || 'Gosc')
          .toString()
          .trim();
        const companyClean = companyRaw.replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ_-]/g, '_').slice(0, 25);
        fileName = `Adal_GuestBook_2026_${companyClean || 'Firma'}_${dateStr}.pdf`;

        const result = await generateFilledPdf(renderedPages, fields, values);
        const a = document.createElement('a');
        a.href = result.dataUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        const generated = await generateAdalGuestBookPdf(values, fields);
        fileName = generated.fileName;
        generated.doc.save(fileName);
      }

      // Open mailto link
      const mailtoUrl = `mailto:${encodeURIComponent(selectedEmail)}?subject=${encodeURIComponent(
        emailSubject
      )}&body=${encodeURIComponent(emailBody)}`;

      setStatusMessage(`Pobrano plik "${fileName}". Otwieranie programu pocztowego...`);

      setTimeout(() => {
        window.location.href = mailtoUrl;
        setIsGenerating(false);
      }, 700);
    } catch (err) {
      console.error(err);
      setIsGenerating(false);
      setStatusMessage('Wystąpił błąd podczas generowania pliku.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Wyślij formularz e-mailem</h3>
              <p className="text-xs text-stone-500">
                Wybierz odbiorcę z listy lub dodaj nowy adres e-mail
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Recipient list */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              Wybierz odbiorcę z listy:
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {recipients.map((email) => {
                const isSelected = selectedEmail === email;
                return (
                  <div
                    key={email}
                    onClick={() => setSelectedEmail(email)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'border-amber-600 bg-amber-50/80 text-amber-950 font-semibold shadow-2xs'
                        : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-amber-600 bg-amber-600 text-white'
                            : 'border-stone-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span className="truncate font-mono">{email}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteEmail(email, e)}
                      title="Usuń adres z listy"
                      className="text-stone-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add new email input */}
          <form onSubmit={handleAddEmail} className="pt-1">
            <label className="text-xs font-semibold text-stone-600 mb-1 block">
              + Dodaj nowy adres e-mail do listy:
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="np. klient@firma.pl lub manager@adal.pl"
                value={newEmailInput}
                onChange={(e) => setNewEmailInput(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-stone-300 rounded-xl bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
              <button
                type="submit"
                className="px-3 py-2 text-xs font-semibold bg-stone-800 hover:bg-stone-900 text-white rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Dodaj</span>
              </button>
            </div>
          </form>

          {/* Summary preview */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1.5">
            <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
              Podsumowanie wysyłki:
            </div>
            <div className="grid grid-cols-2 gap-2 text-stone-700">
              <div>
                <span className="text-stone-400">Do:</span>{' '}
                <strong className="font-mono text-stone-900">{selectedEmail || 'Brak wyboru'}</strong>
              </div>
              <div>
                <span className="text-stone-400">Klient:</span>{' '}
                <strong>{company || contact || 'Brak danych'}</strong>
              </div>
            </div>
            <div className="text-[11px] text-stone-500 pt-1">
              Kliknięcie przycisku poniżej zapisze plik PDF na dysku urządzenia oraz uruchomi
              aplikację pocztową z przygotowanym tematem i treścią wiadomości.
            </div>
          </div>

          {statusMessage && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200 rounded-xl transition-colors"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={handleSendEmail}
            disabled={isGenerating || !selectedEmail}
            className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{isGenerating ? 'Przygotowywanie...' : 'Wyślij e-mail i zapisz PDF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
