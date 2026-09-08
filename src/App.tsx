import React, { useState, useEffect } from 'react';
import { FormTemplate } from './types';
import {
  idbGetTemplates,
  idbSaveTemplate,
  createDefaultSampleTemplate,
  idbPruneTemplateHistoryKeepOnlyCurrent,
} from './utils/idbStorage';
import { TemplateDesigner } from './components/TemplateDesigner';
import { TabletFiller } from './components/TabletFiller';
import { PasswordPromptModal } from './components/PasswordPromptModal';
import { renderPdfPages, RenderedPage } from './utils/pdfHelper';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [template, setTemplate] = useState<FormTemplate>(() => {
    try {
      const stored = localStorage.getItem('adal_active_template_forever_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id) return parsed;
      }
    } catch {}
    return createDefaultSampleTemplate();
  });
  const [renderedPages, setRenderedPages] = useState<RenderedPage[]>([]);
  const [isStorageLoaded, setIsStorageLoaded] = useState<boolean>(false);
  const [mode, setMode] = useState<'designer' | 'filler'>('filler');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);

  // Load saved template fields from IndexedDB, or check if repo contains a static PDF
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        // Auto-check if static PDF file was provided in repo (e.g. in main/ or public/)
        let staticPdfResult: { dataUrl: string; fileName: string } | null = null;
        try {
          const targetName = '2026_Targi_MAPIC_GuestBook_Adal_02_Formularz.pdf';
          const candidateNames = [
            targetName,
            'formularz.pdf',
            'template.pdf',
            'Adal_Guest_Book_2026_MAPIC.pdf',
          ];
          const prefixes = [
            './main/',
            'main/',
            '/main/',
            './public/main/',
            '/public/main/',
            './',
            '/',
            '',
            './public/',
            '/public/',
          ];

          const testUrls: string[] = [];
          for (const prefix of prefixes) {
            for (const name of candidateNames) {
              const url = `${prefix}${name}`;
              testUrls.push(url);
              testUrls.push(encodeURI(url));
            }
          }
          const uniqueUrls = Array.from(new Set(testUrls));

          for (const path of uniqueUrls) {
            try {
              const res = await fetch(path);
              if (!res.ok) continue;

              const blob = await res.blob();
              if (blob.size < 500) continue;

              // Verify PDF magic bytes '%PDF' (0x25, 0x50, 0x44, 0x46)
              // to prevent loading HTML SPA 404 fallbacks as PDF
              const magicBuffer = await blob.slice(0, 5).arrayBuffer();
              const magicBytes = new Uint8Array(magicBuffer);
              const isPdf =
                magicBytes[0] === 0x25 &&
                magicBytes[1] === 0x50 &&
                magicBytes[2] === 0x44 &&
                magicBytes[3] === 0x46;

              if (!isPdf) continue;

              const dataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });

              staticPdfResult = {
                dataUrl,
                fileName: targetName,
              };
              console.log('Successfully auto-loaded default PDF from:', path);
              break;
            } catch {
              // ignore and try next path
            }
          }
        } catch (e) {
          console.warn('Auto PDF discovery error:', e);
        }

        const storedTemplates = await idbGetTemplates();
        if (isMounted) {
          if (storedTemplates && storedTemplates.length > 0) {
            const active = storedTemplates[0];
            if (staticPdfResult) {
              active.pdfDataUrl = staticPdfResult.dataUrl;
              active.fileName = staticPdfResult.fileName;
              await idbSaveTemplate(active);
            }
            setTemplate(active);
          } else {
            const initial = createDefaultSampleTemplate();
            if (staticPdfResult) {
              initial.pdfDataUrl = staticPdfResult.dataUrl;
              initial.fileName = staticPdfResult.fileName;
            }
            await idbSaveTemplate(initial);
            setTemplate(initial);
          }
          setIsStorageLoaded(true);
          // Automatically prune past edit history versions, keeping only the current active one
          idbPruneTemplateHistoryKeepOnlyCurrent().catch(() => {});
        }
      } catch (err) {
        console.error('Error loading template from storage:', err);
        if (isMounted) {
          setIsStorageLoaded(true);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // When template.pdfDataUrl changes or loads from IndexedDB, render all PDF pages 1:1
  useEffect(() => {
    let isMounted = true;
    if (template?.pdfDataUrl) {
      renderPdfPages(template.pdfDataUrl, 1400)
        .then((pages) => {
          if (isMounted) {
            setRenderedPages(pages);
          }
        })
        .catch((err) => {
          console.error('Failed to render PDF pages from template:', err);
        });
    } else {
      setRenderedPages([]);
    }
    return () => {
      isMounted = false;
    };
  }, [template?.pdfDataUrl]);

  // Save updated template when edited in designer - persists forever in IndexedDB
  const handleUpdateTemplate = async (updated: FormTemplate) => {
    setTemplate(updated);
    try {
      await idbSaveTemplate(updated);
    } catch (e) {
      console.error('Error saving updated template:', e);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-stone-100 font-sans">
      {!isStorageLoaded ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-stone-100 space-y-3">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
          <p className="text-xs font-semibold text-stone-600">Ładowanie formularza...</p>
        </div>
      ) : mode === 'designer' ? (
        <TemplateDesigner
          template={template}
          renderedPages={renderedPages}
          onUpdateTemplate={handleUpdateTemplate}
          onSwitchToFiller={() => setMode('filler')}
        />
      ) : (
        <TabletFiller
          template={template}
          renderedPages={renderedPages}
          onSwitchToDesigner={() => setIsPasswordModalOpen(true)}
        />
      )}

      {/* Password Prompt Modal for 3-click lock */}
      <PasswordPromptModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={() => setMode('designer')}
      />
    </div>
  );
}
