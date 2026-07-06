# BigQuery Release Notes Hub

A modern, responsive dashboard to track, search, filter, and share Google Cloud BigQuery release updates. This application features a Flask-based backend that pulls live feeds from Google Cloud and parses them into a sleek, premium dark-mode interface.

## 🚀 Features

- **Live Aggregation**: Fetches the official Google Cloud BigQuery RSS/Atom release notes feed in real-time.
- **Smart Parsing**: Automatically breaks down aggregated release entries using regex patterns to isolate specific updates by type.
- **Rich Filters & Search**: Filter updates by event type (Feature, Changed, Deprecated, Fixed, General) and run text searches on-the-fly.
- **Social Sharing**: Select any update to stage and tweet it directly to Twitter (X) with pre-formatted tags and links.
- **Sleek UX/UI**: Implements modern typography, glow background accents, dynamic micro-interactions, and skeleton loader states.

---

## 📂 Project Structure

```text
bigquery-release-notes/
├── app.py              # Flask server and XML parser
├── static/
│   ├── script.js       # Search, filter, and drawer logic
│   └── style.css       # Custom styles, dark theme, & animations
├── templates/
│   └── index.html      # Main dashboard HTML template
├── .gitignore          # Git ignore rules
└── README.md           # Project documentation
```

---

## 🛠️ Getting Started

### Prerequisites

- Python 3.8+
- pip (Python package installer)

### Installation

1. Clone this repository (or copy the project directory).
2. Install the required Python packages:

   ```bash
   pip install flask requests markupsafe
   ```

### Running the App

Start the development server by running:

```bash
python app.py
```

The application will run locally at **[http://127.0.0.1:5000](http://127.0.0.1:5000)**.

---

## ⚙️ How it Works

1. **Backend**:
   - The Flask server sends a request to Google's public Atom feed URL: `https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`.
   - The XML response is stripped and parsed using Python's `xml.etree.ElementTree`.
   - HTML contents are parsed using regular expressions (`<h3>([^<]+)</h3>([\s\S]*?)(?=<h3>|$)`) to split daily update lists into standalone features, changes, and bug fixes.
   
2. **Frontend**:
   - The UI requests `/api/notes` on load (and on refresh).
   - Once resolved, cards are generated dynamically.
   - Clicking a card opens the floating share drawer, prompting the user to share the selected note.
