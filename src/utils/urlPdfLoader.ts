/**
 * Helper to download and parse PDFs from Google Drive or direct web links
 */

export function extractGoogleDriveId(url: string): string | null {
  const clean = url.trim();

  // If user pasted just an ID
  if (/^[a-zA-Z0-9_-]{25,}$/.test(clean)) {
    return clean;
  }

  // /file/d/ID/view or /file/d/ID
  const fileDMatch = clean.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1];

  // /d/ID/
  const dMatch = clean.match(/\/d\/([a-zA-Z0-9_-]+)/i);
  if (dMatch && dMatch[1]) return dMatch[1];

  // ?id=ID or &id=ID
  const idParamMatch = clean.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (idParamMatch && idParamMatch[1]) return idParamMatch[1];

  // docs.google.com/document/d/ID
  const docsMatch = clean.match(/document\/d\/([a-zA-Z0-9_-]+)/i);
  if (docsMatch && docsMatch[1]) return docsMatch[1];

  return null;
}

export function buildGoogleDriveDirectUrl(fileId: string): string {
  // Google Drive export download link
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

export async function fetchPdfFromUrl(inputUrl: string): Promise<{ dataUrl: string; fileName: string }> {
  const cleanUrl = inputUrl.trim();
  if (!cleanUrl) {
    throw new Error('Proszę podać prawidłowy adres URL lub link Google Drive.');
  }

  const googleId = extractGoogleDriveId(cleanUrl);
  let targetUrl = cleanUrl;
  let derivedFileName = 'dokument_google_drive.pdf';

  if (googleId) {
    targetUrl = buildGoogleDriveDirectUrl(googleId);
    derivedFileName = `dysk_google_${googleId.slice(0, 8)}.pdf`;
  } else {
    // Extract filename from URL path if possible
    try {
      const parsed = new URL(cleanUrl);
      const pathSegments = parsed.pathname.split('/');
      const last = pathSegments[pathSegments.length - 1];
      if (last && last.toLowerCase().endsWith('.pdf')) {
        derivedFileName = decodeURIComponent(last);
      } else {
        derivedFileName = 'dokument_z_linku.pdf';
      }
    } catch {
      derivedFileName = 'dokument_z_linku.pdf';
    }
  }

  // Fetch strategy with CORS proxy fallbacks to ensure it works anywhere (GitHub Pages, preview, etc.)
  const candidateUrls: string[] = [
    targetUrl,
    // CORS proxy 1
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
    // CORS proxy 2
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
  ];

  let lastError: unknown = null;
  let arrayBuffer: ArrayBuffer | null = null;

  for (const urlToTry of candidateUrls) {
    try {
      const resp = await fetch(urlToTry);
      if (!resp.ok) {
        continue;
      }
      const buffer = await resp.arrayBuffer();
      // Check if it looks like a PDF (starts with %PDF)
      const headerBytes = new Uint8Array(buffer.slice(0, 5));
      const headerStr = String.fromCharCode(...headerBytes);
      if (headerStr.startsWith('%PDF')) {
        arrayBuffer = buffer;
        break;
      }
      // If it returned HTML instead of PDF (e.g. Google Drive virus scan warning for very large files or login page),
      // we check if we got binary data
      if (buffer.byteLength > 1000) {
        arrayBuffer = buffer;
        break;
      }
    } catch (e) {
      lastError = e;
    }
  }

  if (!arrayBuffer) {
    if (googleId) {
      throw new Error(
        'Nie udało się pobrać pliku z Dysku Google. Upewnij się, że plik ma włączone udostępnianie: "Każda osoba mająca link może przeglądać".'
      );
    }
    throw new Error(
      'Nie udało się pobrać pliku PDF z podanego linku. Sprawdź, czy adres jest poprawny i publicznie dostępny.'
    );
  }

  // Convert ArrayBuffer to Data URL
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        dataUrl: reader.result as string,
        fileName: derivedFileName,
      });
    };
    reader.onerror = () => reject(new Error('Błąd odczytu danych pliku PDF.'));
    reader.readAsDataURL(blob);
  });
}
