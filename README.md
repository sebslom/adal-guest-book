# PDF Form

Language / Język: [English](#english) | [Polski](#polski)

---

## English

A tablet-optimized web application for filling out the PDF form. It provides a user-friendly interface for guests to enter information, upload photos, and sign digitally.

### Features
* **Tablet-First UI**: Designed for easy data entry on touch devices with a responsive layout.
* **Bilingual Interface**: Seamless switching between Polish (PL) and English (ENG).
* **Interactive Form**: Support for text inputs, checkboxes, digital signatures, and image uploads.
* **Template Designer Mode**: Secure admin mode to visually configure and map form fields onto the PDF.
* **Offline Storage**: Uses IndexedDB to store templates and user submissions locally.
* **PDF Generation**: Uses jspdf to precisely generate the filled 2-page document.
* **Automatic PDF Loading**: Loads the default template directly from the repository.

### User Guide
1. **Loading**: The page automatically loads the default PDF as a fillable form.
2. **Filling**: The user fills out the project fields (images/graphics from disk), text fields (date, name), and checkboxes (catalog selection, season). Navigation arrows, zoom, and language settings are available on the right side.
3. **Saving**: Click the orange "Save to disk / Zapisz na dysku" button to download the completed PDF.
4. **Resetting**: Click the white "Reset form / Od nowa formularz" button to clear all inputs.

---

## Polski

Aplikacja webowa zoptymalizowana pod kątem tabletów, przeznaczona do wypełniania formularza PDF. Zapewnia przejrzysty interfejs umożliwiający gościom wprowadzanie danych, przesyłanie zdjęć oraz składanie podpisu cyfrowego.

### Funkcje
* **Interfejs dla tabletów**: Zaprojektowany do łatwego wprowadzanie danych na urządzeniach dotykowych.
* **Dwujęzyczność**: Płynne przełączanie pomiędzy językiem polskim (PL) a angielskim (ENG).
* **Interaktywny formularz**: Obsługa pól tekstowych, checkboxów, podpisów cyfrowych oraz dodawania grafiki.
* **Tryb projektanta**: Bezpieczny tryb administratora do wizualnej konfiguracji i mapowania pól na układzie PDF.
* **Pamięć offline**: Wykorzystuje IndexedDB do lokalnego przechowywania szablonów i wpisów.
* **Generowanie PDF**: Używa biblioteki jspdf do dokładnego wygenerowania 2-stronicowego dokumentu.
* **Automatyczne ładowanie**: Pobiera domyślny plik szablonu z repozytorium.

### Instrukcja obsługi
1. **Ładowanie**: Strona domyślnie ładuje plik PDF jako formularz do uzupełnienia.
2. **Wypełnianie**: Odbiorca uzupełnia pola projektu (zdjęcia/grafiki z dysku), pola tekstowe (data, dane osobowe) oraz pola do zaznaczenia (katalog, sezon). Nawigacja strzałkami, przybliżanie i zmiana języka UI znajdują się po prawej stronie.
3. **Zapisywanie**: Kliknięcie pomarańczowego przycisku „Save to disk / Zapisz na dysku” zapisuje gotowy plik na komputerze.
4. **Resetowanie**: Kliknięcie białego przycisku „Reset form / Od nowa formularz” czyści cały dokument.
