import re
import requests
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
NAMESPACE = {"atom": "http://www.w3.org/2005/Atom"}

def parse_release_notes():
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        
        # Clean XML of any leading whitespaces/newlines
        xml_content = response.content.strip()
        root = ET.fromstring(xml_content)
        
        updates = []
        
        for entry in root.findall("atom:entry", NAMESPACE):
            title = entry.find("atom:title", NAMESPACE)
            date_str = title.text if title is not None else ""
            
            updated = entry.find("atom:updated", NAMESPACE)
            iso_date = updated.text if updated is not None else ""
            
            link = entry.find("atom:link[@rel='alternate']", NAMESPACE)
            url = link.attrib.get("href", "") if link is not None else ""
            
            content_elem = entry.find("atom:content", NAMESPACE)
            if content_elem is None or not content_elem.text:
                continue
                
            content_html = content_elem.text
            
            # Use regex to find individual update blocks: <h3>[Type]</h3>[Content]
            # Pattern matches <h3>Type</h3> followed by all characters up to the next <h3> or end of string
            pattern = re.compile(r'<h3>([^<]+)</h3>([\s\S]*?)(?=<h3>|$)')
            matches = pattern.findall(content_html)
            
            if not matches:
                # If no <h3> tag is found, fallback to treat the whole content as one general update
                updates.append({
                    "date": date_str,
                    "iso_date": iso_date,
                    "type": "General",
                    "content": content_html.strip(),
                    "url": url
                })
            else:
                for match_type, match_content in matches:
                    updates.append({
                        "date": date_str,
                        "iso_date": iso_date,
                        "type": match_type.strip(),
                        "content": match_content.strip(),
                        "url": url
                    })
                    
        return updates, None
    except Exception as e:
        return [], str(e)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/notes")
def get_notes():
    notes, error = parse_release_notes()
    if error:
        return jsonify({"success": False, "error": error}), 500
    return jsonify({"success": True, "notes": notes})

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
