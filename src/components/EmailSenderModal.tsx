import React, { useState, useEffect } from 'react';
import { Mail, Plus, Trash2, Check, ExternalLink, X, Send, Copy } from 'lucide-react';
import { FilledValues, FormField } from '../types';
import { RenderedPage } from '../utils/pdfHelper';

interface EmailSenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  values: FilledValues;
  fields: FormField[];
  renderedPages?: RenderedPage[];
  lang?: 'PL' | 'ENG';
}

const STORAGE_EMAIL_RECIPIENTS_KEY = 'adal_email_recipients_list_v2';
const OLD_SAMPLE_EMAILS = [
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
  lang = 'PL',
}) => {
  const isEng = lang === 'ENG';
  const [recipients, setRecipients] = useState<string[]>(() => {
    try {
      // Check v2 key first, then fallback to v1 filtering out samples
      const stored = localStorage.getItem(STORAGE_EMAIL_RECIPIENTS_KEY) || localStorage.getItem('adal_email_recipients_list_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(
            (e) => typeof e === 'string' && !OLD_SAMPLE_EMAILS.includes(e.trim().toLowerCase())
          );
          return cleaned;
        }
      }
    } catch {
      // fallback
    }
    return [];
  });

  const [selectedEmail, setSelectedEmail] = useState<string>('');
  const [newEmailInput, setNewEmailInput] = useState<string>('');
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Initialize selectedEmail
  useEffect(() => {
    if (recipients.length > 0) {
      if (!selectedEmail || !recipients.includes(selectedEmail)) {
        setSelectedEmail(recipients[0]);
      }
    } else {
      setSelectedEmail('');
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
      alert(
        isEng
          ? 'Please enter a valid email address (e.g. name@company.com)'
          : 'Proszę podać poprawny adres e-mail (np. imie@firma.pl)'
      );
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

  const titleSummary = company || contact || (isEng ? 'New Guest' : 'Nowy gość');
  const emailSubject = `Guest Book MAPIC 2026 - ${titleSummary}`;

  const emailBodyLines = [
    isEng ? `Hello,` : `Dzień dobry,`,
    ``,
    isEng
      ? `Here are the Guest Book Adal (MAPIC 2026) submission details:`
      : `Przesyłam formularz Guest Book Adal (MAPIC 2026):`,
    `--------------------------------------------------`,
    `${isEng ? 'Company' : 'Firma'}: ${company || '-'}`,
    `${isEng ? 'Contact Person' : 'Osoba kontaktowa'}: ${contact || '-'}`,
    `${isEng ? 'Country' : 'Kraj'}: ${countryVal || '-'}`,
    `${isEng ? 'Client Email' : 'E-mail klienta'}: ${emailVal || '-'}`,
    `${isEng ? 'Phone' : 'Telefon'}: ${phoneVal || '-'}`,
    `${isEng ? 'Entry Date' : 'Data wpisu'}: ${dateVal}`,
    `${isEng ? 'Project Budget' : 'Budżet projektu'}: ${budgetVal || '-'}`,
    `${isEng ? 'Deadline' : 'Termin (Deadline)'}: ${deadlineVal || '-'}`,
    ``,
    notesP1 ? `${isEng ? 'Notes (Page 1)' : 'Notatki (strona 1)'}:\n${notesP1}\n` : '',
    notesP2 ? `${isEng ? 'Notes (Page 2)' : 'Notatki (strona 2)'}:\n${notesP2}\n` : '',
    `--------------------------------------------------`,
    isEng ? `Best regards,\nAdal decorations Team` : `Pozdrawiamy,\nZespół Adal decorations`,
  ].filter(Boolean);

  const emailBody = emailBodyLines.join('\n');

  const mailtoUrl = selectedEmail
    ? `mailto:${encodeURIComponent(selectedEmail)}?subject=${encodeURIComponent(
        emailSubject
      )}&body=${encodeURIComponent(emailBody)}`
    : '';

  const handleCopyBody = async () => {
    try {
      const fullText = `Temat: ${emailSubject}\n\n${emailBody}`;
      await navigator.clipboard.writeText(fullText);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 3000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = `Temat: ${emailSubject}\n\n${emailBody}`;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 3000);
    }
  };

  const handleLaunchEmailClient = () => {
    if (!selectedEmail) {
      alert(isEng ? 'Please select or add a recipient email.' : 'Proszę wybrać lub dodać adres e-mail odbiorcy.');
      return;
    }

    // Direct link click which works reliably across iframes and mobile
    const link = document.createElement('a');
    link.href = mailtoUrl;
    link.target = '_top';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
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
              <h3 className="text-base font-bold text-stone-900">
                {isEng ? 'Send Form via Email' : 'Wyślij formularz e-mailem'}
              </h3>
              <p className="text-xs text-stone-500">
                {isEng
                  ? 'Select recipient from the list or add a new email address'
                  : 'Wybierz odbiorcę z listy lub dodaj nowy adres e-mail'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Recipient list */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              {isEng ? 'Select recipient from list:' : 'Wybierz odbiorcę z listy:'}
            </label>
            {recipients.length === 0 ? (
              <div className="py-5 px-4 text-center rounded-xl border border-dashed border-stone-300 bg-stone-50/60">
                <Mail className="w-6 h-6 mx-auto text-stone-400 mb-1" />
                <p className="text-xs text-stone-700 font-medium">
                  {isEng ? 'No saved email addresses' : 'Brak zapisanych adresów e-mail'}
                </p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  {isEng ? 'Enter an address below and click Add' : 'Wpisz adres poniżej i kliknij Dodaj'}
                </p>
              </div>
            ) : (
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
                        title={isEng ? 'Remove email from list' : 'Usuń adres z listy'}
                        className="text-stone-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add new email input */}
          <form onSubmit={handleAddEmail} className="pt-1">
            <label className="text-xs font-semibold text-stone-600 mb-1 block">
              {isEng ? '+ Add new email address to list:' : '+ Dodaj nowy adres e-mail do listy:'}
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder={isEng ? 'e.g. your-email@company.com' : 'np. twoj-mail@firma.pl'}
                value={newEmailInput}
                onChange={(e) => setNewEmailInput(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-stone-300 rounded-xl bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
              <button
                type="submit"
                className="px-3.5 py-2 text-xs font-semibold bg-stone-800 hover:bg-stone-900 text-white rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isEng ? 'Add' : 'Dodaj'}</span>
              </button>
            </div>
          </form>

          {/* Summary preview */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                {isEng ? 'Dispatch summary:' : 'Podsumowanie wysyłki:'}
              </span>
              <button
                type="button"
                onClick={handleCopyBody}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-stone-600 bg-white border border-stone-200 hover:bg-stone-100 rounded-md transition-all cursor-pointer shadow-2xs"
                title={isEng ? 'Copy prepared email text' : 'Skopiuj przygotowany tekst wiadomości'}
              >
                {copiedNotification ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                    <span className="text-emerald-700 font-semibold">{isEng ? 'Copied!' : 'Skopiowano!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-stone-500" />
                    <span>{isEng ? 'Copy text' : 'Kopiuj treść'}</span>
                  </>
                )}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-stone-700">
              <div>
                <span className="text-stone-400">{isEng ? 'To:' : 'Do:'}</span>{' '}
                <strong className="font-mono text-stone-900">{selectedEmail || (isEng ? 'None selected' : 'Brak wyboru')}</strong>
              </div>
              <div>
                <span className="text-stone-400">{isEng ? 'Client:' : 'Klient:'}</span>{' '}
                <strong>{company || contact || (isEng ? 'No data' : 'Brak danych')}</strong>
              </div>
            </div>
            <div className="text-[11px] text-stone-500 pt-0.5">
              {isEng
                ? 'Clicking "Send email" opens your mail app with recipient, subject, and client details pre-filled (without downloading file).'
                : 'Kliknięcie przycisku uruchamia Twój program pocztowy z wypełnionym adresem, tematem oraz danymi klienta (bez pobierania pliku na dysk).'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
          >
            {isEng ? 'Cancel' : 'Anuluj'}
          </button>
          
          {selectedEmail ? (
            <a
              href={mailtoUrl}
              target="_top"
              rel="noopener noreferrer"
              onClick={() => {
                setTimeout(() => onClose(), 800);
              }}
              className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md inline-flex items-center gap-2 transition-all cursor-pointer text-center"
            >
              <Send className="w-4 h-4" />
              <span>{isEng ? 'Send email' : 'Wyślij e-mail'}</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={handleLaunchEmailClient}
              disabled={true}
              className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 opacity-50 rounded-xl shadow-md inline-flex items-center gap-2 cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span>{isEng ? 'Send email' : 'Wyślij e-mail'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
