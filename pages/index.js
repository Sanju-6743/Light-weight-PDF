import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import * as pdfjs from 'pdfjs-dist'
import axios from 'axios'

// Set PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

export default function Home() {
  const [activeSection, setActiveSection] = useState('home')
  const [activeTool, setActiveTool] = useState(null)
  const [files, setFiles] = useState([])
  const [progress, setProgress] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [splitMethod, setSplitMethod] = useState('individual')
  const [pageRanges, setPageRanges] = useState('')
  const [compressQuality, setCompressQuality] = useState(0.8)
  const [rotateAngle, setRotateAngle] = useState(90)
  const [watermarkText, setWatermarkText] = useState('DRAFT')

  const tools = [
    { id: 'merge', title: 'Merge PDFs', desc: 'Combine multiple PDF files into one document', icon: 'merge' },
    { id: 'split', title: 'Split PDF', desc: 'Extract pages or split PDF into multiple files', icon: 'split' },
    { id: 'compress', title: 'Compress PDF', desc: 'Reduce PDF file size while maintaining quality', icon: 'compress' },
    { id: 'pdf-to-images', title: 'PDF to Images', desc: 'Convert PDF pages to JPG, PNG images', icon: 'convert' },
    { id: 'images-to-pdf', title: 'Images to PDF', desc: 'Convert JPG, PNG images to PDF document', icon: 'convert' },
    { id: 'rotate', title: 'Rotate PDF', desc: 'Rotate PDF pages to correct orientation', icon: 'rotate' },
    { id: 'watermark', title: 'Add Watermark', desc: 'Add text or image watermark to PDF', icon: 'watermark' },
    { id: 'remove-pages', title: 'Remove Pages', desc: 'Delete specific pages from PDF', icon: 'remove' },
    { id: 'organize', title: 'Organize PDF', desc: 'Reorder, add, or remove PDF pages', icon: 'organize' },
    // Add more as needed
  ]

  const showSection = (section) => setActiveSection(section)

  const selectTool = (toolId) => {
    setActiveTool(toolId)
    setActiveSection('tool')
    setFiles([])
    setProgress(0)
  }

  const backToTools = () => {
    setActiveTool(null)
    setActiveSection('home')
    setFiles([])
    setProgress(0)
  }

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files)
    setFiles(selectedFiles)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf' || f.type.startsWith('image/'))
    setFiles(droppedFiles)
  }

  const processFiles = async () => {
    if (!activeTool || files.length === 0) return
    setProcessing(true)
    setProgress(0)
    try {
      if (activeTool === 'merge') {
        const mergedPdf = await PDFDocument.create()
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          const pdfBytes = await file.arrayBuffer()
          const pdf = await PDFDocument.load(pdfBytes)
          const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
          pages.forEach(page => mergedPdf.addPage(page))
          setProgress(((i + 1) / files.length) * 100)
        }
        const mergedBytes = await mergedPdf.save()
        saveAs(new Blob([mergedBytes]), 'merged.pdf')
      } else if (activeTool === 'split') {
        if (splitMethod === 'individual') {
          for (let i = 0; i < files.length; i++) {
            const file = files[i]
            const pdfBytes = await file.arrayBuffer()
            const pdf = await PDFDocument.load(pdfBytes)
            const pageCount = pdf.getPageCount()
            for (let j = 0; j < pageCount; j++) {
              const newPdf = await PDFDocument.create()
              const [page] = await newPdf.copyPages(pdf, [j])
              newPdf.addPage(page)
              const newBytes = await newPdf.save()
              saveAs(new Blob([newBytes]), `${file.name}_page_${j + 1}.pdf`)
            }
          }
        }
        // Add other split methods
      } else if (activeTool === 'compress') {
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          const pdfBytes = await file.arrayBuffer()
          const pdf = await PDFDocument.load(pdfBytes)
          const compressedBytes = await pdf.save({ useObjectStreams: false, addDefaultPage: false })
          saveAs(new Blob([compressedBytes]), `compressed_${file.name}`)
          setProgress(((i + 1) / files.length) * 100)
        }
      } else if (activeTool === 'pdf-to-images') {
        const zip = new JSZip()
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          const pdfBytes = await file.arrayBuffer()
          const pdf = await pdfjs.getDocument({ data: pdfBytes }).promise
          const numPages = pdf.numPages
          for (let j = 1; j <= numPages; j++) {
            const page = await pdf.getPage(j)
            const viewport = page.getViewport({ scale: 2 })
            const canvas = document.createElement('canvas')
            const context = canvas.getContext('2d')
            canvas.height = viewport.height
            canvas.width = viewport.width
            await page.render({ canvasContext: context, viewport }).promise
            canvas.toBlob((blob) => {
              zip.file(`${file.name}_page_${j}.png`, blob)
            })
          }
          setProgress(((i + 1) / files.length) * 100)
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        saveAs(zipBlob, 'pdf_images.zip')
      } else if (activeTool === 'images-to-pdf') {
        const pdf = await PDFDocument.create()
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          const imageBytes = await file.arrayBuffer()
          let image
          if (file.type === 'image/jpeg') {
            image = await pdf.embedJpg(imageBytes)
          } else if (file.type === 'image/png') {
            image = await pdf.embedPng(imageBytes)
          }
          const page = pdf.addPage()
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: page.getWidth(),
            height: page.getHeight(),
          })
          setProgress(((i + 1) / files.length) * 100)
        }
        const pdfBytes = await pdf.save()
        saveAs(new Blob([pdfBytes]), 'images.pdf')
      } else if (activeTool === 'rotate') {
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          const pdfBytes = await file.arrayBuffer()
          const pdf = await PDFDocument.load(pdfBytes)
          const pages = pdf.getPages()
          pages.forEach(page => {
            page.setRotation(page.getRotation().angle + rotateAngle)
          })
          const rotatedBytes = await pdf.save()
          saveAs(new Blob([rotatedBytes]), `rotated_${file.name}`)
          setProgress(((i + 1) / files.length) * 100)
        }
      } else if (activeTool === 'watermark') {
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          const pdfBytes = await file.arrayBuffer()
          const pdf = await PDFDocument.load(pdfBytes)
          const pages = pdf.getPages()
          pages.forEach(page => {
            page.drawText(watermarkText, {
              x: page.getWidth() / 2,
              y: page.getHeight() / 2,
              size: 50,
              opacity: 0.5,
              rotate: 45,
            })
          })
          const watermarkedBytes = await pdf.save()
          saveAs(new Blob([watermarkedBytes]), `watermarked_${file.name}`)
          setProgress(((i + 1) / files.length) * 100)
        }
      }
      // Add more tools
    } catch (error) {
      console.error(error)
    } finally {
      setProcessing(false)
      setProgress(0)
    }
  }

  const sendMessage = async () => {
    if (!input.trim()) return
    const userMsg = { role: 'user', content: input }
    setMessages([...messages, userMsg])
    setInput('')
    const tool = tools.find(t => input.toLowerCase().includes(t.title.toLowerCase()) || input.toLowerCase().includes(t.id))
    if (tool) {
      const botMsg = { role: 'bot', content: `I suggest using the "${tool.title}" tool. Would you like me to open it?`, tool: tool.id }
      setMessages(prev => [...prev, botMsg])
    } else {
      try {
        const response = await axios.post('/api/chat', { message: input })
        const botMsg = { role: 'bot', content: response.data.response }
        setMessages(prev => [...prev, botMsg])
      } catch (error) {
        const botMsg = { role: 'bot', content: 'Sorry, I could not process your request.' }
        setMessages(prev => [...prev, botMsg])
      }
    }
  }

  return (
    <div>
      <header className="app-header">
        <div className="container">
          <div className="header-content">
            <div className="logo-section">
              <div className="logo-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <h1>PDF Tools Pro</h1>
            </div>
            <nav className="nav-menu">
              <button className={`nav-btn ${activeSection === 'home' ? 'active' : ''}`} onClick={() => showSection('home')}>Home</button>
              <button className={`nav-btn ${activeSection === 'about' ? 'active' : ''}`} onClick={() => showSection('about')}>About</button>
              <button className={`nav-btn ${activeSection === 'privacy' ? 'active' : ''}`} onClick={() => showSection('privacy')}>Privacy</button>
            </nav>
          </div>
        </div>
      </header>

      <main className="container">
        <section id="home-section" className={`main-section ${activeSection === 'home' ? 'active' : ''}`}>
          <div className="hero-section">
            <h2 className="hero-title">Complete PDF Solution</h2>
            <p className="hero-subtitle">Merge, split, compress, convert, and edit PDFs - all in your browser. No uploads, completely private.</p>
          </div>
          <div className="tools-grid">
            {tools.map(tool => (
              <div key={tool.id} className="tool-card" onClick={() => selectTool(tool.id)}>
                <div className={`tool-icon ${tool.icon}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {tool.icon === 'merge' && <><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M12 11l4 4-4 4"/><path d="M8 15h8"/></>}
                    {tool.icon === 'split' && <><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M8 11l-4 4 4 4"/><path d="M16 15H8"/></>}
                    {tool.icon === 'compress' && <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>}
                    {tool.icon === 'convert' && <><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>}
                    {tool.icon === 'rotate' && <><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"/></>}
                    {tool.icon === 'watermark' && <><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></>}
                    {tool.icon === 'remove' && <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></>}
                    {tool.icon === 'organize' && <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3-3 3 3"/></>}
                  </svg>
                </div>
                <h3 className="tool-title">{tool.title}</h3>
                <p className="tool-description">{tool.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="tool-workspace" className={`main-section ${activeSection === 'tool' ? 'active' : ''}`}>
          <div className="workspace-header">
            <button className="back-btn" onClick={backToTools}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back to Tools
            </button>
            <h2 className="workspace-title">{activeTool ? tools.find(t => t.id === activeTool)?.title : 'PDF Tool'}</h2>
          </div>

          <div className={`tool-options ${activeTool === 'split' || activeTool === 'compress' || activeTool === 'rotate' || activeTool === 'watermark' ? '' : 'hidden'}`}>
            {activeTool === 'split' && (
              <div className="option-group">
                <label className="option-label">Split Method</label>
                <select className="option-select" value={splitMethod} onChange={(e) => setSplitMethod(e.target.value)}>
                  <option value="individual">Individual Pages</option>
                  <option value="pages">By Page Ranges</option>
                </select>
              </div>
            )}
            {activeTool === 'compress' && (
              <div className="option-group">
                <label className="option-label">Compression Quality</label>
                <input type="range" min="0.1" max="1" step="0.1" value={compressQuality} onChange={(e) => setCompressQuality(e.target.value)} className="option-range" />
                <span>{compressQuality}</span>
              </div>
            )}
            {activeTool === 'rotate' && (
              <div className="option-group">
                <label className="option-label">Rotation Angle</label>
                <select className="option-select" value={rotateAngle} onChange={(e) => setRotateAngle(Number(e.target.value))}>
                  <option value="90">90°</option>
                  <option value="180">180°</option>
                  <option value="270">270°</option>
                </select>
              </div>
            )}
            {activeTool === 'watermark' && (
              <div className="option-group">
                <label className="option-label">Watermark Text</label>
                <input className="option-input" value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} />
              </div>
            )}
          </div>

          <div className="uploader">
            <div className="dropzone" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
              <div className="dz-content">
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 5 17 10"/>
                  <line x1="12" y1="5" x2="12" y2="21"/>
                </svg>
                <div>
                  <p className="dz-title">Drop files or click to choose</p>
                  <p className="dz-subtitle">Select files to get started</p>
                </div>
              </div>
              <input type="file" className="file-input" accept={activeTool === 'images-to-pdf' ? 'image/*' : 'application/pdf'} multiple onChange={handleFileSelect} />
            </div>
          </div>

          <div className="cards-grid">
            {files.map((file, index) => (
              <div key={index} className="card">
                <div className="card-header">
                  <h4 className="card-title">{file.name}</h4>
                  <div className="card-meta">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
                <div className="card-actions">
                  <button className="icon-btn danger" onClick={() => setFiles(files.filter((_, i) => i !== index))}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="actions">
            <button className="btn primary" onClick={processFiles} disabled={processing || files.length === 0}>Process Files</button>
            <button className="btn ghost" onClick={() => setFiles([])} disabled={processing || files.length === 0}>Clear All</button>
          </div>
        </section>

        {/* About and Privacy sections similar to original */}
        <section id="about-section" className={`main-section info-section ${activeSection === 'about' ? 'active' : ''}`}>
          <div className="info-content">
            <h2>About PDF Tools Pro</h2>
            <p>PDF Tools Pro is a comprehensive, client-side PDF manipulation toolkit that runs entirely in your browser. No files are uploaded to any server - everything happens locally on your device, ensuring complete privacy and security.</p>
            <h3>Features</h3>
            <ul className="feature-list">
              <li>✨ Complete privacy - all processing happens locally</li>
              <li>🚀 Fast processing with modern web technologies</li>
              <li>📱 Responsive design works on all devices</li>
              <li>🎨 Beautiful, modern interface</li>
              <li>🔧 Professional-grade PDF tools</li>
              <li>💾 No file size limits (within browser memory)</li>
            </ul>
          </div>
        </section>

        <section id="privacy-section" className={`main-section info-section ${activeSection === 'privacy' ? 'active' : ''}`}>
          <div className="info-content">
            <h2>Privacy & Security</h2>
            <p>Your privacy is our top priority. PDF Tools Pro is designed with privacy-first principles:</p>
            <div className="privacy-points">
              <div className="privacy-point">
                <div className="privacy-icon">🔒</div>
                <div><h3>No File Uploads</h3><p>All PDF processing happens directly in your browser. Your files never leave your device.</p></div>
              </div>
              <div className="privacy-point">
                <div className="privacy-icon">⚡</div>
                <div><h3>Client-Side Processing</h3><p>We use advanced JavaScript libraries like PDF-lib to process files locally.</p></div>
              </div>
              <div className="privacy-point">
                <div className="privacy-icon">🛡️</div>
                <div><h3>No Data Collection</h3><p>We don't collect, store, or analyze your files or personal information.</p></div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <div className="container">
          <div className="footer-content">
            <p>&copy; 2024 PDF Tools Pro. Built with ❤️ for privacy and performance.</p>
            <div className="footer-links">
              <a href="https://github.com" target="_blank" rel="noopener">GitHub</a>
              <a href="#" onClick={() => showSection('privacy')}>Privacy</a>
              <a href="#" onClick={() => showSection('about')}>About</a>
            </div>
          </div>
        </div>
      </footer>

      <div className={`progress-overlay ${processing ? '' : 'hidden'}`}>
        <div className="progress-card">
          <div className="progress-title">Processing...</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}>
              <div className="progress-shimmer"></div>
            </div>
          </div>
          <div className="progress-label">{Math.round(progress)}%</div>
        </div>
      </div>

      <div className="chatbot">
        {!chatOpen && <button className="chat-toggle" onClick={() => setChatOpen(true)}>💬</button>}
        {chatOpen && (
          <div className="chat-window">
            <div className="chat-header">
              <h4>PDF Assistant</h4>
              <button onClick={() => setChatOpen(false)}>×</button>
            </div>
            <div className="chat-messages">
              {messages.map((msg, i) => (
                <div key={i} className={`message ${msg.role}`}>
                  {msg.content}
                  {msg.tool && <button onClick={() => { selectTool(msg.tool); setChatOpen(false) }}>Open Tool</button>}
                </div>
              ))}
            </div>
            <div className="chat-input">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} />
              <button onClick={sendMessage}>Send</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
