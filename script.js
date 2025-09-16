// PDF Tools Pro - Complete PDF manipulation toolkit
// Client-side processing with pdf-lib and modern web APIs

// Application state
const state = {
  currentTool: null,
  currentSection: 'home',
  items: [], // [{ id: string, file: File, pages?: number }]
  toolOptions: {}
};

// DOM elements
const els = {
  // Navigation
  navBtns: document.querySelectorAll('.nav-btn'),
  sections: document.querySelectorAll('.main-section'),
  
  // Tools
  toolCards: document.querySelectorAll('.tool-card'),
  backBtn: document.getElementById('back-btn'),
  toolTitle: document.getElementById('tool-title'),
  toolWorkspace: document.getElementById('tool-workspace'),
  homeSection: document.getElementById('home-section'),
  
  // File handling
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('file-input'),
  dropzoneTitle: document.getElementById('dropzone-title'),
  dropzoneSubtitle: document.getElementById('dropzone-subtitle'),
  cards: document.getElementById('cards'),
  
  // Tool options
  toolOptions: document.getElementById('tool-options'),
  
  // Actions
  processBtn: document.getElementById('process-btn'),
  clearBtn: document.getElementById('clear-btn'),
  
  // Progress
  overlay: document.getElementById('progress-overlay'),
  progressTitle: document.getElementById('progress-title'),
  progressFill: document.getElementById('progress-fill'),
  progressLabel: document.getElementById('progress-label')
};

// Utility functions
function uid() { 
  return Math.random().toString(36).slice(2, 10); 
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate() {
  return new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
}

// Navigation functions
function showSection(sectionName) {
  // Update nav buttons
  els.navBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === sectionName);
  });
  
  // Update sections
  els.sections.forEach(section => {
    section.classList.toggle('active', section.id === `${sectionName}-section`);
  });
  
  state.currentSection = sectionName;
}

function showTool(toolName) {
  state.currentTool = toolName;
  
  // Hide home section, show workspace
  els.homeSection.classList.remove('active');
  els.toolWorkspace.classList.add('active');
  
  // Update tool title and configure interface
  const toolConfig = getToolConfig(toolName);
  els.toolTitle.textContent = toolConfig.title;
  els.dropzoneTitle.textContent = toolConfig.dropzoneTitle;
  els.dropzoneSubtitle.textContent = toolConfig.dropzoneSubtitle;
  els.processBtn.textContent = toolConfig.buttonText;
  
  // Configure file input
  els.fileInput.accept = toolConfig.accept;
  els.fileInput.multiple = toolConfig.multiple;
  
  // Setup tool-specific options
  setupToolOptions(toolName);
  
  // Clear previous files
  clearAll();
}

function getToolConfig(toolName) {
  const configs = {
    merge: {
      title: 'Merge PDFs',
      dropzoneTitle: 'Drop PDF files to merge',
      dropzoneSubtitle: 'Select multiple PDF files to combine into one',
      buttonText: 'Merge PDFs',
      accept: 'application/pdf',
      multiple: true
    },
    split: {
      title: 'Split PDF',
      dropzoneTitle: 'Drop PDF file to split',
      dropzoneSubtitle: 'Select a PDF file to extract pages from',
      buttonText: 'Split PDF',
      accept: 'application/pdf',
      multiple: false
    },
    compress: {
      title: 'Compress PDF',
      dropzoneTitle: 'Drop PDF files to compress',
      dropzoneSubtitle: 'Select PDF files to reduce their size',
      buttonText: 'Compress PDFs',
      accept: 'application/pdf',
      multiple: true
    },
    'pdf-to-images': {
      title: 'PDF to Images',
      dropzoneTitle: 'Drop PDF files to convert',
      dropzoneSubtitle: 'Select PDF files to convert to images',
      buttonText: 'Convert to Images',
      accept: 'application/pdf',
      multiple: true
    },
    'images-to-pdf': {
      title: 'Images to PDF',
      dropzoneTitle: 'Drop image files to convert',
      dropzoneSubtitle: 'Select JPG, PNG images to convert to PDF',
      buttonText: 'Convert to PDF',
      accept: 'image/*',
      multiple: true
    },
    rotate: {
      title: 'Rotate PDF',
      dropzoneTitle: 'Drop PDF files to rotate',
      dropzoneSubtitle: 'Select PDF files to rotate pages',
      buttonText: 'Rotate PDFs',
      accept: 'application/pdf',
      multiple: true
    },
    watermark: {
      title: 'Add Watermark',
      dropzoneTitle: 'Drop PDF files for watermark',
      dropzoneSubtitle: 'Select PDF files to add watermark',
      buttonText: 'Add Watermark',
      accept: 'application/pdf',
      multiple: true
    },
    'remove-pages': {
      title: 'Remove Pages',
      dropzoneTitle: 'Drop PDF file to edit',
      dropzoneSubtitle: 'Select a PDF file to remove pages from',
      buttonText: 'Remove Pages',
      accept: 'application/pdf',
      multiple: false
    },
    organize: {
      title: 'Organize PDF',
      dropzoneTitle: 'Drop PDF file to organize',
      dropzoneSubtitle: 'Select a PDF file to reorder pages',
      buttonText: 'Organize PDF',
      accept: 'application/pdf',
      multiple: false
    }
  };
  
  return configs[toolName] || configs.merge;
}

function setupToolOptions(toolName) {
  const optionsContainer = els.toolOptions;
  optionsContainer.innerHTML = '';
  
  let optionsHTML = '';
  
  switch (toolName) {
    case 'split':
      optionsHTML = `
        <div class="option-group">
          <label class="option-label">Split Method</label>
          <select class="option-select" id="split-method">
            <option value="pages">Extract specific pages</option>
            <option value="range">Split by page range</option>
            <option value="all">Split into individual pages</option>
          </select>
        </div>
        <div class="option-group" id="page-input-group">
          <label class="option-label">Page Numbers (e.g., 1,3,5-8)</label>
          <input type="text" class="option-input" id="page-numbers" placeholder="1,3,5-8">
        </div>
      `;
      break;
      
    case 'compress':
      optionsHTML = `
        <div class="option-group">
          <label class="option-label">Compression Level</label>
          <select class="option-select" id="compression-level">
            <option value="low">Low (Better quality)</option>
            <option value="medium" selected>Medium (Balanced)</option>
            <option value="high">High (Smaller size)</option>
          </select>
        </div>
      `;
      break;
      
    case 'pdf-to-images':
      optionsHTML = `
        <div class="option-group">
          <label class="option-label">Image Format</label>
          <select class="option-select" id="image-format">
            <option value="png">PNG (Better quality)</option>
            <option value="jpeg" selected>JPEG (Smaller size)</option>
          </select>
        </div>
        <div class="option-group">
          <label class="option-label">Image Quality (JPEG only)</label>
          <input type="range" class="option-range" id="image-quality" min="0.1" max="1" step="0.1" value="0.8">
          <div style="text-align: center; margin-top: 4px; font-size: 12px; color: var(--muted);">80%</div>
        </div>
      `;
      break;
      
    case 'rotate':
      optionsHTML = `
        <div class="option-group">
          <label class="option-label">Rotation Angle</label>
          <select class="option-select" id="rotation-angle">
            <option value="90">90° Clockwise</option>
            <option value="180">180°</option>
            <option value="270">270° Clockwise (90° Counter-clockwise)</option>
          </select>
        </div>
      `;
      break;
      
    case 'watermark':
      optionsHTML = `
        <div class="option-group">
          <label class="option-label">Watermark Text</label>
          <input type="text" class="option-input" id="watermark-text" placeholder="Enter watermark text">
        </div>
        <div class="option-group">
          <label class="option-label">Position</label>
          <select class="option-select" id="watermark-position">
            <option value="center">Center</option>
            <option value="top-left">Top Left</option>
            <option value="top-right">Top Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="bottom-right">Bottom Right</option>
          </select>
        </div>
        <div class="option-group">
          <label class="option-label">Opacity</label>
          <input type="range" class="option-range" id="watermark-opacity" min="0.1" max="1" step="0.1" value="0.5">
          <div style="text-align: center; margin-top: 4px; font-size: 12px; color: var(--muted);">50%</div>
        </div>
      `;
      break;
      
    case 'remove-pages':
      optionsHTML = `
        <div class="option-group">
          <label class="option-label">Pages to Remove (e.g., 1,3,5-8)</label>
          <input type="text" class="option-input" id="remove-pages" placeholder="1,3,5-8">
        </div>
      `;
      break;
  }
  
  if (optionsHTML) {
    optionsContainer.innerHTML = optionsHTML;
    optionsContainer.classList.remove('hidden');
    
    // Add event listeners for dynamic options
    setupOptionListeners(toolName);
  } else {
    optionsContainer.classList.add('hidden');
  }
}

function setupOptionListeners(toolName) {
  // Image quality slider
  const qualitySlider = document.getElementById('image-quality');
  if (qualitySlider) {
    const qualityDisplay = qualitySlider.nextElementSibling;
    qualitySlider.addEventListener('input', (e) => {
      qualityDisplay.textContent = Math.round(e.target.value * 100) + '%';
    });
  }
  
  // Watermark opacity slider
  const opacitySlider = document.getElementById('watermark-opacity');
  if (opacitySlider) {
    const opacityDisplay = opacitySlider.nextElementSibling;
    opacitySlider.addEventListener('input', (e) => {
      opacityDisplay.textContent = Math.round(e.target.value * 100) + '%';
    });
  }
  
  // Split method change
  const splitMethod = document.getElementById('split-method');
  const pageInputGroup = document.getElementById('page-input-group');
  if (splitMethod && pageInputGroup) {
    splitMethod.addEventListener('change', (e) => {
      pageInputGroup.style.display = e.target.value === 'all' ? 'none' : 'block';
    });
  }
}

// File handling functions
function setButtons() {
  const hasItems = state.items.length > 0;
  els.processBtn.disabled = !hasItems;
  els.clearBtn.disabled = !hasItems;
}

function addFiles(files) {
  const currentTool = state.currentTool;
  const toolConfig = getToolConfig(currentTool);
  
  let validFiles = [];
  
  if (currentTool === 'images-to-pdf') {
    validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
  } else {
    validFiles = Array.from(files).filter(f => 
      f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
  }
  
  // Handle single file tools
  if (!toolConfig.multiple && validFiles.length > 1) {
    validFiles = [validFiles[0]];
  }
  
  // De-duplicate by name+size
  const existing = new Set(state.items.map(i => `${i.file.name}::${i.file.size}`));
  const newItems = [];
  
  for (const file of validFiles) {
    const key = `${file.name}::${file.size}`;
    if (!existing.has(key)) {
      newItems.push({ id: uid(), file });
      existing.add(key);
    }
  }
  
  if (!toolConfig.multiple) {
    state.items = newItems;
  } else {
    state.items.push(...newItems);
  }
  
  renderCards();
}

function renderCards() {
  els.cards.innerHTML = '';
  
  state.items.forEach((item, idx) => {
    const hue = (idx * 37 + 200) % 360;
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
    if (item.pages) {
      meta.textContent += ` • ${item.pages} pages`;
    }

    header.appendChild(title);
    header.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    // Only show move buttons for multi-file tools
    const toolConfig = getToolConfig(state.currentTool);
    if (toolConfig.multiple && state.items.length > 1) {
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

      actions.appendChild(upBtn);
      actions.appendChild(downBtn);
    }

    const removeBtn = document.createElement('button');
    removeBtn.className = 'icon-btn danger';
    removeBtn.title = 'Remove';
    removeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
    removeBtn.addEventListener('click', () => removeItem(item.id));

    actions.appendChild(removeBtn);
    card.appendChild(header);
    card.appendChild(actions);
    els.cards.appendChild(card);
  });
  
  setButtons();
}

function moveItem(from, to) {
  if (to < 0 || to >= state.items.length) return;
  const [item] = state.items.splice(from, 1);
  state.items.splice(to, 0, item);
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

// Progress functions
function showProgress(title = 'Processing...', initial = 0) {
  els.progressTitle.textContent = title;
  els.overlay.classList.remove('hidden');
  els.overlay.setAttribute('aria-hidden', 'false');
  updateProgress(initial);
}

function updateProgress(pct) {
  const clamped = Math.max(0, Math.min(100, pct));
  els.progressFill.style.inset = `0 ${100 - clamped}% 0 0`;
  els.progressLabel.textContent = `${clamped}%`;
}

function hideProgress() {
  els.overlay.classList.add('hidden');
  els.overlay.setAttribute('aria-hidden', 'true');
}

function hideProgressSoon() { 
  setTimeout(hideProgress, 500); 
}

// PDF processing functions
async function processFiles() {
  if (state.items.length === 0) return;
  
  try {
    const toolName = state.currentTool;
    
    switch (toolName) {
      case 'merge':
        await mergePDFs();
        break;
      case 'split':
        await splitPDF();
        break;
      case 'compress':
        await compressPDFs();
        break;
      case 'pdf-to-images':
        await pdfToImages();
        break;
      case 'images-to-pdf':
        await imagesToPDF();
        break;
      case 'rotate':
        await rotatePDFs();
        break;
      case 'watermark':
        await addWatermark();
        break;
      case 'remove-pages':
        await removePages();
        break;
      case 'organize':
        await organizePDF();
        break;
      default:
        throw new Error('Unknown tool: ' + toolName);
    }
  } catch (err) {
    console.error('Processing error:', err);
    alert('Failed to process files: ' + err.message);
    hideProgress();
  }
}

async function mergePDFs() {
  showProgress('Merging PDFs...', 0);
  const { PDFDocument } = window.PDFLib;
  
  const master = await PDFDocument.create();
  const total = state.items.length;
  
  for (let i = 0; i < total; i++) {
    const item = state.items[i];
    const buf = await item.file.arrayBuffer();
    const src = await PDFDocument.load(buf);
    const copied = await master.copyPages(src, src.getPageIndices());
    copied.forEach(p => master.addPage(p));
    
    updateProgress(Math.round(((i + 1) / total) * 100));
    await new Promise(r => setTimeout(r, 10));
  }
  
  const mergedBytes = await master.save();
  downloadFile(mergedBytes, `merged-${formatDate()}.pdf`, 'application/pdf');
  hideProgressSoon();
}

async function splitPDF() {
  const item = state.items[0];
  if (!item) return;
  
  showProgress('Splitting PDF...', 0);
  const { PDFDocument } = window.PDFLib;
  
  const buf = await item.file.arrayBuffer();
  const srcDoc = await PDFDocument.load(buf);
  const totalPages = srcDoc.getPageCount();
  
  const splitMethod = document.getElementById('split-method')?.value || 'pages';
  const pageNumbers = document.getElementById('page-numbers')?.value || '';
  
  if (splitMethod === 'all') {
    // Split into individual pages
    for (let i = 0; i < totalPages; i++) {
      const newDoc = await PDFDocument.create();
      const [copiedPage] = await newDoc.copyPages(srcDoc, [i]);
      newDoc.addPage(copiedPage);
      
      const pdfBytes = await newDoc.save();
      const fileName = `${item.file.name.replace('.pdf', '')}-page-${i + 1}.pdf`;
      downloadFile(pdfBytes, fileName, 'application/pdf');
      
      updateProgress(Math.round(((i + 1) / totalPages) * 100));
      await new Promise(r => setTimeout(r, 50));
    }
  } else {
    // Extract specific pages
    const pages = parsePageNumbers(pageNumbers, totalPages);
    if (pages.length === 0) {
      throw new Error('No valid page numbers specified');
    }
    
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, pages.map(p => p - 1));
    copiedPages.forEach(p => newDoc.addPage(p));
    
    const pdfBytes = await newDoc.save();
    const fileName = `${item.file.name.replace('.pdf', '')}-extracted.pdf`;
    downloadFile(pdfBytes, fileName, 'application/pdf');
    updateProgress(100);
  }
  
  hideProgressSoon();
}

async function compressPDFs() {
  showProgress('Compressing PDFs...', 0);
  const { PDFDocument } = window.PDFLib;
  
  const compressionLevel = document.getElementById('compression-level')?.value || 'medium';
  const total = state.items.length;
  
  for (let i = 0; i < total; i++) {
    const item = state.items[i];
    const buf = await item.file.arrayBuffer();
    const doc = await PDFDocument.load(buf);
    
    // Basic compression by re-saving (pdf-lib automatically optimizes)
    const compressedBytes = await doc.save({
      useObjectStreams: true,
      addDefaultPage: false
    });
    
    const fileName = `${item.file.name.replace('.pdf', '')}-compressed.pdf`;
    downloadFile(compressedBytes, fileName, 'application/pdf');
    
    updateProgress(Math.round(((i + 1) / total) * 100));
    await new Promise(r => setTimeout(r, 100));
  }
  
  hideProgressSoon();
}

async function pdfToImages() {
  showProgress('Converting PDF to Images...', 0);
  
  const format = document.getElementById('image-format')?.value || 'jpeg';
  const quality = parseFloat(document.getElementById('image-quality')?.value || '0.8');
  const total = state.items.length;
  
  for (let i = 0; i < total; i++) {
    const item = state.items[i];
    await convertPDFToImages(item.file, format, quality);
    
    updateProgress(Math.round(((i + 1) / total) * 100));
    await new Promise(r => setTimeout(r, 100));
  }
  
  hideProgressSoon();
}

async function convertPDFToImages(file, format, quality) {
  // This is a simplified version - in a real implementation you'd use PDF.js or similar
  // For now, we'll show a message about the limitation
  throw new Error('PDF to Images conversion requires additional libraries. This feature will be implemented in a future update.');
}

async function imagesToPDF() {
  showProgress('Converting Images to PDF...', 0);
  const { PDFDocument } = window.PDFLib;
  
  const doc = await PDFDocument.create();
  const total = state.items.length;
  
  for (let i = 0; i < total; i++) {
    const item = state.items[i];
    const imageBytes = await item.file.arrayBuffer();
    
    let image;
    if (item.file.type === 'image/png') {
      image = await doc.embedPng(imageBytes);
    } else if (item.file.type === 'image/jpeg' || item.file.type === 'image/jpg') {
      image = await doc.embedJpg(imageBytes);
    } else {
      continue; // Skip unsupported formats
    }
    
    const page = doc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
    
    updateProgress(Math.round(((i + 1) / total) * 100));
    await new Promise(r => setTimeout(r, 50));
  }
  
  const pdfBytes = await doc.save();
  downloadFile(pdfBytes, `images-to-pdf-${formatDate()}.pdf`, 'application/pdf');
  hideProgressSoon();
}

async function rotatePDFs() {
  showProgress('Rotating PDFs...', 0);
  const { PDFDocument, degrees } = window.PDFLib;
  
  const angle = parseInt(document.getElementById('rotation-angle')?.value || '90');
  const total = state.items.length;
  
  for (let i = 0; i < total; i++) {
    const item = state.items[i];
    const buf = await item.file.arrayBuffer();
    const doc = await PDFDocument.load(buf);
    
    const pages = doc.getPages();
    pages.forEach(page => {
      page.setRotation(degrees(angle));
    });
    
    const rotatedBytes = await doc.save();
    const fileName = `${item.file.name.replace('.pdf', '')}-rotated.pdf`;
    downloadFile(rotatedBytes, fileName, 'application/pdf');
    
    updateProgress(Math.round(((i + 1) / total) * 100));
    await new Promise(r => setTimeout(r, 100));
  }
  
  hideProgressSoon();
}

async function addWatermark() {
  showProgress('Adding Watermark...', 0);
  const { PDFDocument, rgb } = window.PDFLib;
  
  const watermarkText = document.getElementById('watermark-text')?.value || 'WATERMARK';
  const position = document.getElementById('watermark-position')?.value || 'center';
  const opacity = parseFloat(document.getElementById('watermark-opacity')?.value || '0.5');
  const total = state.items.length;
  
  for (let i = 0; i < total; i++) {
    const item = state.items[i];
    const buf = await item.file.arrayBuffer();
    const doc = await PDFDocument.load(buf);
    
    const pages = doc.getPages();
    pages.forEach(page => {
      const { width, height } = page.getSize();
      
      let x, y;
      switch (position) {
        case 'top-left':
          x = 50; y = height - 50;
          break;
        case 'top-right':
          x = width - 200; y = height - 50;
          break;
        case 'bottom-left':
          x = 50; y = 50;
          break;
        case 'bottom-right':
          x = width - 200; y = 50;
          break;
        default: // center
          x = width / 2 - 75; y = height / 2;
      }
      
      page.drawText(watermarkText, {
        x,
        y,
        size: 24,
        color: rgb(0.5, 0.5, 0.5),
        opacity
      });
    });
    
    const watermarkedBytes = await doc.save();
    const fileName = `${item.file.name.replace('.pdf', '')}-watermarked.pdf`;
    downloadFile(watermarkedBytes, fileName, 'application/pdf');
    
    updateProgress(Math.round(((i + 1) / total) * 100));
    await new Promise(r => setTimeout(r, 100));
  }
  
  hideProgressSoon();
}

async function removePages() {
  const item = state.items[0];
  if (!item) return;
  
  showProgress('Removing Pages...', 0);
  const { PDFDocument } = window.PDFLib;
  
  const buf = await item.file.arrayBuffer();
  const srcDoc = await PDFDocument.load(buf);
  const totalPages = srcDoc.getPageCount();
  
  const pageNumbers = document.getElementById('remove-pages')?.value || '';
  const pagesToRemove = parsePageNumbers(pageNumbers, totalPages);
  
  if (pagesToRemove.length === 0) {
    throw new Error('No valid page numbers specified');
  }
  
  const newDoc = await PDFDocument.create();
  const pagesToKeep = [];
  
  for (let i = 1; i <= totalPages; i++) {
    if (!pagesToRemove.includes(i)) {
      pagesToKeep.push(i - 1); // Convert to 0-based index
    }
  }
  
  if (pagesToKeep.length === 0) {
    throw new Error('Cannot remove all pages from PDF');
  }
  
  const copiedPages = await newDoc.copyPages(srcDoc, pagesToKeep);
  copiedPages.forEach(p => newDoc.addPage(p));
  
  const resultBytes = await newDoc.save();
  const fileName = `${item.file.name.replace('.pdf', '')}-pages-removed.pdf`;
  downloadFile(resultBytes, fileName, 'application/pdf');
  
  updateProgress(100);
  hideProgressSoon();
}

async function organizePDF() {
  // This would require a more complex UI for reordering pages
  // For now, we'll show a message about the limitation
  throw new Error('PDF organization feature requires a page preview interface. This will be implemented in a future update.');
}

// Utility functions for PDF processing
function parsePageNumbers(input, maxPages) {
  const pages = [];
  const parts = input.split(',');
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()));
      if (start && end && start <= end && start >= 1 && end <= maxPages) {
        for (let i = start; i <= end; i++) {
          if (!pages.includes(i)) pages.push(i);
        }
      }
    } else {
      const pageNum = parseInt(trimmed);
      if (pageNum >= 1 && pageNum <= maxPages && !pages.includes(pageNum)) {
        pages.push(pageNum);
      }
    }
  }
  
  return pages.sort((a, b) => a - b);
}

function downloadFile(data, filename, mimeType) {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Event listeners
function setupEventListeners() {
  // Navigation
  els.navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      showSection(btn.dataset.section);
    });
  });
  
  // Tool cards
  els.toolCards.forEach(card => {
    card.addEventListener('click', () => {
      showTool(card.dataset.tool);
    });
  });
  
  // Back button
  els.backBtn?.addEventListener('click', () => {
    showSection('home');
    state.currentTool = null;
    clearAll();
  });
  
  // File input and drag & drop
  setupFileHandling();
  
  // Action buttons
  els.processBtn?.addEventListener('click', processFiles);
  els.clearBtn?.addEventListener('click', clearAll);
}

function setupFileHandling() {
  // Prevent defaults for drag & drop
  function preventDefaults(e) { 
    e.preventDefault(); 
    e.stopPropagation(); 
  }
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    els.dropzone?.addEventListener(eventName, preventDefaults);
  });
  
  // Highlight drop zone when dragging
  ['dragenter', 'dragover'].forEach(eventName => {
    els.dropzone?.addEventListener(eventName, () => {
      els.dropzone.classList.add('is-drag');
    });
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    els.dropzone?.addEventListener(eventName, () => {
      els.dropzone.classList.remove('is-drag');
    });
  });
  
  // Handle dropped files
  els.dropzone?.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files) {
      addFiles(dt.files);
    }
  });
  
  // Handle file input
  els.fileInput?.addEventListener('change', (e) => {
    if (e.target.files) {
      addFiles(e.target.files);
      e.target.value = ''; // Reset input
    }
  });
  
}

// Global functions for HTML onclick handlers
window.showSection = showSection;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  showSection('home');
});
