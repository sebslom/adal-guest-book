import React, { useState, useEffect } from 'react';
import { Mail, Plus, Trash2, Check, X, Send, Loader2 } from 'lucide-react';
import { FilledValues, FormField } from '../types';
import { RenderedPage, generateFilledPdf } from '../utils/pdfHelper';
import { generateAdalGuestBookPdf } from '../utils/adalPdfExporter';

interface EmailSenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  values: FilledValues;
  fields: FormField[];
  renderedPages?: RenderedPage[];
  lang?: 'PL' | 'ENG';
}

const STORAGE_EMAIL_RECIPIENTS_KEY = 'adal_email_recipients_list_v2';
const DEFAULT_EMAIL = 's.slomnicki@perfect-light.pl';

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
      const stored = localStorage.getItem(STORAGE_EMAIL_RECIPIENTS_KEY) || localStorage.getItem('adal_email_recipients_list_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(
            (e) => typeof e === 'string' && e.trim().toLowerCase() !== DEFAULT_EMAIL && e.includes('@')
          );
          return [DEFAULT_EMAIL, ...cleaned];
        }
      }
    } catch {
      // fallback
    }
    return [DEFAULT_EMAIL];
  });

  const [selectedEmail, setSelectedEmail] = useState<string>(DEFAULT_EMAIL);
  const [newEmailInput, setNewEmailInput] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  // Always make sure DEFAULT_EMAIL is in the list and selected by default
  useEffect(() => {
    if (!recipients.includes(DEFAULT_EMAIL)) {
      setRecipients((prev) => [DEFAULT_EMAIL, ...prev]);
    }
    if (!selectedEmail) {
      setSelectedEmail(DEFAULT_EMAIL);
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
    if (emailToDelete === DEFAULT_EMAIL) return; // Cannot delete default email
    const updated = recipients.filter((e) => e !== emailToDelete);
    saveRecipientsList(updated);
    if (selectedEmail === emailToDelete) {
      setSelectedEmail(DEFAULT_EMAIL);
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

  const handleSend = async () => {
    if (!selectedEmail) {
      alert(isEng ? 'Please select a recipient.' : 'Proszę wybrać odbiorcę.');
      return;
    }

    setIsSending(true);

    try {
      // 1. Generate & download the filled PDF file so user has the attachment ready
      try {
        let blob: Blob;
        if (renderedPages && renderedPages.length > 0) {
          const result = await generateFilledPdf(renderedPages, fields, values);
          blob = result.blob;
        } else {
          const result = await generateAdalGuestBookPdf(values, fields);
          blob = result.blob;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const safeName = company ? company.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Formularz';
        link.download = `2026_Targi_MAPIC_GuestBook_Adal_02_${safeName}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      } catch (pdfErr) {
        console.warn('PDF export error:', pdfErr);
      }

      // 2. Copy email body text to clipboard as convenience
      try {
        await navigator.clipboard.writeText(`Temat: ${emailSubject}\n\n${emailBody}`);
      } catch {
        // ignore
      }

      // 3. Open email client with recipient, subject and body
      const mailLink = document.createElement('a');
      mailLink.href = mailtoUrl;
      mailLink.target = '_top';
      mailLink.rel = 'noopener noreferrer';
      document.body.appendChild(mailLink);
      mailLink.click();
      mailLink.remove();

      // 4. If webhook URL exists in storage, also send payload silently in background
      try {
        const webhookUrl = localStorage.getItem('adal_email_webhook_url_v1');
        if (webhookUrl) {
          fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipient: selectedEmail,
              subject: emailSubject,
              body: emailBody,
              company,
              contact,
              email: emailVal,
              phone: phoneVal,
              country: countryVal,
              date: dateVal,
              budget: budgetVal,
              deadline: deadlineVal,
              timestamp: new Date().toISOString(),
            }),
          }).catch(() => {});
        }
      } catch {
        // ignore
      }

      setIsSent(true);
      setTimeout(() => {
        setIsSent(false);
        setIsSending(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Send error:', err);
      setIsSending(false);
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
              <h3 className="text-base font-bold text-stone-900">
                {isEng ? 'Send Form via Email' : 'Wyślij formularz e-mailem'}
              </h3>
              <p className="text-xs text-stone-500">
                {isEng ? 'Select recipient from the list' : 'Wybierz odbiorcę z listy'}
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
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Recipient list */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              {isEng ? 'To (select from list):' : 'Do kogo (wybierz z listy):'}
            </label>

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {recipients.map((email) => {
                const isSelected = selectedEmail === email;
                const isDefault = email === DEFAULT_EMAIL;

                return (
                  <div
                    key={email}
                    onClick={() => setSelectedEmail(email)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'border-amber-600 bg-amber-50/90 text-amber-950 font-semibold shadow-2xs'
                        : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'border-amber-600 bg-amber-600 text-white'
                            : 'border-stone-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span className="truncate font-mono">{email}</span>
                      {isDefault && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-200/70 text-amber-900 rounded font-sans font-bold">
                          {isEng ? 'Default' : 'Domyślny'}
                        </span>
                      )}
                    </div>

                    {!isDefault && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteEmail(email, e)}
                        title={isEng ? 'Remove email from list' : 'Usuń adres z listy'}
                        className="text-stone-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add new email input */}
          <form onSubmit={handleAddEmail} className="pt-0.5">
            <div className="flex gap-2">
              <input
                type="email"
                placeholder={isEng ? 'Add another email address...' : 'Dodaj inny adres e-mail...'}
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
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1.5">
            <div className="flex justify-between text-stone-500 text-[11px]">
              <span>{isEng ? 'Recipient:' : 'Wybrany odbiorca:'}</span>
              <strong className="text-stone-900 font-mono">{selectedEmail || '-'}</strong>
            </div>
            <div className="flex justify-between text-stone-500 text-[11px]">
              <span>{isEng ? 'Subject:' : 'Temat:'}</span>
              <span className="text-stone-800 font-medium truncate max-w-[280px]">{emailSubject}</span>
            </div>
            <div className="flex justify-between text-stone-500 text-[11px]">
              <span>{isEng ? 'Client / Company:' : 'Firma / Gość:'}</span>
              <strong className="text-stone-800">{company || contact || (isEng ? 'None' : 'Brak danych')}</strong>
            </div>
          </div>
        </div>

        {/* Footer: ONLY Send or Close buttons as requested */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            {isEng ? 'Close' : 'Zamknij'}
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || !selectedEmail}
            className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-xl shadow-md inline-flex items-center gap-2 transition-all cursor-pointer text-center disabled:opacity-50"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isEng ? 'Sending...' : 'Wysyłanie...'}</span>
              </>
            ) : isSent ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isEng ? 'Sent!' : 'Wysłano!'}</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{isEng ? 'Send' : 'Wyślij'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
