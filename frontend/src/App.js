import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import {
  FileText,
  FileSpreadsheet,
  Globe,
  Sparkles,
  Copy,
  Check,
  Download,
  Volume2,
  VolumeX,
  Trash2,
  UploadCloud,
  Clock,
  BookOpen,
  AlertCircle,
  ArrowRight,
  Zap,
  Target,
  Shield,
  RefreshCw
} from 'lucide-react';
import './App.css';

// Custom High-Tech AI Summarizer Logo Mark
const BrandLogo = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 8 L86 26 L86 74 L50 92 L14 74 L14 26 Z" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.95"/>
    <circle cx="50" cy="50" r="22" stroke={color} strokeWidth="3" strokeDasharray="5 4" opacity="0.6"/>
    <path d="M50 28 L54 42 L68 46 L54 50 L50 64 L46 50 L32 46 L46 42 Z" fill={color}/>
    <circle cx="50" cy="8" r="4" fill={color}/>
    <circle cx="86" cy="26" r="4" fill={color}/>
    <circle cx="86" cy="74" r="4" fill={color}/>
    <circle cx="50" cy="92" r="4" fill={color}/>
    <circle cx="14" cy="74" r="4" fill={color}/>
    <circle cx="14" cy="26" r="4" fill={color}/>
  </svg>
);

// Custom YouTube Icon
const YoutubeIcon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.56 49.56 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3v6Z" fill={color} />
  </svg>
);

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:5000/api';

function App() {
  const [mode, setMode] = useState('text');

  // Input state
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [youtubeURL, setYoutubeURL] = useState('');
  const [websiteURL, setWebsiteURL] = useState('');

  // Summarizer Settings
  const [length, setLength] = useState('medium');
  const [format, setFormat] = useState('bullets');

  // Server health state
  const [serverHasKey, setServerHasKey] = useState(true);

  // Summarization State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summaryData, setSummaryData] = useState(null);

  // Action states
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    checkServerHealth();
  }, []);

  const checkServerHealth = async () => {
    try {
      const res = await axios.get(`${API_BASE}/health`, { timeout: 4000 });
      if (res.data) {
        setServerHasKey(Boolean(res.data.has_env_api_key));
      }
    } catch (err) {
      console.warn("Backend API check error:", err);
    }
  };

  const handleTextSummarization = async () => {
    if (!text.trim()) {
      setError("Please enter or paste content to summarize.");
      return;
    }
    runSummarization('/summarize/text', { text, length, format });
  };

  const handlePDFSummarization = async () => {
    if (!file) {
      setError("Please select or drop a PDF document first.");
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('length', length);
    formData.append('format', format);
    runSummarization('/summarize/pdf', formData, true);
  };

  const handleYouTubeSummarization = async () => {
    if (!youtubeURL.trim()) {
      setError("Please enter a valid YouTube video URL.");
      return;
    }
    runSummarization('/summarize/youtube', { video_url: youtubeURL, length, format });
  };

  const handleWebsiteSummarization = async () => {
    if (!websiteURL.trim()) {
      setError("Please enter a valid website URL.");
      return;
    }
    runSummarization('/summarize/website', { website_url: websiteURL, length, format });
  };

  const runSummarization = async (endpoint, payload, isFormData = false) => {
    setLoading(true);
    setError(null);
    setSummaryData(null);

    try {
      const config = {};
      if (isFormData) {
        config.headers = { 'Content-Type': 'multipart/form-data' };
      }

      const response = await axios.post(`${API_BASE}${endpoint}`, payload, config);
      if (response.data && response.data.summary) {
        setSummaryData(response.data);
      } else {
        setError("Summarizer returned empty output. Please try again.");
      }
    } catch (err) {
      console.error("Summarization error:", err);
      const errMsg = err.response?.data?.error || err.message || "Failed to generate AI summary.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Helper actions
  const copyToClipboard = () => {
    if (!summaryData?.summary) return;
    navigator.clipboard.writeText(summaryData.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadSummary = () => {
    if (!summaryData?.summary) return;
    const blob = new Blob([summaryData.summary], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `AI_Summary_${mode}_${Date.now()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else if (summaryData?.summary) {
      const cleanText = summaryData.summary.replace(/[#*`_]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => { e.preventDefault(); setDragActive(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setDragActive(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf' || droppedFile.name.endsWith('.pdf')) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError("Please upload a valid PDF document.");
      }
    }
  };

  const calcTimeSaved = () => {
    if (!summaryData?.original_word_count) return null;
    const origMinutes = summaryData.original_word_count / 200;
    const sumMinutes = (summaryData.summary_word_count || 50) / 200;
    const saved = Math.max(1, Math.round(origMinutes - sumMinutes));
    return `${saved} min read saved`;
  };

  const fillSampleText = () => {
    setText(`Artificial Intelligence (AI) is transforming every sector of human activity, from healthcare and education to financial markets and creative industries. At its core, modern AI relies on deep learning neural networks trained on massive volumes of data.

Generative AI models, such as Large Language Models (LLMs), have demonstrated impressive capabilities in natural language understanding, reasoning, translation, and code generation. These advancements enable software to summarize long documents, translate multi-lingual text instantly, and assist human experts in scientific research.

However, alongside these powerful benefits come challenges regarding data privacy, bias in algorithm training sets, energy consumption of massive computing clusters, and ethical AI deployment. Industry leaders and regulators worldwide are establishing ethical guidelines to ensure artificial intelligence serves humanity safely, transparently, and equitably.`);
    setError(null);
  };

  const fillSampleYouTube = () => {
    setYoutubeURL("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    setError(null);
  };

  const fillSampleWebsite = () => {
    setWebsiteURL("https://en.wikipedia.org/wiki/Artificial_intelligence");
    setError(null);
  };

  return (
    <div className="App">
      {/* Floating WAMA Header Navigation Bar */}
      <header className="wama-header">
        <div className="wama-brand">
          <div className="wama-logo-mark">
            <BrandLogo size={24} color="#000000" />
          </div>
          <span className="wama-brand-title">AI Summarizer</span>
        </div>

        <div className="status-pill">
          <div className="pulse-dot"></div>
          {serverHasKey ? 'Gemini AI Online' : 'Check .env API Key'}
        </div>
      </header>

      {/* WAMA Hero Section */}
      <section className="hero-section">
        <div className="hero-pill-badge">
          <BrandLogo size={14} color="#ffffff" /> AI CONTENT INTELLIGENCE PLATFORM
        </div>

        <h1 className="hero-title">
          Summarize Text, PDFs, YouTube & Websites in Seconds
        </h1>

        <p className="hero-subtitle">
          Powered by Google Gemini AI. Transform long reports, multi-page PDFs, video transcripts, and web pages into clear, structured summaries.
        </p>

        {/* Hero Feature Metric Cards */}
        <div className="hero-stats-grid">
          <div className="stat-card">
            <div className="stat-card-number">
              <Zap size={20} color="#ffffff" /> Sub-Second
            </div>
            <div className="stat-card-label">Real-Time AI Synthesis</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-number">
              <Target size={20} color="#ffffff" /> 4 Sources
            </div>
            <div className="stat-card-label">Text, PDF, YouTube & URLs</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-number">
              <Shield size={20} color="#ffffff" /> 100% Free
            </div>
            <div className="stat-card-label">Powered by Backend API Key</div>
          </div>
        </div>
      </section>

      {/* Main Workbench Workspace */}
      <main className="workbench-container">
        <div className="glass-workbench">
          {/* Segmented Mode Selector Bar */}
          <div className="mode-pill-bar">
            <button
              className={`mode-pill-btn ${mode === 'text' ? 'active' : ''}`}
              onClick={() => { setMode('text'); setError(null); }}
            >
              <FileText size={18} /> Text Document
            </button>

            <button
              className={`mode-pill-btn ${mode === 'pdf' ? 'active' : ''}`}
              onClick={() => { setMode('pdf'); setError(null); }}
            >
              <FileSpreadsheet size={18} /> PDF File Upload
            </button>

            <button
              className={`mode-pill-btn ${mode === 'youtube' ? 'active' : ''}`}
              onClick={() => { setMode('youtube'); setError(null); }}
            >
              <YoutubeIcon size={18} color={mode === 'youtube' ? '#000' : '#fff'} /> YouTube Video
            </button>

            <button
              className={`mode-pill-btn ${mode === 'website' ? 'active' : ''}`}
              onClick={() => { setMode('website'); setError(null); }}
            >
              <Globe size={18} color={mode === 'website' ? '#000' : '#fff'} /> Website URL
            </button>
          </div>

          {/* Form Input Section */}
          <div className="input-area-wrapper">
            {/* TEXT MODE */}
            {mode === 'text' && (
              <div>
                <div className="textarea-container">
                  <textarea
                    className="wama-textarea"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste or write your long text, report, or article here to analyze and summarize..."
                  />
                </div>
                <div className="input-meta-bar">
                  <span>{text ? text.split(/\s+/).filter(Boolean).length : 0} words | {text.length} characters</span>
                  <button className="sample-link-btn" onClick={fillSampleText}>
                    Fill Sample Text
                  </button>
                </div>
              </div>
            )}

            {/* PDF MODE */}
            {mode === 'pdf' && (
              <div>
                {!file ? (
                  <div
                    className={`dropzone-box ${dragActive ? 'drag-active' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('wama-pdf-input').click()}
                  >
                    <input
                      id="wama-pdf-input"
                      type="file"
                      accept=".pdf"
                      style={{ display: 'none' }}
                      onChange={(e) => e.target.files[0] && setFile(e.target.files[0])}
                    />
                    <div className="dropzone-icon-circle">
                      <UploadCloud size={28} />
                    </div>
                    <div className="dropzone-main-text">Click to upload or drag & drop PDF document</div>
                    <div className="dropzone-sub-text">Supports PDF files up to 50MB</div>
                  </div>
                ) : (
                  <div className="file-preview-card">
                    <div className="file-preview-left">
                      <FileSpreadsheet size={28} color="#ffffff" />
                      <div>
                        <div style={{ fontWeight: 700, color: '#fff' }}>{file.name}</div>
                        <div style={{ fontSize: '0.82rem', color: '#a3a3a3' }}>
                          {(file.size / (1024 * 1024)).toFixed(2)} MB · PDF Document
                        </div>
                      </div>
                    </div>
                    <button className="delete-file-btn" onClick={() => setFile(null)} title="Remove file">
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* YOUTUBE MODE */}
            {mode === 'youtube' && (
              <div className="url-input-box">
                <label className="input-label-text">
                  <YoutubeIcon size={18} color="#ffffff" /> YouTube Video URL
                </label>
                <input
                  type="text"
                  className="wama-url-input"
                  value={youtubeURL}
                  onChange={(e) => setYoutubeURL(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <div style={{ textAlign: 'right', marginTop: '0.25rem' }}>
                  <button className="sample-link-btn" onClick={fillSampleYouTube}>
                    Fill Sample YouTube URL
                  </button>
                </div>
              </div>
            )}

            {/* WEBSITE MODE */}
            {mode === 'website' && (
              <div className="url-input-box">
                <label className="input-label-text">
                  <Globe size={18} color="#ffffff" /> Website or Article URL
                </label>
                <input
                  type="text"
                  className="wama-url-input"
                  value={websiteURL}
                  onChange={(e) => setWebsiteURL(e.target.value)}
                  placeholder="https://example.com/article..."
                />
                <div style={{ textAlign: 'right', marginTop: '0.25rem' }}>
                  <button className="sample-link-btn" onClick={fillSampleWebsite}>
                    Fill Sample Web URL
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Options Controller: Length & Format */}
          <div className="options-bar">
            <div>
              <div className="option-group-label">Summary Length</div>
              <div className="option-pill-group">
                <button
                  className={`option-pill ${length === 'short' ? 'active' : ''}`}
                  onClick={() => setLength('short')}
                >
                  Short (~150 words)
                </button>
                <button
                  className={`option-pill ${length === 'medium' ? 'active' : ''}`}
                  onClick={() => setLength('medium')}
                >
                  Medium (~300 words)
                </button>
                <button
                  className={`option-pill ${length === 'detailed' ? 'active' : ''}`}
                  onClick={() => setLength('detailed')}
                >
                  Detailed (~500+ words)
                </button>
              </div>
            </div>

            <div>
              <div className="option-group-label">Format Style</div>
              <div className="option-pill-group">
                <button
                  className={`option-pill ${format === 'bullets' ? 'active' : ''}`}
                  onClick={() => setFormat('bullets')}
                >
                  Bullet Points
                </button>
                <button
                  className={`option-pill ${format === 'executive' ? 'active' : ''}`}
                  onClick={() => setFormat('executive')}
                >
                  Executive Brief
                </button>
                <button
                  className={`option-pill ${format === 'takeaways' ? 'active' : ''}`}
                  onClick={() => setFormat('takeaways')}
                >
                  Key Takeaways
                </button>
                <button
                  className={`option-pill ${format === 'qa' ? 'active' : ''}`}
                  onClick={() => setFormat('qa')}
                >
                  Q&A Format
                </button>
              </div>
            </div>
          </div>

          {/* Error Alert Banner */}
          {error && (
            <div className="wama-error-banner">
              <AlertCircle size={22} style={{ flexShrink: 0, marginTop: 2, color: '#ffffff' }} />
              <div>
                <div style={{ fontWeight: 700, color: '#fff', marginBottom: '0.2rem' }}>Notice</div>
                <div style={{ fontSize: '0.9rem' }}>{error}</div>
              </div>
            </div>
          )}

          {/* Primary Action Button */}
          <button
            className="wama-cta-button"
            disabled={loading}
            onClick={() => {
              if (mode === 'text') handleTextSummarization();
              else if (mode === 'pdf') handlePDFSummarization();
              else if (mode === 'youtube') handleYouTubeSummarization();
              else if (mode === 'website') handleWebsiteSummarization();
            }}
          >
            {loading ? (
              <>
                <RefreshCw size={20} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
                Generating AI Summary with Gemini...
              </>
            ) : (
              <>
                Generate AI Summary <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>

        {/* Loading Spinner Workbench */}
        {loading && (
          <div className="glass-workbench loading-workbench">
            <div className="wama-spinner"></div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
              Analyzing Source Content & Extracting Key Insights...
            </div>
            <div style={{ color: '#a3a3a3', fontSize: '0.9rem' }}>Powered by Google Gemini AI</div>
          </div>
        )}

        {/* Output Workbench */}
        {summaryData && !loading && (
          <div className="output-workbench">
            <div className="output-header-bar">
              <div className="output-title-text">
                <BrandLogo size={24} color="#ffffff" /> AI Summary Result
              </div>

              <div className="action-tools-group">
                <button
                  className={`tool-btn ${isSpeaking ? 'speaking' : ''}`}
                  onClick={toggleSpeech}
                  title="Listen out loud"
                >
                  {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  {isSpeaking ? 'Stop Audio' : 'Listen Out Loud'}
                </button>

                <button className="tool-btn" onClick={copyToClipboard} title="Copy summary">
                  {copied ? <Check size={16} color="#ffffff" /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy Summary'}
                </button>

                <button className="tool-btn" onClick={downloadSummary} title="Download Markdown file">
                  <Download size={16} /> Export Markdown
                </button>
              </div>
            </div>

            {/* Metrics Bar */}
            <div className="metrics-pill-bar">
              {summaryData.original_word_count && (
                <div className="metric-pill">
                  <BookOpen size={15} color="#ffffff" /> Source Words: <strong>{summaryData.original_word_count}</strong>
                </div>
              )}
              {summaryData.summary_word_count && (
                <div className="metric-pill">
                  <Sparkles size={15} color="#ffffff" /> Summary Words: <strong>{summaryData.summary_word_count}</strong>
                </div>
              )}
              {calcTimeSaved() && (
                <div className="metric-pill">
                  <Clock size={15} color="#ffffff" /> Reading Saved: <strong style={{ color: '#ffffff' }}>{calcTimeSaved()}</strong>
                </div>
              )}
            </div>

            {/* Markdown Output Body */}
            <div className="wama-markdown">
              <ReactMarkdown>{summaryData.summary}</ReactMarkdown>
            </div>
          </div>
        )}
      </main>

      {/* WAMA Footer */}
      <footer className="wama-footer">
        <p>AI Summarizer Platform · Text, PDF, YouTube & Website Intelligence powered by Google Gemini AI</p>
      </footer>
    </div>
  );
}

export default App;
