import { FormTemplate, SavedSubmission } from '../types';
import { generateSamplePdfDataUrl } from './pdfHelper';

const DB_NAME = 'tablet_pdf_studio_db';
const DB_VERSION = 1;
const STORE_TEMPLATES = 'templates';
const STORE_SUBMISSIONS = 'submissions';
const STORE_SETTINGS = 'settings';

const KEY_CURRENT_TEMPLATE = 'current_template_id';
const KEY_SESSION_AUTH = 'designer_auth_session';

// The secret password for designer access
const DESIGNER_PASSWORD_HASH = '123456';

export function verifyDesignerPassword(input: string): boolean {
  return input.trim() === DESIGNER_PASSWORD_HASH;
}

export function isDesignerAuthenticated(): boolean {
  try {
    return sessionStorage.getItem(KEY_SESSION_AUTH) === 'true';
  } catch {
    return false;
  }
}

export function setDesignerAuthenticated(auth: boolean): void {
  try {
    if (auth) {
      sessionStorage.setItem(KEY_SESSION_AUTH, 'true');
    } else {
      sessionStorage.removeItem(KEY_SESSION_AUTH);
    }
  } catch {
    // Ignore session storage errors
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_TEMPLATES)) {
        db.createObjectStore(STORE_TEMPLATES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SUBMISSIONS)) {
        db.createObjectStore(STORE_SUBMISSIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function idbGetTemplates(): Promise<FormTemplate[]> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TEMPLATES, 'readonly');
      const store = tx.objectStore(STORE_TEMPLATES);
      const req = store.getAll();
      req.onsuccess = () => {
        const templates = req.result as FormTemplate[];
        if (templates && templates.length > 0) {
          resolve(templates);
        } else {
          // Initialize sample template
          const sample = createDefaultSampleTemplate();
          idbSaveTemplate(sample)
            .then(() => resolve([sample]))
            .catch(() => resolve([sample]));
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Fallback to localStorage due to IndexedDB error:', err);
    return getFallbackTemplates();
  }
}

export async function idbSaveTemplate(template: FormTemplate): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TEMPLATES, 'readwrite');
      const store = tx.objectStore(STORE_TEMPLATES);
      const req = store.put(template);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Fallback save template:', err);
    saveFallbackTemplate(template);
  }
}

export async function idbSaveAllTemplates(templates: FormTemplate[]): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TEMPLATES, 'readwrite');
      const store = tx.objectStore(STORE_TEMPLATES);
      // clear first or put all
      templates.forEach((t) => store.put(t));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    saveFallbackAllTemplates(templates);
  }
}

export async function idbDeleteTemplate(id: string): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TEMPLATES, 'readwrite');
      const store = tx.objectStore(STORE_TEMPLATES);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    deleteFallbackTemplate(id);
  }
}

export async function idbGetCurrentTemplateId(): Promise<string | null> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SETTINGS, 'readonly');
      const store = tx.objectStore(STORE_SETTINGS);
      const req = store.get(KEY_CURRENT_TEMPLATE);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return localStorage.getItem('current_template_id');
  }
}

export async function idbSetCurrentTemplateId(id: string): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_SETTINGS, 'readwrite');
    const store = tx.objectStore(STORE_SETTINGS);
    store.put({ key: KEY_CURRENT_TEMPLATE, value: id });
  } catch {
    localStorage.setItem('current_template_id', id);
  }
}

export async function idbGetSubmissions(): Promise<SavedSubmission[]> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SUBMISSIONS, 'readonly');
      const store = tx.objectStore(STORE_SUBMISSIONS);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = req.result as SavedSubmission[];
        list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function idbSaveSubmission(sub: SavedSubmission): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_SUBMISSIONS, 'readwrite');
    const store = tx.objectStore(STORE_SUBMISSIONS);
    store.put(sub);
  } catch (e) {
    console.warn('Failed to save submission:', e);
  }
}

export async function idbDeleteSubmission(id: string): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_SUBMISSIONS, 'readwrite');
    const store = tx.objectStore(STORE_SUBMISSIONS);
    store.delete(id);
  } catch (e) {
    console.warn('Failed to delete submission:', e);
  }
}

export function createDefaultSampleTemplate(): FormTemplate {
  const { dataUrl, fields } = generateSamplePdfDataUrl();
  const now = new Date().toISOString();
  return {
    id: 'sample_protocol_techniczny',
    name: 'Protokół Przeglądu / Odbioru Technicznego',
    description: 'Wzorcowy szablon z polami tekstowymi, kwadracikami, radiami, linkiem i podpisem.',
    pdfDataUrl: dataUrl,
    fileName: 'protokol_techniczny_wzor.pdf',
    pageCount: 1,
    pageAspectRatios: [1.414],
    fields: fields,
    createdAt: now,
    updatedAt: now,
  };
}

// Fallback methods
function getFallbackTemplates(): FormTemplate[] {
  try {
    const raw = localStorage.getItem('tablet_templates_backup');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [createDefaultSampleTemplate()];
}

function saveFallbackTemplate(template: FormTemplate): void {
  try {
    const list = getFallbackTemplates().filter((t) => t.id !== template.id);
    list.unshift(template);
    localStorage.setItem('tablet_templates_backup', JSON.stringify(list));
  } catch {}
}

function saveFallbackAllTemplates(templates: FormTemplate[]): void {
  try {
    localStorage.setItem('tablet_templates_backup', JSON.stringify(templates));
  } catch {}
}

function deleteFallbackTemplate(id: string): void {
  try {
    const list = getFallbackTemplates().filter((t) => t.id !== id);
    localStorage.setItem('tablet_templates_backup', JSON.stringify(list));
  } catch {}
}
