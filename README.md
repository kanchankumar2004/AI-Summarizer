# ⚡ AI Summarizer — Multi-Source Content Intelligence Platform

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Flask](https://img.shields.io/badge/Flask-3.x-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Gemini AI](https://img.shields.io/badge/Google_Gemini-3.5_Flash-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

A high-performance, full-stack AI content intelligence web application designed to transform long text documents, multi-page PDFs, YouTube video transcripts, and website URLs into structured, high-quality summaries powered by **Google Gemini AI**.

---

## 🌟 Key Features

- 📝 **Raw Text Analysis**: Paste long articles, reports, or raw text for sub-second AI summarization.
- 📄 **PDF Document Scanner**: Native drag-and-drop PDF parser extracting text from multi-page documents.
- 📺 **YouTube Video Intelligence**: Automatically extracts video transcripts and synthesizes key video insights.
- 🌐 **Website & Article Scraper**: Fetches clean text from web URLs and generates structured briefs.
- 🎛️ **Granular Controls**:
  - **Summary Length**: `Short (~150 words)`, `Medium (~300 words)`, `Detailed (~500+ words)`
  - **Format Style**: `Bullet Points`, `Executive Brief`, `Key Takeaways`, `Q&A Format`
- 🛡️ **Resilient Model Failover**: Automatic retry & failover across high-throughput Gemini models (`gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-flash-lite-latest`) to eliminate rate limits.
- 🎨 **Black & White High-Contrast UI**: Modern minimalist dark mode glassmorphism interface.
- 🔊 **Audio Reader (TTS)**: Built-in text-to-speech audio playback.
- 📥 **1-Click Export**: Download summaries instantly as formatted Markdown (`.md`) files.

---

## 🏗️ Project Architecture

```
AI-Summarizer/
├── backend/                  # Python Flask REST API Engine
│   ├── app.py                # Core Flask server & Gemini API integration
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Environment configuration template
│
├── frontend/                 # React Single Page Application
│   ├── public/               # Static assets & custom SVG favicon
│   └── src/
│       ├── App.js            # Main React UI Workbench Component
│       ├── App.css           # Black & White luxury styling system
│       └── index.css         # Global monochrome design tokens
│
└── .gitignore                # Protects secrets (.env) & heavy directories
```

---

## 🚀 Quick Start Guide

### Prerequisites

- **Python**: `v3.8` or higher
- **Node.js**: `v16.0` or higher
- **Gemini API Key**: Free API Key from [Google AI Studio](https://aistudio.google.com/app/apikey)

---

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure your Environment Variables
cp .env.example .env
```

Open `backend/.env` and insert your Gemini API Key:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

Start the Flask Backend Server:
```bash
python app.py
```
*The backend runs on `http://127.0.0.1:5000`.*

---

### 2. Frontend Setup

In a new terminal window:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the React Development Server
npm start
```
*The app will automatically open at `http://localhost:3000`.*

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Description | Payload Example |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/summarize/text` | Summarize raw text string | `{"text": "...", "length": "medium", "format": "bullets"}` |
| `POST` | `/api/summarize/pdf` | Parse & summarize uploaded PDF file | `FormData (file, length, format)` |
| `POST` | `/api/summarize/youtube` | Fetch captions & summarize video | `{"video_url": "https://youtu.be/...", "length": "short"}` |
| `POST` | `/api/summarize/website` | Scrape & summarize web page | `{"website_url": "https://example.com", "format": "executive"}` |
| `GET`  | `/api/health` | Check API & key connection status | *None* |

---

## ⚙️ How Model Failover Works

To prevent `429 Rate Limit` or `Quota Exhausted` errors on free-tier keys, the backend uses an automated model rotation pool:

1. **Primary**: `gemini-3.5-flash`
2. **Fallback 1**: `gemini-3.5-flash-lite`
3. **Fallback 2**: `gemini-flash-lite-latest`

If one model encounters a rate burst, the system automatically pauses for 2 seconds and switches to the next available model pool without breaking the user experience.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 🤝 Author & Acknowledgements

Created by **[Kanchan Kumar](https://github.com/kanchankumar2004)**.  
Powered by **Google Gemini API** & **Flask + React**.
