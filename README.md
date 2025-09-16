# Lightweight PDF Merger (Static Web App)

A tiny, client-only PDF merger that runs fully in your browser using [pdf-lib]. No server, no uploads. Perfect for Vercel static hosting.

## Features
- Merge multiple PDFs in the browser (privacy-friendly)
- Unique gradient card designs per file
- Reorder with up/down controls, remove files easily
- Stylish animated progress bar
- Zero build step — deploy as static site

## Local Usage
1. Open `index.html` in your browser, or use a simple static server.
2. Drag-and-drop PDF files or click the drop area to select.
3. Reorder as needed, then click **Merge PDFs**.

## Deploy to Vercel
1. Push these files to a Git repository (e.g., GitHub).
2. Go to Vercel → New Project → Import your repo.
3. Framework preset: `Other` (Static Site).
4. Build Command: leave empty. Output Directory: `.` (repo root).
5. Deploy.

That’s it — Vercel will serve your `index.html` as a static site.

## Notes
- Merging happens entirely on-device. Large files may be limited by your browser memory.
- For very large PDFs or advanced features (page selection, thumbnails), consider a small backend service, but this project keeps it client-only and lightweight.

[pdf-lib]: https://github.com/Hopding/pdf-lib