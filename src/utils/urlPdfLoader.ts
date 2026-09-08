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
  // Google Drive direct usercontent download link with confirm=t
  return `https://drive.usercontent.google.com/download?id=${fileId}&export=download&authuser=0&confirm=t`;
}

/**
 * Reads a PDF file directly from local disk / file input
 */
export async function readPdfFileFromDisk(file: File): Promise<{ dataUrl: string; fileName: string }> {
  return new Promise((resolve, reject) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      reject(new Error('Wybrany plik nie jest dokumentem PDF (wymagane rozszerzenie .pdf).'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      // Quick check if starts with data:application/pdf or data:application/octet-stream
      resolve({
        dataUrl: res,
        fileName: file.name,
      });
    };
    reader.onerror = () => reject(new Error('Błąd podczas wczytywania pliku z dysku.'));
    reader.readAsDataURL(file);
  });
}

export async function fetchPdfFromUrl(inputUrl: string): Promise<{ dataUrl: string; fileName: string }> {
  const cleanUrl = inputUrl.trim();
  if (!cleanUrl) {
    throw new Error('Proszę podać prawidłowy adres URL lub link Google Drive.');
  }

  const googleId = extractGoogleDriveId(cleanUrl);
  let derivedFileName = 'dokument_google_drive.pdf';

  const targetsToTry: string[] = [];

  if (googleId) {
    derivedFileName = `dysk_google_${googleId.slice(0, 8)}.pdf`;
    targetsToTry.push(
      `https://drive.usercontent.google.com/download?id=${googleId}&export=download&authuser=0&confirm=t`,
      `https://drive.google.com/uc?export=download&id=${googleId}&confirm=t`,
      `https://docs.google.com/uc?export=download&id=${googleId}`
    );
  } else {
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
    targetsToTry.push(cleanUrl);
  }

  // Construct URLs with robust CORS proxies
  const candidateUrls: string[] = [];

  for (const target of targetsToTry) {
    // 1. Direct fetch (works if already CORS-enabled or same-origin)
    candidateUrls.push(target);
    // 2. CodeTabs proxy
    candidateUrls.push(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}`);
    // 3. CorsProxy.io
    candidateUrls.push(`https://corsproxy.io/?url=${encodeURIComponent(target)}`);
    candidateUrls.push(`https://corsproxy.io/?${encodeURIComponent(target)}`);
    // 4. AllOrigins proxy
    candidateUrls.push(`https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`);
  }

  let arrayBuffer: ArrayBuffer | null = null;

  for (const urlToTry of candidateUrls) {
    try {
      const resp = await fetch(urlToTry);
      if (!resp.ok) continue;

      const buffer = await resp.arrayBuffer();
      if (!buffer || buffer.byteLength < 50) continue;

      // Check strictly if buffer starts with %PDF
      const headerBytes = new Uint8Array(buffer.slice(0, 5));
      const headerStr = String.fromCharCode(...headerBytes);
      if (headerStr.startsWith('%PDF')) {
        arrayBuffer = buffer;
        break;
      }
    } catch {
      // Continue to next candidate
    }
  }

  if (!arrayBuffer) {
    if (googleId) {
      throw new Error(
        'Nie udało się automatycznie pobrać pliku z Google Drive ze względu na zabezpieczenia dostępu. Upewnij się, że plik ma włączone udostępnianie ("Każda osoba mająca link ma dostęp do przeglądania") LUB pobierz plik na dysk i użyj opcji "Wczytaj z dysku".'
      );
    }
    throw new Error(
      'Nie udało się pobrać pliku PDF z podanego adresu URL. Sprawdź poprawność linku lub wgraj plik bezpośrednio z dysku komputera.'
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
