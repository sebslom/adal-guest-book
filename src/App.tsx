/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormTemplate } from './types';
import {
  idbGetTemplates,
  idbSaveTemplate,
  idbDeleteTemplate,
  idbGetCurrentTemplateId,
  idbSetCurrentTemplateId,
  createDefaultSampleTemplate,
} from './utils/idbStorage';
import { renderPdfPages, RenderedPage } from './utils/pdfHelper';
import { Navbar } from './components/Navbar';
import { TemplateDesigner } from './components/TemplateDesigner';
import { TabletFiller } from './components/TabletFiller';
import { PdfLoadModal } from './components/PdfLoadModal';
import { Loader2, AlertCircle } from 'lucide-react';

export default function App() {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string>('');
  const [isStorageLoaded, setIsStorageLoaded] = useState<boolean>(false);

  // Default mode: FILLER (tablet-only view first!)
  const [mode, setMode] = useState<'designer' | 'filler'>('filler');
  const [renderedPages, setRenderedPages] = useState<RenderedPage[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load modal state with initial tab mode ('link' | 'disk')
  const [isLoadModalOpen, setIsLoadModalOpen] = useState<boolean>(false);
  const [loadModalMode, setLoadModalMode] = useState<'link' | 'disk'>('link');

  // Initial load of templates from IndexedDB
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const storedTemplates = await idbGetTemplates();
        const storedCurrentId = await idbGetCurrentTemplateId();

        if (isMounted) {
          const list = storedTemplates.length > 0 ? storedTemplates : [createDefaultSampleTemplate()];
          setTemplates(list);

          const matched = list.find((t) => t.id === storedCurrentId);
          setActiveTemplateId(matched ? matched.id : list[0].id);
          setIsStorageLoaded(true);
        }
      } catch (e) {
        console.error('Error initializing templates from storage:', e);
        if (isMounted) {
          const sample = createDefaultSampleTemplate();
          setTemplates([sample]);
          setActiveTemplateId(sample.id);
          setIsStorageLoaded(true);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeTemplate =
    templates.find((t) => t.id === activeTemplateId) || templates[0] || createDefaultSampleTemplate();

  // Load and render PDF pages whenever activeTemplate changes
  const loadTemplatePages = useCallback(async (template: FormTemplate) => {
    if (!template.pdfDataUrl) {
      setIsLoadingPages(false);
      return;
    }

    setIsLoadingPages(true);
    setLoadError(null);

    try {
      const pages = await renderPdfPages(template.pdfDataUrl, 1200);
      setRenderedPages(pages);
    } catch (err: unknown) {
      console.error('Failed to render PDF pages:', err);
      setLoadError('Nie udało się wyrenderować stron PDF. Spróbuj wgrać plik ponownie lub załaduj z innego źródła.');
    } finally {
      setIsLoadingPages(false);
    }
  }, []);

  useEffect(() => {
    if (isStorageLoaded && activeTemplate?.pdfDataUrl) {
      loadTemplatePages(activeTemplate);
    }
  }, [activeTemplate.id, activeTemplate.pdfDataUrl, isStorageLoaded, loadTemplatePages]);

  // Handle template selection
  const handleSelectTemplate = async (template: FormTemplate) => {
    setActiveTemplateId(template.id);
    await idbSetCurrentTemplateId(template.id);
  };

  // Handle updating template fields/configuration
  const handleUpdateTemplate = async (updated: FormTemplate) => {
    const newTemplates = templates.map((t) => (t.id === updated.id ? updated : t));
    setTemplates(newTemplates);
    await idbSaveTemplate(updated);
  };

  // Handle newly created template from file upload or Google Drive link
  const handleTemplateCreated = async (newTemplate: FormTemplate) => {
    const newTemplates = [newTemplate, ...templates.filter((t) => t.id !== newTemplate.id)];
    setTemplates(newTemplates);
    setActiveTemplateId(newTemplate.id);
    await idbSaveTemplate(newTemplate);
    await idbSetCurrentTemplateId(newTemplate.id);
    // Switch to designer mode so fields can be laid out
    setMode('designer');
  };

  // Handle template deletion
  const handleDeleteTemplate = async (templateId: string) => {
    await idbDeleteTemplate(templateId);
    const updated = templates.filter((t) => t.id !== templateId);
    if (updated.length === 0) {
      const sample = createDefaultSampleTemplate();
      await idbSaveTemplate(sample);
      setTemplates([sample]);
      setActiveTemplateId(sample.id);
      await idbSetCurrentTemplateId(sample.id);
    } else {
      setTemplates(updated);
      if (activeTemplateId === templateId) {
        setActiveTemplateId(updated[0].id);
        await idbSetCurrentTemplateId(updated[0].id);
      }
    }
  };

  const handleOpenLoadModal = (modeChoice: 'link' | 'disk') => {
    setLoadModalMode(modeChoice);
    setIsLoadModalOpen(true);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-stone-100 font-sans">
      {/* Top Application Header */}
      <Navbar
        currentMode={mode}
        onToggleMode={setMode}
        templates={templates}
        activeTemplate={activeTemplate}
        onSelectTemplate={handleSelectTemplate}
        onOpenLoadModal={handleOpenLoadModal}
        onDeleteTemplate={handleDeleteTemplate}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 overflow-hidden relative">
        {isLoadingPages || !isStorageLoaded ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-100/90 z-20 space-y-3">
            <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
            <div className="text-center">
              <p className="text-sm font-semibold text-stone-800">Wczytywanie formularza PDF...</p>
              <p className="text-xs text-stone-500 mt-0.5">Renderowanie stron dla ekranu tabletu</p>
            </div>
          </div>
        ) : loadError ? (
          <div className="flex items-center justify-center h-full p-6">
            <div className="max-w-md p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-4 shadow-sm">
              <AlertCircle className="w-12 h-12 text-rose-600 mx-auto" />
              <div>
                <h3 className="text-base font-bold text-stone-900">Błąd odczytu pliku PDF</h3>
                <p className="text-xs text-stone-600 mt-1">{loadError}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => handleOpenLoadModal('link')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Załaduj z linku Google
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenLoadModal('disk')}
                  className="px-4 py-2 text-xs font-semibold text-stone-800 bg-stone-100 rounded-xl hover:bg-stone-200 transition-colors"
                >
                  Załaduj z dysku
                </button>
              </div>
            </div>
          </div>
        ) : mode === 'designer' ? (
          <TemplateDesigner
            template={activeTemplate}
            renderedPages={renderedPages}
            onUpdateTemplate={handleUpdateTemplate}
            onSwitchToFiller={() => setMode('filler')}
          />
        ) : (
          <TabletFiller
            template={activeTemplate}
            renderedPages={renderedPages}
            onSwitchToDesigner={() => setMode('designer')}
            onOpenLoadModal={handleOpenLoadModal}
          />
        )}
      </div>

      {/* PDF Load Modal (supports Google Drive link and local disk) */}
      <PdfLoadModal
        isOpen={isLoadModalOpen}
        onClose={() => setIsLoadModalOpen(false)}
        onTemplateCreated={handleTemplateCreated}
        initialMode={loadModalMode}
      />
    </div>
  );
}
