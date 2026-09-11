# Adal Guest Book 2026 - MAPIC Form

A tablet-optimized web application for filling out the Adal Guest Book 2026 PDF form at the MAPIC trade show. It provides a clean, user-friendly interface for guests to enter their information, upload photos, and sign digitally.

## Features

- **Tablet-First UI**: Designed for easy data entry on touch devices with a responsive, multi-page layout.
- **Bilingual Interface**: Seamless switching between Polish (PL) and English (ENG).
- **Interactive Form Filling**: Support for text inputs, checkboxes, radio buttons, digital signatures, and image/business card uploads.
- **Template Designer Mode**: A secure admin mode (accessed via a multi-click password sequence) to visually configure and map form fields onto the PDF layout.
- **Offline Storage**: Uses IndexedDB to store form templates and user submissions locally.
- **Custom PDF Generation**: Uses `jspdf` to precisely generate the filled 2-page Adal Guest Book document.
- **Automatic PDF Loading**: Automatically detects and loads the default `2026_Targi_MAPIC_GuestBook_Adal_02_Formularz.pdf` template from the repository.

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Lucide React (Icons)
- **PDF Handling**: `pdfjs-dist` for rendering template backgrounds, `jspdf` for generating the final output document.
- **Animations**: `canvas-confetti` (for submission success effects), Framer Motion (`motion`).
- **AI Integration**: `@google/genai` (included for potential Gemini AI parsing features).

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer)
- [Bun](https://bun.sh/) (Optional, recommended since `bun.lock` is present)

### Installation

1. Clone the repository and navigate into the directory:
   ```bash
   cd adal-guest-book-main
   ```

2. Install dependencies using Bun or npm:
   ```bash
   bun install
   # or
   npm install
   ```

3. (Optional) Create a `.env` file based on `.env.example` if you need to use Gemini AI features:
   ```bash
   cp .env.example .env
   # Add your GEMINI_API_KEY
   ```

### Running the App

Start the development server:
```bash
bun run dev
# or
npm run dev
```
The app will be available at `http://localhost:3000` on your local network.

### Building for Production

To build the application for deployment:
```bash
bun run build
# or
npm run build
```

## Usage

- **Guest Mode (Tablet Filler)**: 
  Guests can intuitively tap and fill out the fields, switch languages, upload business cards, and sign the form. Upon submission, the app securely saves the data and can generate the final PDF.
- **Admin Mode (Template Designer)**: 
  Administrators can access the Designer mode by tapping the lock icon multiple times and entering the PIN. From here, new fields can be added, positioned, and resized directly over the PDF template pages.

## License

Private / Proprietary.
