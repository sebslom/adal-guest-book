import React, { useState, useEffect } from 'react';
import { FormTemplate } from './types';
import {
  idbGetTemplates,
  idbSaveTemplate,
  createDefaultSampleTemplate,
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
        // Auto-check if a static PDF was added to public/ (e.g. formularz.pdf or template.pdf)
        let staticPdfDataUrl: string | null = null;
        try {
          const candidatePaths = ['./formularz.pdf', './template.pdf'];
          for (const path of candidatePaths) {
            const headRes = await fetch(path, { method: 'HEAD' });
            if (headRes.ok) {
              const fullRes = await fetch(path);
              const blob = await fullRes.blob();
              if (blob.size > 1000) {
                staticPdfDataUrl = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(blob);
                });
                break;
              }
            }
          }
        } catch {
          // Ignore if no static file found
        }

        const storedTemplates = await idbGetTemplates();
        if (isMounted) {
          if (storedTemplates && storedTemplates.length > 0) {
            const active = storedTemplates[0];
            if (staticPdfDataUrl && !active.pdfDataUrl) {
              active.pdfDataUrl = staticPdfDataUrl;
              await idbSaveTemplate(active);
            }
            setTemplate(active);
          } else {
            const initial = createDefaultSampleTemplate();
            if (staticPdfDataUrl) {
              initial.pdfDataUrl = staticPdfDataUrl;
            }
            await idbSaveTemplate(initial);
            setTemplate(initial);
          }
          setIsStorageLoaded(true);
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
