import React, { useState, useEffect } from 'react';
import { Mail, Plus, Trash2, Check, ExternalLink, X, Send, Copy, Download, Globe, AlertCircle, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
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
const STORAGE_WEBHOOK_URL_KEY = 'adal_email_webhook_url_v1';
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
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);

  // Webhook / automated sending
  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_WEBHOOK_URL_KEY) || '';
    } catch {
      return '';
    }
  });
  const [showWebhookSettings, setShowWebhookSettings] = useState(false);
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);
  const [webhookMessage, setWebhookMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const handleSaveWebhookUrl = (url: string) => {
    setWebhookUrl(url);
    try {
      localStorage.setItem(STORAGE_WEBHOOK_URL_KEY, url);
    } catch (e) {
      console.error('Failed to save webhook URL', e);
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

  // Direct webmail compose links
  const gmailComposeUrl = selectedEmail
    ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
        selectedEmail
      )}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
    : '';

  const outlookComposeUrl = selectedEmail
    ? `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(
        selectedEmail
      )}&subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
    : '';

  const handleCopyBody = async () => {
    try {
      const fullText = `Temat: ${emailSubject}\n\n${emailBody}`;
      await navigator.clipboard.writeText(fullText);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 3000);
    } catch {
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

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
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
      setPdfDownloaded(true);
      setTimeout(() => setPdfDownloaded(false), 4000);
    } catch (e) {
      console.error('Failed to generate/download PDF:', e);
      alert(isEng ? 'Could not generate PDF file.' : 'Nie udało się wygenerować pliku PDF.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleOpenGmail = () => {
    if (!selectedEmail) {
      alert(isEng ? 'Please select a recipient email.' : 'Proszę wybrać adres e-mail odbiorcy.');
      return;
    }
    window.open(gmailComposeUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenOutlook = () => {
    if (!selectedEmail) {
      alert(isEng ? 'Please select a recipient email.' : 'Proszę wybrać adres e-mail odbiorcy.');
      return;
    }
    window.open(outlookComposeUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSendViaWebhook = async () => {
    if (!webhookUrl) {
      setShowWebhookSettings(true);
      return;
    }
    if (!selectedEmail) {
      alert(isEng ? 'Please select a recipient email.' : 'Proszę wybrać adres e-mail odbiorcy.');
      return;
    }

    setIsSendingWebhook(true);
    setWebhookMessage(null);

    try {
      let pdfBase64 = '';
      try {
        let blob: Blob;
        if (renderedPages && renderedPages.length > 0) {
          const result = await generateFilledPdf(renderedPages, fields, values);
          blob = result.blob;
        } else {
          const result = await generateAdalGuestBookPdf(values, fields);
          blob = result.blob;
        }
        pdfBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        console.warn('Could not encode PDF for webhook, sending text payload', err);
      }

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: selectedEmail,
          subject: emailSubject,
          body: emailBody,
          company,
          contact,
          clientEmail: emailVal,
          phone: phoneVal,
          country: countryVal,
          date: dateVal,
          budget: budgetVal,
          deadline: deadlineVal,
          notesPage1: notesP1,
          notesPage2: notesP2,
          pdfBase64,
          pdfFileName: '2026_Targi_MAPIC_GuestBook_Adal_02_Formularz.pdf',
          timestamp: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        setWebhookMessage({
          type: 'success',
          text: isEng ? 'Email sent successfully via webhook!' : 'Wiadomość została wysłana automatycznie przez webhook!',
        });
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setWebhookMessage({
          type: 'error',
          text: isEng ? `Sending failed (status ${res.status})` : `Błąd serwera wysyłkowego (kod: ${res.status})`,
        });
      }
    } catch (e: any) {
      console.error('Webhook sending error:', e);
      setWebhookMessage({
        type: 'error',
        text: isEng ? 'Connection error to webhook service' : 'Błąd połączenia z usługą wysyłkową.',
      });
    } finally {
      setIsSendingWebhook(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                {isEng ? 'Send Form via Email' : 'Wysyłka formularza e-mailem'}
              </h3>
              <p className="text-xs text-stone-500">
                {isEng
                  ? 'Send form details and PDF to selected recipients'
                  : 'Prześlij dane formularza i załącznik PDF do wybranego odbiorcy'}
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
              {isEng ? '1. Select recipient:' : '1. Wybierz odbiorcę z listy:'}
            </label>
            {recipients.length === 0 ? (
              <div className="py-4 px-4 text-center rounded-xl border border-dashed border-stone-300 bg-stone-50/60">
                <Mail className="w-6 h-6 mx-auto text-stone-400 mb-1" />
                <p className="text-xs text-stone-700 font-medium">
                  {isEng ? 'No saved email addresses' : 'Brak zapisanych adresów e-mail'}
                </p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  {isEng ? 'Enter an address below and click Add' : 'Wpisz adres poniżej i kliknij Dodaj'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
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
          <form onSubmit={handleAddEmail} className="pt-0.5">
            <div className="flex gap-2">
              <input
                type="email"
                placeholder={isEng ? 'e.g. sales@adal.pl' : 'np. biuro@adal.pl, jan@firma.pl'}
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

          {/* Action buttons: Ways to send */}
          <div className="space-y-2.5 pt-1">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              {isEng ? '2. Choose how to send:' : '2. Wybierz sposób wysyłki:'}
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Option A: Gmail Web (Recommended, works in any browser) */}
              <button
                type="button"
                onClick={handleOpenGmail}
                disabled={!selectedEmail}
                className="p-3 border border-red-200 bg-red-50/60 hover:bg-red-50 text-red-900 rounded-xl text-left transition-all cursor-pointer flex items-start gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed group shadow-2xs"
              >
                <div className="p-1.5 bg-red-600 text-white rounded-lg group-hover:scale-105 transition-transform mt-0.5">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold flex items-center gap-1">
                    <span>{isEng ? 'Open in Gmail (Web)' : 'Otwórz w Gmail (Web)'}</span>
                    <ExternalLink className="w-3 h-3 text-red-700" />
                  </div>
                  <div className="text-[11px] text-red-700/80 leading-tight mt-0.5">
                    {isEng ? 'Opens in browser with pre-filled fields' : 'Działa w przeglądarce bez programu pocztowego'}
                  </div>
                </div>
              </button>

              {/* Option B: Outlook Web */}
              <button
                type="button"
                onClick={handleOpenOutlook}
                disabled={!selectedEmail}
                className="p-3 border border-sky-200 bg-sky-50/60 hover:bg-sky-50 text-sky-900 rounded-xl text-left transition-all cursor-pointer flex items-start gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed group shadow-2xs"
              >
                <div className="p-1.5 bg-sky-600 text-white rounded-lg group-hover:scale-105 transition-transform mt-0.5">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold flex items-center gap-1">
                    <span>{isEng ? 'Open in Outlook Web' : 'Otwórz w Outlook Web'}</span>
                    <ExternalLink className="w-3 h-3 text-sky-700" />
                  </div>
                  <div className="text-[11px] text-sky-700/80 leading-tight mt-0.5">
                    {isEng ? 'Opens Outlook / Office 365 web' : 'Dla kont Microsoft / Office 365'}
                  </div>
                </div>
              </button>
            </div>

            {/* Download PDF button (Essential because mailto cannot attach files automatically) */}
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 bg-stone-200 text-stone-700 rounded-lg">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-800">
                    {isEng ? 'Download PDF to attach' : 'Pobierz formularz PDF do załączenia'}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {isEng
                      ? 'Browser mail links cannot attach files automatically'
                      : 'Przeglądarki ze względów bezpieczeństwa nie mogą same dodać pliku'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-lg shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                {isDownloadingPdf ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                    <span>{isEng ? 'Generating...' : 'Tworzenie...'}</span>
                  </>
                ) : pdfDownloaded ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    <span className="text-emerald-700">{isEng ? 'Downloaded!' : 'Pobrano!'}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-stone-600" />
                    <span>{isEng ? 'Download PDF' : 'Pobierz PDF'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Webhook / Automated Direct Send Section */}
          <div className="border border-stone-200 rounded-xl overflow-hidden bg-stone-50/50">
            <button
              type="button"
              onClick={() => setShowWebhookSettings(!showWebhookSettings)}
              className="w-full px-4 py-2.5 text-left text-xs font-bold text-stone-700 hover:bg-stone-100 flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>{isEng ? 'Automatic Background Sending (Webhook / API)' : 'Automatyczna wysyłka w tle (Webhook / API)'}</span>
                {webhookUrl && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded">
                    {isEng ? 'Connected' : 'Aktywne'}
                  </span>
                )}
              </div>
              {showWebhookSettings ? <ChevronUp className="w-4 h-4 text-stone-500" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
            </button>

            {showWebhookSettings && (
              <div className="p-4 bg-white border-t border-stone-200 text-xs space-y-3">
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  {isEng
                    ? 'Enter an incoming webhook URL (e.g. Google Apps Script, Make.com, Zapier, or Formspree) to send emails automatically in the background with PDF attached.'
                    : 'Wpisz adres URL webhooka (np. darmowy Google Apps Script, Make.com, Zapier lub Formspree), aby formularz wraz z PDF wysyłał się całkowicie w tle bez otwierania poczty.'}
                </p>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-stone-700 block">
                    URL Webhooka (POST):
                  </label>
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/... lub https://hook.eu1.make.com/..."
                    value={webhookUrl}
                    onChange={(e) => handleSaveWebhookUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-[11px]"
                  />
                </div>

                {webhookUrl && (
                  <button
                    type="button"
                    onClick={handleSendViaWebhook}
                    disabled={isSendingWebhook || !selectedEmail}
                    className="w-full py-2 px-3 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg flex items-center justify-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    {isSendingWebhook ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{isEng ? 'Sending automatically...' : 'Wysyłanie automatyczne w tle...'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>{isEng ? 'Send now in background' : 'Wyślij teraz automatycznie w tle'}</span>
                      </>
                    )}
                  </button>
                )}

                {webhookMessage && (
                  <div
                    className={`p-2.5 rounded-lg text-[11px] font-medium flex items-center gap-2 ${
                      webhookMessage.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {webhookMessage.type === 'success' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3]" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    )}
                    <span>{webhookMessage.text}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Summary preview */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                {isEng ? 'Dispatch summary:' : 'Podsumowanie treści wiadomości:'}
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
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-2">
          {/* Default native app mailto trigger */}
          <a
            href={mailtoUrl}
            target="_top"
            rel="noopener noreferrer"
            onClick={() => {
              setTimeout(() => onClose(), 800);
            }}
            className="text-[11px] font-semibold text-stone-500 hover:text-stone-800 underline cursor-pointer"
          >
            {isEng ? 'Use default desktop email app' : 'Otwórz w lokalnym programie pocztowym'}
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
            >
              {isEng ? 'Close' : 'Zamknij'}
            </button>
            
            {/* Primary quick send button (Gmail if chosen or Webhook if active) */}
            {webhookUrl ? (
              <button
                type="button"
                onClick={handleSendViaWebhook}
                disabled={isSendingWebhook || !selectedEmail}
                className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md inline-flex items-center gap-2 transition-all cursor-pointer text-center disabled:opacity-50"
              >
                {isSendingWebhook ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{isEng ? 'Send in background' : 'Wyślij w tle'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenGmail}
                disabled={!selectedEmail}
                className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md inline-flex items-center gap-2 transition-all cursor-pointer text-center disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isEng ? 'Send via Gmail' : 'Wyślij przez Gmail'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

