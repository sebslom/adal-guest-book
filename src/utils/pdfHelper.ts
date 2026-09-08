import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { jsPDF } from 'jspdf';
import { FormField, FilledValues } from '../types';

// Configure worker using locally bundled Vite asset for 100% offline & iframe reliability
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export interface RenderedPage {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  dataUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
}

/**
 * Loads a PDF file and renders all pages to canvas representations
 */
export async function renderPdfPages(
  fileOrUrl: File | string,
  targetWidth: number = 1200
): Promise<RenderedPage[]> {
  let arrayBuffer: ArrayBuffer;

  if (typeof fileOrUrl === 'string') {
    if (fileOrUrl.startsWith('data:')) {
      const base64Data = fileOrUrl.split(',')[1];
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      arrayBuffer = bytes.buffer;
    } else {
      const response = await fetch(fileOrUrl);
      arrayBuffer = await response.arrayBuffer();
    }
  } else {
    arrayBuffer = await fileOrUrl.arrayBuffer();
  }

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const pages: RenderedPage[] = [];

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const scale = targetWidth / viewport.width;
    const scaledViewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) continue;

    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    await page.render({
      canvasContext: context,
      viewport: scaledViewport,
      canvas: canvas as unknown as HTMLCanvasElement,
    } as unknown as Parameters<typeof page.render>[0]).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    pages.push({
      pageNumber: i,
      canvas,
      dataUrl,
      width: scaledViewport.width,
      height: scaledViewport.height,
      aspectRatio: scaledViewport.height / scaledViewport.width,
    });
  }

  return pages;
}

/**
 * Generates a blank sample PDF protocol for immediate testing if user doesn't have a PDF at hand
 */
export function generateSamplePdfDataUrl(): { dataUrl: string; fields: FormField[] } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header banner
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PROTOKÓŁ ODBIORU / PRZEGLĄDU TECHNICZNEGO', 14, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('System Serwisowy • Formularz Elektroniczny na Tablet', 14, 21);

  // Section 1: Customer & Order Details
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. DANE ZLECENIA I KLIENTA', 14, 38);

  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.line(14, 40, pageWidth - 14, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Numer zlecenia / protokołu:', 14, 48);
  doc.roundedRect(14, 50, 85, 9, 1, 1, 'S');

  doc.text('Data wykonania czynności:', 110, 48);
  doc.roundedRect(110, 50, 85, 9, 1, 1, 'S');

  doc.text('Klient / Firma / Adres:', 14, 66);
  doc.roundedRect(14, 68, 181, 9, 1, 1, 'S');

  doc.text('Imię i nazwisko osoby zlecającej:', 14, 84);
  doc.roundedRect(14, 86, 181, 9, 1, 1, 'S');

  // Section 2: Checklist / Checklist items
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. ZAKRES PRAC I KONTROLA STANU (ZAZNACZ)', 14, 104);
  doc.line(14, 106, pageWidth - 14, 106);

  const checklist = [
    'Kontrola wizualna urządzenia i brak uszkodzeń mechanicznych',
    'Sprawdzenie połączeń elektrycznych i zasilania',
    'Czyszczenie podzespołów i wymiana elementów eksploatacyjnych',
    'Test sprawności działania i próba uruchomieniowa (pozytywna)',
    'Przekazano zalecenia i instruktaż bezpiecznego użytkowania',
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);

  checklist.forEach((item, index) => {
    const yPos = 114 + index * 9;
    // Checkbox box placeholder
    doc.setDrawColor(148, 163, 184);
    doc.roundedRect(14, yPos - 3.5, 6, 6, 0.5, 0.5, 'S');
    doc.text(item, 24, yPos + 0.8);
  });

  // Section 3: Photo documentation area
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('3. DOKUMENTACJA ZDJĘCIOWA (ZDJĘCIE Z TABLETA)', 14, 168);
  doc.line(14, 170, pageWidth - 14, 170);

  // Box for photo 1
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 174, 86, 46, 2, 2, 'FD');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text('[ Miejsce na zdjęcie urządzenia / tabliczki / usterki ]', 18, 198);

  // Box for notes
  doc.text('4. UWAGI I ZALECENIA SERWISOWE', 110, 168);
  doc.roundedRect(110, 174, 86, 46, 2, 2, 'FD');
  doc.text('[ Pole na notatki i uwagi ]', 115, 198);

  // Section 5: Signatures
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('5. PODPISY STRON', 14, 232);
  doc.line(14, 234, pageWidth - 14, 234);

  // Client signature
  doc.roundedRect(14, 238, 86, 32, 2, 2, 'S');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Czytelny podpis klienta / odbierającego:', 17, 243);

  // Technician signature
  doc.roundedRect(110, 238, 86, 32, 2, 2, 'S');
  doc.text('Podpis serwisanta / inspektora:', 113, 243);

  // Footer
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Formularz wygenerowany automatycznie w aplikacji Tablet PDF Form Studio. Zapis z unikalną sygnaturą czasową.',
    14,
    285
  );

  const dataUrl = doc.output('datauristring');

  // Pre-configured normalized fields aligned with this sample PDF
  // coordinates normalized to percentages of page width & height
  const fields: FormField[] = [
    {
      id: 'field_order_num',
      type: 'text',
      label: 'Numer zlecenia',
      page: 1,
      x: 6.8,
      y: 17.0,
      width: 40.5,
      height: 3.2,
      placeholder: 'np. ZL/2026/089',
      defaultValue: 'ZL/2026/',
    },
    {
      id: 'field_order_date',
      type: 'date',
      label: 'Data wykonania',
      page: 1,
      x: 52.5,
      y: 17.0,
      width: 40.5,
      height: 3.2,
      placeholder: 'RRRR-MM-DD',
    },
    {
      id: 'field_client_info',
      type: 'text',
      label: 'Dane klienta / Adres',
      page: 1,
      x: 6.8,
      y: 23.1,
      width: 86.2,
      height: 3.2,
      placeholder: 'np. Jan Kowalski, ul. Przykładowa 12, Warszawa',
    },
    {
      id: 'field_contact_person',
      type: 'text',
      label: 'Osoba zlecająca / tel.',
      page: 1,
      x: 6.8,
      y: 29.2,
      width: 86.2,
      height: 3.2,
      placeholder: 'Imię i nazwisko, nr tel.',
    },
    // Checkboxes
    {
      id: 'field_check_1',
      type: 'checkbox',
      label: 'Kontrola wizualna',
      page: 1,
      x: 6.6,
      y: 37.1,
      width: 3.2,
      height: 2.3,
      defaultValue: true,
    },
    {
      id: 'field_check_2',
      type: 'checkbox',
      label: 'Sprawdzenie połączeń el.',
      page: 1,
      x: 6.6,
      y: 40.2,
      width: 3.2,
      height: 2.3,
      defaultValue: true,
    },
    {
      id: 'field_check_3',
      type: 'checkbox',
      label: 'Czyszczenie podzespołów',
      page: 1,
      x: 6.6,
      y: 43.2,
      width: 3.2,
      height: 2.3,
      defaultValue: false,
    },
    {
      id: 'field_check_4',
      type: 'checkbox',
      label: 'Test sprawności działania',
      page: 1,
      x: 6.6,
      y: 46.2,
      width: 3.2,
      height: 2.3,
      defaultValue: true,
    },
    {
      id: 'field_check_5',
      type: 'checkbox',
      label: 'Instruktaż klienta',
      page: 1,
      x: 6.6,
      y: 49.3,
      width: 3.2,
      height: 2.3,
      defaultValue: true,
    },
    // Photo upload box
    {
      id: 'field_photo_1',
      type: 'image',
      label: 'Zdjęcie urządzenia / naprawy',
      page: 1,
      x: 6.8,
      y: 59.2,
      width: 41.0,
      height: 15.6,
      helpText: 'Kliknij lub dotknij na tablecie, aby zrobić zdjęcie z aparatu lub wybrać z galerii',
    },
    // Notes textarea
    {
      id: 'field_notes',
      type: 'textarea',
      label: 'Uwagi i zalecenia',
      page: 1,
      x: 52.4,
      y: 59.2,
      width: 41.0,
      height: 15.6,
      placeholder: 'Wpisz zalecenia dla klienta lub dodatkowe uwagi...',
    },
    // Signatures
    {
      id: 'field_sig_client',
      type: 'signature',
      label: 'Podpis klienta',
      page: 1,
      x: 6.8,
      y: 81.0,
      width: 41.0,
      height: 10.8,
      helpText: 'Podpis odręczny palcem lub rysikiem na tablecie',
    },
    {
      id: 'field_sig_tech',
      type: 'signature',
      label: 'Podpis serwisanta',
      page: 1,
      x: 52.4,
      y: 81.0,
      width: 41.0,
      height: 10.8,
      helpText: 'Podpis odręczny serwisanta',
    },
  ];

  return { dataUrl, fields };
}

/**
 * Builds the final filled PDF from rendered background page canvases and user input values.
 * This guarantees pristine visual fidelity, matching the tablet layout exactly, and burns in
 * fonts, checkboxes, uploaded photos, and signatures cleanly without overwriting the template!
 */
export async function generateFilledPdf(
  renderedPages: RenderedPage[],
  fields: FormField[],
  values: FilledValues
): Promise<{ blob: Blob; dataUrl: string }> {
  // Determine orientation and size from first page
  const firstPage = renderedPages[0];
  const isLandscape = firstPage.width > firstPage.height;

  const pdf = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [firstPage.width, firstPage.height],
  });

  for (let i = 0; i < renderedPages.length; i++) {
    const page = renderedPages[i];
    const pageNumber = i + 1;

    if (i > 0) {
      pdf.addPage([page.width, page.height], page.width > page.height ? 'landscape' : 'portrait');
    }

    // Create a high-res composition canvas for this page
    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = page.width;
    compositeCanvas.height = page.height;
    const ctx = compositeCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) continue;

    // Draw the background PDF page image
    ctx.drawImage(page.canvas, 0, 0, page.width, page.height);

    // Filter fields for this page
    const pageFields = fields.filter((f) => f.page === pageNumber);

    for (const field of pageFields) {
      const val = values[field.id];
      const fieldLeft = (field.x / 100) * page.width;
      const fieldTop = (field.y / 100) * page.height;
      const fieldWidth = (field.width / 100) * page.width;
      const fieldHeight = (field.height / 100) * page.height;

      if (field.type === 'checkbox') {
        const isChecked = Boolean(val);
        if (isChecked) {
          // Draw a clean checkmark or square indicator
          ctx.save();
          ctx.fillStyle = '#0f172a'; // slate-900
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = Math.max(2, fieldWidth * 0.12);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          // Draw tick
          const padding = fieldWidth * 0.2;
          const startX = fieldLeft + padding;
          const startY = fieldTop + fieldHeight * 0.52;
          const midX = fieldLeft + fieldWidth * 0.42;
          const midY = fieldTop + fieldHeight - padding;
          const endX = fieldLeft + fieldWidth - padding * 0.8;
          const endY = fieldTop + padding * 0.9;

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(midX, midY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
          ctx.restore();
        }
      } else if (field.type === 'image' && typeof val === 'string' && val.startsWith('data:image')) {
        // Draw user uploaded image inside the box preserving aspect ratio or fitting neatly
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            ctx.save();
            ctx.beginPath();
            ctx.rect(fieldLeft, fieldTop, fieldWidth, fieldHeight);
            ctx.clip();

            // Calculate cover or contain fit
            const imgAspect = img.naturalHeight / img.naturalWidth;
            const boxAspect = fieldHeight / fieldWidth;
            let drawW = fieldWidth;
            let drawH = fieldHeight;
            let drawX = fieldLeft;
            let drawY = fieldTop;

            if (imgAspect > boxAspect) {
              drawH = fieldWidth * imgAspect;
              drawY = fieldTop + (fieldHeight - drawH) / 2;
            } else {
              drawW = fieldHeight / imgAspect;
              drawX = fieldLeft + (fieldWidth - drawW) / 2;
            }

            ctx.drawImage(img, drawX, drawY, drawW, drawH);
            ctx.restore();
            resolve();
          };
          img.onerror = () => resolve();
          img.src = val;
        });
      } else if (field.type === 'signature' && typeof val === 'string' && val.startsWith('data:image')) {
        // Draw handwritten signature
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, fieldLeft, fieldTop, fieldWidth, fieldHeight);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = val;
        });
      } else if (field.type === 'radio') {
        // Radio button: draw circular indicator if selected
        const isSelected = Boolean(val);
        ctx.save();
        const centerX = fieldLeft + fieldWidth / 2;
        const centerY = fieldTop + fieldHeight / 2;
        const radius = Math.min(fieldWidth, fieldHeight) * 0.4;

        // Outer ring
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = Math.max(1.5, radius * 0.2);
        ctx.stroke();

        if (isSelected) {
          // Filled center dot
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius * 0.55, 0, Math.PI * 2);
          ctx.fillStyle = '#0f172a';
          ctx.fill();
        }
        ctx.restore();
      } else if (field.type === 'link' && (val || field.linkUrl)) {
        const textStr = String(val || field.linkUrl || field.label);
        ctx.save();
        const baseFontSize = (field.fontSize || 12) * (page.width / 800);
        ctx.font = `600 ${baseFontSize}px 'Plus Jakarta Sans', sans-serif, Arial`;
        ctx.fillStyle = '#2563eb'; // blue-600
        ctx.textBaseline = 'middle';
        const textY = fieldTop + fieldHeight / 2;
        ctx.fillText(textStr, fieldLeft + 4, textY, fieldWidth - 8);

        // Underline
        const textMetrics = ctx.measureText(textStr);
        const textActualWidth = Math.min(textMetrics.width, fieldWidth - 8);
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(fieldLeft + 4, textY + baseFontSize * 0.55);
        ctx.lineTo(fieldLeft + 4 + textActualWidth, textY + baseFontSize * 0.55);
        ctx.stroke();
        ctx.restore();
      } else if ((field.type === 'text' || field.type === 'date') && val) {
        const textStr = String(val);
        ctx.save();
        const baseFontSize = (field.fontSize || 13) * (page.width / 800);
        ctx.font = `600 ${baseFontSize}px 'Plus Jakarta Sans', sans-serif, Arial`;
        ctx.fillStyle = '#0f172a';
        ctx.textBaseline = 'middle';

        let textX = fieldLeft + 6;
        if (field.align === 'center') {
          ctx.textAlign = 'center';
          textX = fieldLeft + fieldWidth / 2;
        } else if (field.align === 'right') {
          ctx.textAlign = 'right';
          textX = fieldLeft + fieldWidth - 6;
        } else {
          ctx.textAlign = 'left';
        }

        const textY = fieldTop + fieldHeight / 2;
        ctx.fillText(textStr, textX, textY, fieldWidth - 12);
        ctx.restore();
      } else if (field.type === 'textarea' && val) {
        const textStr = String(val);
        ctx.save();
        const baseFontSize = (field.fontSize || 12) * (page.width / 800);
        ctx.font = `500 ${baseFontSize}px 'Plus Jakarta Sans', sans-serif, Arial`;
        ctx.fillStyle = '#0f172a';
        ctx.textBaseline = 'top';

        const multiplier = field.lineHeight && field.lineHeight > 0 ? field.lineHeight : 1.35;
        const lineHeight = baseFontSize * multiplier;
        const maxWidth = fieldWidth - 10;

        let startX = fieldLeft + 5;
        if (field.align === 'center') {
          ctx.textAlign = 'center';
          startX = fieldLeft + fieldWidth / 2;
        } else if (field.align === 'right') {
          ctx.textAlign = 'right';
          startX = fieldLeft + fieldWidth - 5;
        } else {
          ctx.textAlign = 'left';
        }

        const paragraphs = textStr.split('\n');
        let lineY = fieldTop + 6;

        outer: for (const para of paragraphs) {
          if (para.trim() === '') {
            lineY += lineHeight * 0.8;
            if (lineY + lineHeight > fieldTop + fieldHeight) break outer;
            continue;
          }

          const words = para.split(' ');
          let currentLine = '';

          for (let n = 0; n < words.length; n++) {
            const testLine = currentLine ? currentLine + ' ' + words[n] : words[n];
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && currentLine) {
              ctx.fillText(currentLine, startX, lineY, maxWidth);
              currentLine = words[n];
              lineY += lineHeight;
              if (lineY + lineHeight > fieldTop + fieldHeight) {
                currentLine = '';
                break outer;
              }
            } else {
              currentLine = testLine;
            }
          }

          if (currentLine && lineY + lineHeight <= fieldTop + fieldHeight + 5) {
            ctx.fillText(currentLine, startX, lineY, maxWidth);
            lineY += lineHeight;
            if (lineY + lineHeight > fieldTop + fieldHeight) break outer;
          }
        }

        ctx.restore();
      }
    }

    const composedDataUrl = compositeCanvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(composedDataUrl, 'JPEG', 0, 0, page.width, page.height);
  }

  const blob = pdf.output('blob');
  const dataUrl = pdf.output('dataurlstring');
  return { blob, dataUrl };
}
