export type FieldType =
  | 'text'
  | 'textarea'
  | 'checkbox'
  | 'radio'
  | 'link'
  | 'image'
  | 'signature'
  | 'date';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  page: number; // 1-indexed page number
  // Normalized percentage coordinates (0 - 100%) so it scales perfectly across screen sizes and print
  x: number; // % from left
  y: number; // % from top
  width: number; // % width
  height: number; // % height
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | boolean;
  fontSize?: number; // in px at standard 1000px width reference
  align?: 'left' | 'center' | 'right';
  helpText?: string;
  // Radio button options (e.g. ['Tak', 'Nie'] or ['Zgodny', 'Niezgodny'])
  radioOptions?: string[];
  groupName?: string;
  // Link target
  linkUrl?: string;
}

export interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  pdfDataUrl?: string; // Data URL or object URL of the base PDF
  fileName: string;
  pageCount: number;
  pageAspectRatios: number[]; // height / width for each page
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
}

export interface FilledValues {
  [fieldId: string]: string | boolean | undefined; // image base64, signature base64, boolean for checkbox, string for text
}

export interface SavedSubmission {
  id: string;
  templateId: string;
  templateName: string;
  fileName: string;
  submittedAt: string;
  values: FilledValues;
  pdfBlobUrl?: string;
  summaryTitle?: string;
}

export interface TemplateHistoryEntry {
  id: string;
  templateId: string;
  templateName: string;
  fileName: string;
  savedAt: string;
  fieldCount: number;
  pageCount: number;
  pdfDataUrl?: string;
  fields: FormField[];
  note?: string;
}
