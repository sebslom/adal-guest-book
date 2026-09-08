import { jsPDF } from 'jspdf';
import { FilledValues, FormField } from '../types';

/**
 * Generates the official 2-page Adal decorations Guest Book 2026 PDF
 * matching the design attached by the user.
 */
export async function generateAdalGuestBookPdf(
  values: FilledValues,
  fields: FormField[]
): Promise<{ doc: jsPDF; fileName: string; blob: Blob; dataUrl: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm

  const getValue = (id: string): string => {
    const val = values[id];
    return typeof val === 'string' ? val : '';
  };

  const isChecked = (id: string): boolean => {
    return Boolean(values[id]);
  };

  // =========================================================================
  // PAGE 1
  // =========================================================================
  // Adal Logo (vector lines)
  doc.setDrawColor(20, 20, 20);
  doc.setFillColor(20, 20, 20);

  // Logo text 'Adal'
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.text('Adal', 20, 26);

  // Star sparkle above 'd'
  doc.setFontSize(14);
  doc.text('✦', 31, 14);

  // 'decorations'
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.text('d e c o r a t i o n s', 20, 31);

  // GUEST BOOK 2026
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text('GUEST BOOK ', 20, 42);
  const gbWidth = doc.getTextWidth('GUEST BOOK ');
  doc.setFont('helvetica', 'normal');
  doc.text('2026', 20 + gbWidth, 42);

  // MAPIC 3 - 4.11.2026
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text('MAPIC 3 - 4.11.2026', 20, 48);

  // Top-Right PROJECT rounded box
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);
  doc.roundedRect(98, 12, 92, 54, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(140, 140, 140);
  doc.text('PROJECT', 174, 62);

  // If there's a sketch in the project box
  const projectBoxVal = values['p1_project_box'];
  if (typeof projectBoxVal === 'string' && projectBoxVal.startsWith('data:image')) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(98.2, 12.2, 91.6, 53.6, 2.5, 2.5, 'F');
      doc.addImage(projectBoxVal, 'PNG', 99, 13, 90, 46);
    } catch {
      // ignore
    }
  }

  // Row 1: Date & Contact Person
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(20, 20, 20);
  doc.text('Date:', 20, 78);
  doc.setLineWidth(0.25);
  doc.line(31, 79, 82, 79);

  doc.text('Contact Person:', 86, 78);
  doc.line(114, 79, 190, 79);

  // Row 2: Country & Company Name
  doc.text('Country:', 20, 90);
  doc.line(36, 91, 89, 91);

  doc.text('Company Name:', 93, 90);
  doc.line(123, 91, 190, 91);

  // Row 3: Email & Phone
  doc.text('Email:', 20, 102);
  doc.line(32, 103, 104, 103);

  doc.text('Phone:', 108, 102);
  doc.line(121, 103, 190, 103);

  // Row 4: Catalogue to send
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Catalogue to send:', 20, 114);

  // [ ] Digital
  doc.rect(60, 111, 3.8, 3.8, 'S');
  doc.text('Digital', 66, 114);

  // [ ] Printed
  doc.rect(81, 111, 3.8, 3.8, 'S');
  doc.text('Printed', 87, 114);

  // Separator |
  doc.setDrawColor(180, 180, 180);
  doc.line(101, 110, 101, 116);
  doc.setDrawColor(100, 100, 100);

  // [ ] Christmas trees & greenery products
  doc.rect(107, 111, 3.8, 3.8, 'S');
  doc.text('Christmas trees & greenery products', 113, 114);

  // [ ] Decor products
  doc.rect(162, 111, 3.8, 3.8, 'S');
  doc.text('Decor products', 168, 114);

  // Row 5: Adress line 1
  doc.text('Adress line 1:', 20, 126);
  doc.line(46, 127, 190, 127);

  // Row 6: Adress line 2
  doc.text('Adress line 2:', 20, 137);
  doc.line(46, 138, 190, 138);

  // Seasonal decorations question
  doc.text('Are you insterested in seasonal decorations?', 20, 149);
  doc.rect(111, 146, 3.8, 3.8, 'S');
  doc.text('Yes', 117, 149);

  doc.rect(128, 146, 3.8, 3.8, 'S');
  doc.text('No', 134, 149);

  doc.setFont('helvetica', 'italic');
  doc.setTextColor(90, 90, 90);
  doc.text('If yes, please specify which', 154, 149);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(20, 20, 20);

  // Seasonal options
  const seasonalOptions = [
    { label: "Valentine's Day", xBox: 22, xText: 28 },
    { label: 'Easter', xBox: 58, xText: 64 },
    { label: 'Spring', xBox: 87, xText: 93 },
    { label: 'Summer', xBox: 114, xText: 120 },
    { label: 'Halloween', xBox: 142, xText: 148 },
    { label: 'Autumn', xBox: 172, xText: 178 },
  ];
  seasonalOptions.forEach((opt) => {
    doc.rect(opt.xBox, 157, 3.8, 3.8, 'S');
    doc.text(opt.label, opt.xText, 160);
  });

  // Showroom visit
  doc.text('Would you like to visit our ofice and showroom?', 20, 172);
  doc.rect(111, 169, 3.8, 3.8, 'S');
  doc.text('Yes', 117, 172);

  doc.rect(128, 169, 3.8, 3.8, 'S');
  doc.text('No', 134, 172);

  doc.setFont('helvetica', 'italic');
  doc.setTextColor(90, 90, 90);
  doc.text('If yes, please specify a preferred time period:', 20, 182);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(20, 20, 20);
  doc.line(87, 183, 190, 183);

  // Notes / Project Ideas Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Notes / Project Ideas', 105, 196, { align: 'center' });

  // 14 Ruled Lines
  doc.setDrawColor(130, 130, 130);
  doc.setLineWidth(0.22);
  const p1LineStarts = [
    205, 211, 217, 223, 229, 235, 241, 247, 253, 259, 265, 271, 277, 283
  ];
  p1LineStarts.forEach((y) => {
    doc.line(20, y, 190, y);
  });

  // Page 1 Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(110, 110, 110);
  doc.text(
    'ADAL Sp. z o.o.  •  Koziegłówki, ul. Lipowa 72  •  42-350 Koziegłowy  •  POLAND  •  adal-decorations.pl',
    105,
    291,
    { align: 'center' }
  );

  // ---------------- FILL PAGE 1 VALUES ----------------
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(10, 30, 80); // stylish dark navy for filled text

  // Date
  doc.text(getValue('p1_date'), 33, 78);
  // Contact Person
  doc.text(getValue('p1_contact_person'), 116, 78);
  // Country
  doc.text(getValue('p1_country'), 38, 90);
  // Company Name
  doc.text(getValue('p1_company_name'), 125, 90);
  // Email
  doc.text(getValue('p1_email'), 34, 102);
  // Phone
  doc.text(getValue('p1_phone'), 123, 102);

  // Helper to draw clean checkmark
  const drawCheck = (x: number, y: number) => {
    doc.setDrawColor(15, 80, 200);
    doc.setLineWidth(0.55);
    doc.line(x + 0.6, y + 1.8, x + 1.6, y + 3.1);
    doc.line(x + 1.6, y + 3.1, x + 3.4, y + 0.6);
  };

  if (isChecked('p1_cat_digital')) drawCheck(60, 111);
  if (isChecked('p1_cat_printed')) drawCheck(81, 111);
  if (isChecked('p1_cat_trees')) drawCheck(107, 111);
  if (isChecked('p1_cat_decor')) drawCheck(162, 111);

  // Address lines
  doc.text(getValue('p1_address_1'), 48, 126);
  doc.text(getValue('p1_address_2'), 48, 137);

  // Seasonal checks
  if (isChecked('p1_seasonal_yes')) drawCheck(111, 146);
  if (isChecked('p1_seasonal_no')) drawCheck(128, 146);
  if (isChecked('p1_seasonal_val')) drawCheck(22, 157);
  if (isChecked('p1_seasonal_easter')) drawCheck(58, 157);
  if (isChecked('p1_seasonal_spring')) drawCheck(87, 157);
  if (isChecked('p1_seasonal_summer')) drawCheck(114, 157);
  if (isChecked('p1_seasonal_halloween')) drawCheck(142, 157);
  if (isChecked('p1_seasonal_autumn')) drawCheck(172, 157);

  // Showroom checks
  if (isChecked('p1_visit_yes')) drawCheck(111, 169);
  if (isChecked('p1_visit_no')) drawCheck(128, 169);
  doc.text(getValue('p1_visit_period'), 89, 182);

  // Page 1 Notes split into lines
  const p1Notes = getValue('p1_notes');
  if (p1Notes) {
    const lines = doc.splitTextToSize(p1Notes, 168);
    lines.slice(0, 14).forEach((line: string, idx: number) => {
      const textW = doc.getTextWidth(line);
      doc.setFillColor(255, 255, 255);
      doc.rect(20.5, p1LineStarts[idx] - 3.8, Math.min(168, textW + 2), 4.2, 'F');
      doc.text(line, 21, p1LineStarts[idx] - 1.2);
    });
  }

  // =========================================================================
  // PAGE 2
  // =========================================================================
  doc.addPage('a4', 'portrait');

  // Header Left: GUEST BOOK 2026
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text('GUEST BOOK ', 20, 22);
  const gbWidth2 = doc.getTextWidth('GUEST BOOK ');
  doc.setFont('helvetica', 'normal');
  doc.text('2026', 20 + gbWidth2, 22);

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text('MAPIC 3 - 4.11.2026', 20, 28);

  // Header Right: Adal logo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(20, 20, 20);
  doc.text('Adal', 165, 23);
  doc.setFontSize(12);
  doc.text('✦', 174, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text('d e c o r a t i o n s', 165, 27);

  // Notes / Project Ideas title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text('Notes / Project Ideas', 105, 38, { align: 'center' });

  // 19 Ruled Lines for Page 2
  doc.setDrawColor(130, 130, 130);
  doc.setLineWidth(0.22);
  const p2LineStarts = [
    46, 52, 58, 64, 70, 76, 82, 88, 94, 100, 106, 112, 118, 124, 130, 136, 142, 148, 154
  ];
  p2LineStarts.forEach((y) => {
    doc.line(20, y, 190, y);
  });

  // Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Summary', 20, 168);

  // Project Budget
  doc.setFontSize(9.5);
  doc.text('Project Budget:', 20, 177);
  doc.line(49, 178, 190, 178);

  // Deadline
  doc.text('Deadline:', 20, 188);
  doc.line(38, 189, 190, 189);

  // Sales Season
  doc.text('Sales Season:', 20, 200);
  // Q1, Q2, Q3, Q4 boxes
  const seasons = [
    { label: 'Q1', x: 50 },
    { label: 'Q2', x: 63 },
    { label: 'Q3', x: 76 },
    { label: 'Q4', x: 89 },
  ];
  seasons.forEach((s) => {
    doc.rect(s.x, 195, 9, 8.5, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(s.label, s.x + 4.5, 200.5, { align: 'center' });
  });

  // Project Type
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('Project Type:', 20, 212);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  // Row 1
  doc.rect(50, 209, 3.8, 3.8, 'S');
  doc.text('City', 56, 212);

  doc.rect(71, 209, 3.8, 3.8, 'S');
  doc.text('Shopping Center', 77, 212);

  doc.rect(102, 209, 3.8, 3.8, 'S');
  doc.text('Other', 108, 212);

  // Other box
  doc.roundedRect(127, 207, 63, 10, 2, 2, 'S');

  // Row 2
  doc.rect(50, 217, 3.8, 3.8, 'S');
  doc.text('Event', 56, 220);

  doc.rect(71, 217, 3.8, 3.8, 'S');
  doc.text('Hotel / Resort', 77, 220);

  doc.rect(102, 217, 3.8, 3.8, 'S');
  doc.text('Retail Chain', 108, 220);

  // Survey
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Survey', 20, 232);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text('Please select only two boxes, specifying', 190, 229, { align: 'right' });
  doc.text('which is more important to you (1, 2).', 190, 233, { align: 'right' });

  // Survey Q1
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  doc.text('What is most important to you as our bussines partner?', 20, 240);

  const surveyOpts = [
    { label: 'Price', xBox: 22, xText: 27 },
    { label: 'Quality', xBox: 40, xText: 45 },
    { label: 'Production speed', xBox: 59, xText: 64 },
    { label: 'Design', xBox: 91, xText: 96 },
    { label: 'Other', xBox: 110, xText: 115 },
  ];

  surveyOpts.forEach((o) => {
    doc.rect(o.xBox, 244, 3.8, 3.8, 'S');
    doc.text(o.label, o.xText, 247);
  });
  doc.roundedRect(127, 242, 63, 9, 2, 2, 'S');

  // Survey Q2
  doc.text('What do you value ADAL for?', 20, 255);
  surveyOpts.forEach((o) => {
    doc.rect(o.xBox, 259, 3.8, 3.8, 'S');
    doc.text(o.label, o.xText, 262);
  });
  doc.roundedRect(127, 257, 63, 9, 2, 2, 'S');

  // Survey Q3
  doc.text('What, in your opinion, can we improve?', 20, 270);
  surveyOpts.forEach((o) => {
    doc.rect(o.xBox, 274, 3.8, 3.8, 'S');
    doc.text(o.label, o.xText, 277);
  });
  doc.roundedRect(127, 272, 63, 9, 2, 2, 'S');

  // Page 2 Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(110, 110, 110);
  doc.text(
    'ADAL Sp. z o.o.  •  Koziegłówki, ul. Lipowa 72  •  42-350 Koziegłowy  •  POLAND  •  adal-decorations.pl',
    105,
    291,
    { align: 'center' }
  );

  // ---------------- FILL PAGE 2 VALUES ----------------
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(10, 30, 80);

  // Page 2 Notes
  const p2Notes = getValue('p2_notes');
  if (p2Notes) {
    const lines = doc.splitTextToSize(p2Notes, 168);
    lines.slice(0, 19).forEach((line: string, idx: number) => {
      const textW = doc.getTextWidth(line);
      doc.setFillColor(255, 255, 255);
      doc.rect(20.5, p2LineStarts[idx] - 3.8, Math.min(168, textW + 2), 4.2, 'F');
      doc.text(line, 21, p2LineStarts[idx] - 1.2);
    });
  }

  // Budget & Deadline
  doc.text(getValue('p2_budget'), 51, 177);
  doc.text(getValue('p2_deadline'), 40, 188);

  // Season checks
  if (isChecked('p2_season_q1')) drawCheck(52.5, 197);
  if (isChecked('p2_season_q2')) drawCheck(65.5, 197);
  if (isChecked('p2_season_q3')) drawCheck(78.5, 197);
  if (isChecked('p2_season_q4')) drawCheck(91.5, 197);

  // Project Type checks
  if (isChecked('p2_type_city')) drawCheck(50, 209);
  if (isChecked('p2_type_shopping')) drawCheck(71, 209);
  if (isChecked('p2_type_other')) drawCheck(102, 209);
  doc.text(getValue('p2_type_other_text'), 129, 213);

  if (isChecked('p2_type_event')) drawCheck(50, 217);
  if (isChecked('p2_type_hotel')) drawCheck(71, 217);
  if (isChecked('p2_type_retail')) drawCheck(102, 217);

  // Survey S1 checks & rank
  if (isChecked('p2_s1_price')) drawCheck(22, 244);
  if (isChecked('p2_s1_quality')) drawCheck(40, 244);
  if (isChecked('p2_s1_speed')) drawCheck(59, 244);
  if (isChecked('p2_s1_design')) drawCheck(91, 244);
  if (isChecked('p2_s1_other')) drawCheck(110, 244);
  doc.text(getValue('p2_s1_rank_box'), 129, 248);

  // Survey S2 checks & rank
  if (isChecked('p2_s2_price')) drawCheck(22, 259);
  if (isChecked('p2_s2_quality')) drawCheck(40, 259);
  if (isChecked('p2_s2_speed')) drawCheck(59, 259);
  if (isChecked('p2_s2_design')) drawCheck(91, 259);
  if (isChecked('p2_s2_other')) drawCheck(110, 259);
  doc.text(getValue('p2_s2_rank_box'), 129, 263);

  // Survey S3 checks & rank
  if (isChecked('p2_s3_price')) drawCheck(22, 274);
  if (isChecked('p2_s3_quality')) drawCheck(40, 274);
  if (isChecked('p2_s3_speed')) drawCheck(59, 274);
  if (isChecked('p2_s3_design')) drawCheck(91, 274);
  if (isChecked('p2_s3_other')) drawCheck(110, 274);
  doc.text(getValue('p2_s3_rank_box'), 129, 278);

  // Also iterate any custom added fields if created by the user in designer mode
  fields.forEach((f) => {
    // If it's not one of standard fields already handled above
    if (f.id.startsWith('field_')) {
      const val = values[f.id];
      if (val !== undefined && val !== false && val !== '') {
        doc.setPage(f.page);
        const mmX = (f.x / 100) * pageWidth;
        const mmY = (f.y / 100) * pageHeight;
        if (f.type === 'checkbox' && val === true) {
          drawCheck(mmX, mmY);
        } else if (typeof val === 'string') {
          doc.setFontSize(8.5);
          doc.text(val, mmX + 1, mmY + 3);
        }
      }
    }
  });

  // Generate safe filename
  const company = (getValue('p1_company_name') || getValue('p1_contact_person') || 'gosc')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 30);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const fileName = `Adal_GuestBook_2026_${company}_${dateStamp}.pdf`;

  const blob = doc.output('blob');
  const dataUrl = doc.output('datauristring');

  return { doc, fileName, blob, dataUrl };
}
