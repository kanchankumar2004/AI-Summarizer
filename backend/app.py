import os
import re
import time
import pymupdf as fitz  # PyMuPDF
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from youtube_transcript_api import YouTubeTranscriptApi

# Top-level SDK variable declarations for linter safety
genai = None
legacy_genai = None

# Try importing official Google GenAI SDK
try:
    from google import genai
    HAS_GENAI_SDK = True
except ImportError:
    genai = None
    HAS_GENAI_SDK = False

# Fallback to legacy SDK if installed
try:
    import google.generativeai as legacy_genai
    HAS_LEGACY_SDK = True
except ImportError:
    legacy_genai = None
    HAS_LEGACY_SDK = False

# Load environment variables from backend/.env
load_dotenv()

app = Flask(__name__)
# Enable CORS for frontend requests
CORS(app, resources={r"/api/*": {"origins": "*"}})

def format_error_message(err):
    """
    Format error objects into clear user-friendly messages.
    """
    err_str = str(err)
    err_lower = err_str.lower()
    
    # Preserve specific YouTube and PDF extraction error messages directly
    if "transcript" in err_lower or "youtube" in err_lower or "captions" in err_lower or "pdf" in err_lower or "file" in err_lower:
        return err_str

    if "api_key_invalid" in err_lower or "api key not valid" in err_lower:
        return "The GEMINI_API_KEY in backend/.env is invalid. Please check your key at https://aistudio.google.com/app/apikey"
    if "quota" in err_lower or "resource_exhausted" in err_lower or "429" in err_str:
        return "Gemini API free quota or rate limit reached. Please wait a minute and try again."
    if "503" in err_str or "unavailable" in err_lower or "high demand" in err_lower:
        return "Gemini API servers are currently experiencing temporary high demand. Please try again in a few seconds."
        
    return err_str

def get_api_key():
    """
    Extract API key from environment variable GEMINI_API_KEY.
    """
    env_key = os.getenv("GEMINI_API_KEY")
    if env_key and env_key.strip() and env_key.strip() != "your_gemini_api_key_here":
        return env_key.strip()
    return None

def build_prompt(content, length="medium", format_type="bullets", source_type="text"):
    """
    Construct a structured prompt for Gemini based on user settings.
    """
    length_desc = {
        "short": "Concise summary (approx. 100-150 words)",
        "medium": "Balanced summary (approx. 250-350 words)",
        "detailed": "Comprehensive detailed analysis (approx. 500+ words)"
    }.get(length, "Balanced summary")

    format_desc = {
        "bullets": "Use clean Markdown bullet points grouped by key themes.",
        "executive": "Provide an Executive Summary with an Overview, Key Points, and Strategic Takeaways.",
        "takeaways": "List the top 5-7 actionable key takeaways with bold emphasis.",
        "qa": "Structure the summary as a Q&A format answering the main questions addressed in the content."
    }.get(format_type, "Use Markdown bullet points.")

    prompt = f"""You are an expert AI summarizer. Please analyze the following content extracted from a {source_type} and provide a high-quality, accurately structured summary.

Summary Guidelines:
- Length: {length_desc}
- Format: {format_desc}
- Tone: Professional, clear, objective, and easy to read.
- Use Markdown formatting (headings, bold text, bullet points) effectively.
- Highlight critical insights and avoid fluff or meta-commentary.

Content to Summarize:
---
{content}
---
"""
    return prompt

def generate_gemini_summary(prompt, api_key):
    """
    Call Google Gemini API using google-genai SDK across active model variants.
    """
    if not api_key or api_key == "your_gemini_api_key_here":
        raise ValueError("GEMINI_API_KEY is missing in backend/.env. Please configure your API key in backend/.env file.")

    if HAS_GENAI_SDK and genai is not None:
        client = genai.Client(api_key=api_key)
        # Avoid gemini-3.6-flash which has a tiny 20 req/day quota on free tier.
        models_to_try = [
            "gemini-3.5-flash",
            "gemini-3.5-flash-lite",
            "gemini-flash-lite-latest",
            "gemini-2.5-flash-lite"
        ]
        last_exception = None
        
        for model_name in models_to_try:
            for attempt in range(2):
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                    )
                    if response and response.text:
                        return response.text
                except Exception as e:
                    err_str = str(e)
                    err_lower = err_str.lower()
                    last_exception = e
                    
                    # Fail fast if API key is invalid
                    if "api_key_invalid" in err_lower or "api key not valid" in err_lower:
                        raise ValueError("The GEMINI_API_KEY in backend/.env is invalid. Please check your key at https://aistudio.google.com/app/apikey") from e

                    # 404 model not found -> jump straight to next model
                    if "404" in err_str:
                        break

                    # 429 quota / rate limit -> sleep briefly then try next attempt or failover to next model
                    if "429" in err_str or "quota" in err_lower or "resource_exhausted" in err_lower:
                        time.sleep(2.0)
                        if attempt == 1:
                            # Move to next model pool
                            break
                        continue

                    # 503 temporary load spike -> back off and retry
                    if "503" in err_str or "unavailable" in err_lower or "high demand" in err_lower:
                        time.sleep(1.5 * (attempt + 1))
                        continue

                    break

        if last_exception:
            raise last_exception

    elif HAS_LEGACY_SDK and legacy_genai is not None:
        legacy_genai.configure(api_key=api_key)
        for model_name in ['gemini-1.5-flash', 'gemini-1.5-pro']:
            try:
                model = legacy_genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                if response and response.text:
                    return response.text
            except Exception:
                continue

    raise RuntimeError("No compatible Gemini SDK available or API call failed.")

def extract_youtube_id(url_or_id):
    """
    Extract YouTube Video ID from various URL formats or direct ID string.
    """
    if not url_or_id:
        return None
    url_or_id = url_or_id.strip()
    
    if 'v=' in url_or_id:
        v_match = re.search(r'v=([0-9A-Za-z_-]{11})', url_or_id)
        if v_match:
            return v_match.group(1)
            
    if 'youtu.be/' in url_or_id:
        short_match = re.search(r'youtu\.be\/([0-9A-Za-z_-]{11})', url_or_id)
        if short_match:
            return short_match.group(1)
            
    if 'shorts/' in url_or_id:
        shorts_match = re.search(r'shorts\/([0-9A-Za-z_-]{11})', url_or_id)
        if shorts_match:
            return shorts_match.group(1)

    if re.match(r'^[0-9A-Za-z_-]{11}$', url_or_id):
        return url_or_id

    return None

def fetch_youtube_transcript(video_id):
    """
    Fetch YouTube transcript using youtube-transcript-api across versions.
    """
    try:
        ytt = YouTubeTranscriptApi()
        if hasattr(ytt, 'fetch'):
            snippets = ytt.fetch(video_id, languages=['en', 'en-US', 'hi', 'es', 'fr', 'de'])
            full_text = " ".join([getattr(s, 'text', str(s)) for s in snippets])
            if full_text.strip():
                return full_text
    except Exception:
        pass

    try:
        ytt = YouTubeTranscriptApi()
        if hasattr(ytt, 'fetch'):
            snippets = ytt.fetch(video_id)
            full_text = " ".join([getattr(s, 'text', str(s)) for s in snippets])
            if full_text.strip():
                return full_text
    except Exception:
        pass

    if hasattr(YouTubeTranscriptApi, 'get_transcript'):
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'en-US', 'hi', 'es', 'fr', 'de'])
            return " ".join([entry.get('text', '') if isinstance(entry, dict) else getattr(entry, 'text', str(entry)) for entry in transcript_list])
        except Exception:
            pass

    raise RuntimeError(f"No transcript or captions available for YouTube video (ID: {video_id}). Please ensure captions are enabled on the video.")

@app.route('/api/health', methods=['GET'])
def health_check():
    key = get_api_key()
    has_env_key = bool(key and len(key) > 10)
    return jsonify({
        "status": "healthy",
        "service": "AI-Summarizer Backend",
        "has_env_api_key": has_env_key,
        "sdk": "google-genai" if HAS_GENAI_SDK else ("google-generativeai" if HAS_LEGACY_SDK else "none")
    })

@app.route('/api/summarize/text', methods=['POST'])
def summarize_text():
    try:
        data = request.get_json() or {}
        text = data.get('text', '').strip()
        length = data.get('length', 'medium')
        format_type = data.get('format', 'bullets')
        
        if not text:
            return jsonify({"error": "Please enter text to summarize."}), 400

        api_key = get_api_key()
        if not api_key:
            return jsonify({"error": "GEMINI_API_KEY is missing in backend/.env. Please configure your API key in backend/.env file."}), 401

        prompt = build_prompt(text, length, format_type, source_type="Text Document")
        summary = generate_gemini_summary(prompt, api_key)
        
        word_count = len(text.split())
        return jsonify({
            "summary": summary,
            "original_word_count": word_count,
            "summary_word_count": len(summary.split())
        })

    except Exception as e:
        app.logger.error(f"Error in text summarization: {str(e)}")
        return jsonify({"error": format_error_message(e)}), 400

@app.route('/api/summarize/pdf', methods=['POST'])
def summarize_pdf():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded."}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected."}), 400

        if not file.filename.lower().endswith('.pdf'):
            return jsonify({"error": "Invalid file format. Only PDF files are supported."}), 400

        length = request.form.get('length', 'medium')
        format_type = request.form.get('format', 'bullets')
        api_key = get_api_key()
        if not api_key:
            return jsonify({"error": "GEMINI_API_KEY is missing in backend/.env. Please configure your API key in backend/.env file."}), 401

        file.seek(0)
        pdf_document = fitz.open(stream=file.read(), filetype="pdf")
        total_pages = len(pdf_document)
        extracted_text = ""
        
        for page_num in range(total_pages):
            page = pdf_document[page_num]
            extracted_text += f"\n--- Page {page_num + 1} ---\n" + page.get_text()

        extracted_text = extracted_text.strip()
        if not extracted_text:
            return jsonify({"error": "Could not extract any readable text from the PDF file."}), 400

        prompt = build_prompt(extracted_text, length, format_type, source_type=f"PDF Document ({total_pages} pages, filename: {file.filename})")
        summary = generate_gemini_summary(prompt, api_key)

        return jsonify({
            "summary": summary,
            "filename": file.filename,
            "total_pages": total_pages,
            "original_word_count": len(extracted_text.split()),
            "summary_word_count": len(summary.split())
        })

    except Exception as e:
        app.logger.error(f"Error in PDF summarization: {str(e)}")
        return jsonify({"error": format_error_message(e)}), 400

@app.route('/api/summarize/youtube', methods=['POST'])
def summarize_youtube():
    try:
        data = request.get_json() or {}
        video_url = data.get('video_url', '').strip()
        length = data.get('length', 'medium')
        format_type = data.get('format', 'bullets')
        
        if not video_url:
            return jsonify({"error": "Please enter a YouTube video URL."}), 400

        video_id = extract_youtube_id(video_url)
        if not video_id:
            return jsonify({"error": "Invalid YouTube URL format. Please provide a valid YouTube video link."}), 400

        api_key = get_api_key()
        if not api_key:
            return jsonify({"error": "GEMINI_API_KEY is missing in backend/.env. Please configure your API key in backend/.env file."}), 401

        try:
            transcript_text = fetch_youtube_transcript(video_id)
        except Exception as transcript_err:
            return jsonify({"error": str(transcript_err)}), 400

        if not transcript_text.strip():
            return jsonify({"error": "Transcript was empty for this YouTube video."}), 400

        prompt = build_prompt(transcript_text, length, format_type, source_type=f"YouTube Video (ID: {video_id})")
        summary = generate_gemini_summary(prompt, api_key)

        return jsonify({
            "summary": summary,
            "video_id": video_id,
            "video_url": f"https://www.youtube.com/watch?v={video_id}",
            "original_word_count": len(transcript_text.split()),
            "summary_word_count": len(summary.split())
        })

    except Exception as e:
        app.logger.error(f"Error in YouTube summarization: {str(e)}")
        return jsonify({"error": format_error_message(e)}), 400

@app.route('/api/summarize/website', methods=['POST'])
def summarize_website():
    try:
        data = request.get_json() or {}
        website_url = data.get('website_url', '').strip()
        length = data.get('length', 'medium')
        format_type = data.get('format', 'bullets')

        if not website_url:
            return jsonify({"error": "Please enter a website URL."}), 400

        if not website_url.startswith(('http://', 'https://')):
            website_url = 'https://' + website_url

        api_key = get_api_key()
        if not api_key:
            return jsonify({"error": "GEMINI_API_KEY is missing in backend/.env. Please configure your API key in backend/.env file."}), 401

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
        try:
            resp = requests.get(website_url, headers=headers, timeout=12)
            if resp.status_code != 200:
                return jsonify({"error": f"Failed to fetch website content. Server returned status code {resp.status_code}."}), 400
        except Exception as req_err:
            return jsonify({"error": f"Failed to connect to website: {str(req_err)}"}), 400

        soup = BeautifulSoup(resp.content, 'html.parser')

        for element in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe', 'form', 'noscript']):
            element.decompose()

        page_title = soup.title.string.strip() if soup.title and soup.title.string else website_url
        
        text_blocks = []
        for tag in soup.find_all(['h1', 'h2', 'h3', 'p', 'article', 'li']):
            content = tag.get_text(strip=True)
            if content and len(content) > 15:
                text_blocks.append(content)

        full_text = "\n".join(text_blocks)
        if not full_text:
            full_text = soup.get_text(separator=' ', strip=True)

        if not full_text or len(full_text.strip()) < 50:
            return jsonify({"error": "Could not extract sufficient text content from this website."}), 400

        prompt = build_prompt(full_text, length, format_type, source_type=f"Website Page: '{page_title}' ({website_url})")
        summary = generate_gemini_summary(prompt, api_key)

        return jsonify({
            "summary": summary,
            "title": page_title,
            "url": website_url,
            "original_word_count": len(full_text.split()),
            "summary_word_count": len(summary.split())
        })

    except Exception as e:
        app.logger.error(f"Error in website summarization: {str(e)}")
        return jsonify({"error": format_error_message(e)}), 400

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    print(f"[+] AI-Summarizer Backend starting on http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
