// Lightweight client-side PDF merger using pdf-lib
// - No server required
// - Works on Vercel as a static deployment

const state = {
  items: [], // [{ id: string, file: File }]
};

const els = {
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('file-input'),
  cards: document.getElementById('cards'),
  mergeBtn: document.getElementById('merge-btn'),
  clearBtn: document.getElementById('clear-btn'),
  overlay: document.getElementById('progress-overlay'),
  progressFill: document.getElementById('progress-fill'),
  progressLabel: document.getElementById('progress-label'),
};

function uid() { return Math.random().toString(36).slice(2, 10); }

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function setButtons() {
  const hasItems = state.items.length > 0;
  els.mergeBtn.disabled = !hasItems;
  els.clearBtn.disabled = !hasItems;
}

function renderCards() {
  els.cards.innerHTML = '';
  state.items.forEach((item, idx) => {
    const hue = (idx * 37 + 200) % 360; // unique-ish per position
    const card = document.createElement('div');
    card.className = 'card';
    card.style.setProperty('--hue', String(hue));

    const header = document.createElement('div');
    header.className = 'card-header';

    const title = document.createElement('h3');
    title.className = 'card-title';
    title.title = item.file.name;
    title.textContent = item.file.name;

    const meta = document.createElement('div');
    meta.className = 'card-meta';
    meta.textContent = formatBytes(item.file.size);

    header.appendChild(title);
    header.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const upBtn = document.createElement('button');
    upBtn.className = 'icon-btn';
    upBtn.title = 'Move up';
    upBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>';
    upBtn.disabled = idx === 0;
    upBtn.addEventListener('click', () => moveItem(idx, idx - 1));

    const downBtn = document.createElement('button');
    downBtn.className = 'icon-btn';
    downBtn.title = 'Move down';
    downBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
    downBtn.disabled = idx === state.items.length - 1;
    downBtn.addEventListener('click', () => moveItem(idx, idx + 1));

    const removeBtn = document.createElement('button');
    removeBtn.className = 'icon-btn danger';
    removeBtn.title = 'Remove';
    removeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
    removeBtn.addEventListener('click', () => removeItem(item.id));

    actions.appendChild(upBtn);
    actions.appendChild(downBtn);
    actions.appendChild(removeBtn);

    card.appendChild(header);
    card.appendChild(actions);
    els.cards.appendChild(card);
  });
  setButtons();
}

function addFiles(files) {
  const pdfs = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
  // De-duplicate by name+size within current session
  const existing = new Set(state.items.map(i => `${i.file.name}::${i.file.size}`));
  const newItems = [];
  for (const file of pdfs) {
    const key = `${file.name}::${file.size}`;
    if (!existing.has(key)) {
      newItems.push({ id: uid(), file });
      existing.add(key);
    }
  }
  state.items.push(...newItems);
  renderCards();
}

function moveItem(from, to) {
  if (to < 0 || to >= state.items.length) return;
  const [it] = state.items.splice(from, 1);
  state.items.splice(to, 0, it);
  renderCards();
}

function removeItem(id) {
  state.items = state.items.filter(x => x.id !== id);
  renderCards();
}

function clearAll() {
  state.items = [];
  renderCards();
}

// Drag & drop handlers
function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }
['dragenter','dragover','dragleave','drop'].forEach(ev => {
  els.dropzone.addEventListener(ev, preventDefaults);
});
['dragenter','dragover'].forEach(ev => {
  els.dropzone.addEventListener(ev, () => els.dropzone.classList.add('is-drag'));
});
['dragleave','drop'].forEach(ev => {
  els.dropzone.addEventListener(ev, () => els.dropzone.classList.remove('is-drag'));
});

els.dropzone.addEventListener('drop', (e) => {
  const dt = e.dataTransfer;
  if (dt && dt.files) addFiles(dt.files);
});

els.fileInput.addEventListener('change', (e) => {
  addFiles(e.target.files);
  // reset input so selecting the same files again fires 'change'
  e.target.value = '';
});

els.clearBtn.addEventListener('click', clearAll);

els.mergeBtn.addEventListener('click', async () => {
  if (state.items.length === 0) return;
  try {
    showProgress(0);
    const { PDFDocument } = window.PDFLib;

    // Batch size: process N files at a time to lower peak memory usage
    const BATCH_SIZE = 5; // tune if needed
    const total = state.items.length;
    let processed = 0;

    // Create a master doc we will append to
    const master = await PDFDocument.create();

    // Helper: merge a slice of files into a temporary doc and append pages to master
    async function processBatch(start, end) {
      const chunk = state.items.slice(start, end);
      // Process files sequentially within the batch to control memory
      for (const item of chunk) {
        const buf = await item.file.arrayBuffer();
        const src = await PDFDocument.load(buf);
        const copied = await master.copyPages(src, src.getPageIndices());
        copied.forEach(p => master.addPage(p));
        processed += 1;
        updateProgress(Math.round((processed / total) * 100));
        await new Promise(r => setTimeout(r, 8)); // let UI breathe
      }
    }

    for (let i = 0; i < total; i += BATCH_SIZE) {
      await processBatch(i, Math.min(i + BATCH_SIZE, total));
      // Yield between batches to allow GC to reclaim memory
      await new Promise(r => setTimeout(r, 20));
    }

    const mergedBytes = await master.save();
    const blob = new Blob([mergedBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merged-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    hideProgressSoon();
  } catch (err) {
    console.error(err);
    alert('Failed to merge PDFs. If you are merging many large files, try smaller batches.');
    hideProgress();
  }
});

function showProgress(initial = 0) {
  els.overlay.classList.remove('hidden');
  els.overlay.setAttribute('aria-hidden', 'false');
  updateProgress(initial);
}
function updateProgress(pct) {
  const clamped = Math.max(0, Math.min(100, pct));
  els.progressFill.style.inset = `0 ${100 - clamped}% 0 0`; // control width via right inset
  els.progressLabel.textContent = `${clamped}%`;
}
function hideProgress() {
  els.overlay.classList.add('hidden');
  els.overlay.setAttribute('aria-hidden', 'true');
}
function hideProgressSoon() { setTimeout(hideProgress, 300); }

// Initialize
renderCards();