import { FormTemplate, SavedSubmission, TemplateHistoryEntry } from '../types';
import { createAdalGuestBookTemplate, ADAL_TEMPLATE_ID } from './adalTemplate';

const DB_NAME = 'tablet_pdf_studio_db';
const DB_VERSION = 2;
const STORE_TEMPLATES = 'templates';
const STORE_SUBMISSIONS = 'submissions';
const STORE_SETTINGS = 'settings';
const STORE_TEMPLATE_HISTORY = 'template_history';

const KEY_CURRENT_TEMPLATE = 'current_template_id';
const KEY_SESSION_AUTH = 'designer_auth_session';
const LOCAL_STORAGE_ACTIVE_TEMPLATE = 'adal_active_template_forever_v2';
const LOCAL_STORAGE_HISTORY_BACKUP = 'adal_template_history_backup_v2';

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
      if (!db.objectStoreNames.contains(STORE_TEMPLATE_HISTORY)) {
        db.createObjectStore(STORE_TEMPLATE_HISTORY, { keyPath: 'id' });
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
        const templates = (req.result as FormTemplate[]) || [];
        if (templates.length > 0) {
          // Sort by updatedAt descending to give the most recently saved template first
          templates.sort(
            (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
          );
          resolve(templates);
        } else {
          // Initialize Adal template
          const sample = createAdalGuestBookTemplate();
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
  // Always update timestamp
  const updatedTemplate: FormTemplate = {
    ...template,
    updatedAt: new Date().toISOString(),
  };

  // Dual persistence: LocalStorage backup
  try {
    localStorage.setItem(LOCAL_STORAGE_ACTIVE_TEMPLATE, JSON.stringify(updatedTemplate));
    localStorage.setItem(KEY_CURRENT_TEMPLATE, updatedTemplate.id);
  } catch (e) {
    console.warn('Failed to save to localStorage backup:', e);
  }

  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_TEMPLATES, STORE_SETTINGS], 'readwrite');
      const store = tx.objectStore(STORE_TEMPLATES);
      store.put(updatedTemplate);

      const settingsStore = tx.objectStore(STORE_SETTINGS);
      settingsStore.put({ key: KEY_CURRENT_TEMPLATE, value: updatedTemplate.id });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Also auto-save snapshot in template history (maintaining only the latest/current version)
    const historyEntry: TemplateHistoryEntry = {
      id: 'hist_' + Date.now(),
      templateId: updatedTemplate.id,
      templateName: updatedTemplate.name || 'Formularz',
      fileName: updatedTemplate.fileName || 'formularz.pdf',
      savedAt: new Date().toISOString(),
      fieldCount: updatedTemplate.fields?.length || 0,
      pageCount: updatedTemplate.pageCount || 1,
      pdfDataUrl: updatedTemplate.pdfDataUrl,
      fields: JSON.parse(JSON.stringify(updatedTemplate.fields || [])),
      note: `Wersja aktualna (${new Date().toLocaleDateString('pl-PL')} ${new Date().toLocaleTimeString('pl-PL')})`,
    };
    await idbSaveTemplateHistory(historyEntry);
  } catch (err) {
    console.warn('Fallback save template:', err);
    saveFallbackTemplate(updatedTemplate);
  }
}

// History of template versions - keeps only the current active version, removing obsolete edits
export async function idbSaveTemplateHistory(entry: TemplateHistoryEntry): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_TEMPLATE_HISTORY, 'readwrite');
    const store = tx.objectStore(STORE_TEMPLATE_HISTORY);
    // Clear previous edits so only the current active version remains
    store.clear();
    store.put(entry);
  } catch (e) {
    // Fallback: keep only the latest in localStorage
  }
  try {
    localStorage.setItem(LOCAL_STORAGE_HISTORY_BACKUP, JSON.stringify([entry]));
  } catch {}
}

// Remove all past edit history, keeping exclusively the current/latest version
export async function idbPruneTemplateHistoryKeepOnlyCurrent(): Promise<TemplateHistoryEntry[]> {
  try {
    const list = await idbGetTemplateHistory();
    if (list.length <= 1) {
      if (list.length === 1) {
        try {
          localStorage.setItem(LOCAL_STORAGE_HISTORY_BACKUP, JSON.stringify(list));
        } catch {}
      }
      return list;
    }

    // Keep only the newest (current active) entry
    const current = list[0];

    try {
      const db = await openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_TEMPLATE_HISTORY, 'readwrite');
        const store = tx.objectStore(STORE_TEMPLATE_HISTORY);
        const clearReq = store.clear();
        clearReq.onsuccess = () => {
          store.put(current);
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('Failed clearing IDB history store:', e);
    }

    try {
      localStorage.setItem(LOCAL_STORAGE_HISTORY_BACKUP, JSON.stringify([current]));
    } catch {}

    return [current];
  } catch (err) {
    console.error('Error pruning template history:', err);
    return [];
  }
}

export async function idbGetTemplateHistory(): Promise<TemplateHistoryEntry[]> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_TEMPLATE_HISTORY, 'readonly');
      const store = tx.objectStore(STORE_TEMPLATE_HISTORY);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result as TemplateHistoryEntry[]) || [];
        list.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
        resolve(list);
      };
      req.onerror = () => resolve(getFallbackHistory());
    });
  } catch {
    return getFallbackHistory();
  }
}

export async function idbDeleteTemplateHistory(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_TEMPLATE_HISTORY, 'readwrite');
      const store = tx.objectStore(STORE_TEMPLATE_HISTORY);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('IDB delete template history failed:', e);
  }
  try {
    const existing = getFallbackHistory().filter((h) => h.id !== id);
    localStorage.setItem(LOCAL_STORAGE_HISTORY_BACKUP, JSON.stringify(existing));
  } catch {}
}

export async function idbClearAllTemplateHistory(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_TEMPLATE_HISTORY, 'readwrite');
      const store = tx.objectStore(STORE_TEMPLATE_HISTORY);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('IDB clear template history failed:', e);
  }
  try {
    localStorage.removeItem(LOCAL_STORAGE_HISTORY_BACKUP);
  } catch {}
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

const LOCAL_STORAGE_SUBMISSIONS_BACKUP = 'adal_submissions_backup_v2';

function getFallbackSubmissions(): SavedSubmission[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SUBMISSIONS_BACKUP);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export async function idbGetSubmissions(): Promise<SavedSubmission[]> {
  try {
    const db = await openDb();
    const list = await new Promise<SavedSubmission[]>((resolve, reject) => {
      const tx = db.transaction(STORE_SUBMISSIONS, 'readonly');
      const store = tx.objectStore(STORE_SUBMISSIONS);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result as SavedSubmission[]) || [];
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
    list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    try {
      localStorage.setItem(LOCAL_STORAGE_SUBMISSIONS_BACKUP, JSON.stringify(list));
    } catch {}
    return list;
  } catch {
    return getFallbackSubmissions();
  }
}

export async function idbSaveSubmission(sub: SavedSubmission): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_SUBMISSIONS, 'readwrite');
      const store = tx.objectStore(STORE_SUBMISSIONS);
      store.put(sub);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Failed to save submission to IDB:', e);
  }
  try {
    const subs = getFallbackSubmissions().filter((s) => s.id !== sub.id);
    subs.unshift(sub);
    localStorage.setItem(LOCAL_STORAGE_SUBMISSIONS_BACKUP, JSON.stringify(subs.slice(0, 50)));
  } catch {}
}

export async function idbDeleteSubmission(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_SUBMISSIONS, 'readwrite');
      const store = tx.objectStore(STORE_SUBMISSIONS);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Failed to delete submission from IDB:', e);
  }
  try {
    const subs = getFallbackSubmissions().filter((s) => s.id !== id);
    localStorage.setItem(LOCAL_STORAGE_SUBMISSIONS_BACKUP, JSON.stringify(subs));
  } catch {}
}

export async function idbClearAllSubmissions(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_SUBMISSIONS, 'readwrite');
      const store = tx.objectStore(STORE_SUBMISSIONS);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Failed to clear submissions in IDB:', e);
  }
  try {
    localStorage.removeItem(LOCAL_STORAGE_SUBMISSIONS_BACKUP);
  } catch {}
}

export function createDefaultSampleTemplate(): FormTemplate {
  return createAdalGuestBookTemplate();
}

// Fallback methods
function getFallbackTemplates(): FormTemplate[] {
  try {
    const activeRaw = localStorage.getItem(LOCAL_STORAGE_ACTIVE_TEMPLATE);
    if (activeRaw) {
      const active = JSON.parse(activeRaw);
      if (active && active.id) return [active];
    }
    const raw = localStorage.getItem('tablet_templates_backup');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [createDefaultSampleTemplate()];
}

function saveFallbackTemplate(template: FormTemplate): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_ACTIVE_TEMPLATE, JSON.stringify(template));
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

function getFallbackHistory(): TemplateHistoryEntry[] {
  try {
    const raw = localStorage.getItem('adal_template_history_backup_v2');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}
