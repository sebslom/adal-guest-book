import { FormTemplate, SavedSubmission } from '../types';
import { createAdalGuestBookTemplate } from './adalTemplate';

const STORAGE_TEMPLATES_KEY = 'tablet_pdf_templates_v1';
const STORAGE_CURRENT_TEMPLATE_KEY = 'tablet_pdf_current_template_id_v1';
const STORAGE_SUBMISSIONS_KEY = 'tablet_pdf_submissions_v1';

export function getStoredTemplates(): FormTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_TEMPLATES_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load templates from localStorage', e);
  }

  // Create default sample template
  const sample = createDefaultSampleTemplate();
  saveTemplates([sample]);
  return [sample];
}

export function saveTemplates(templates: FormTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_TEMPLATES_KEY, JSON.stringify(templates));
  } catch (e) {
    console.error('Failed to save templates to localStorage', e);
  }
}

export function getCurrentTemplateId(): string | null {
  return localStorage.getItem(STORAGE_CURRENT_TEMPLATE_KEY);
}

export function setCurrentTemplateId(id: string): void {
  localStorage.setItem(STORAGE_CURRENT_TEMPLATE_KEY, id);
}

export function createDefaultSampleTemplate(): FormTemplate {
  return createAdalGuestBookTemplate();
}

export function getStoredSubmissions(): SavedSubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_SUBMISSIONS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load submissions from localStorage', e);
  }
  return [];
}

export function saveSubmission(submission: SavedSubmission): void {
  try {
    const existing = getStoredSubmissions();
    const updated = [submission, ...existing].slice(0, 50); // keep up to 50 latest
    localStorage.setItem(STORAGE_SUBMISSIONS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save submission to localStorage', e);
  }
}

export function deleteSubmission(id: string): void {
  try {
    const existing = getStoredSubmissions();
    const filtered = existing.filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_SUBMISSIONS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to delete submission', e);
  }
}
