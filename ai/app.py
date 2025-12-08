# app.py — для мониторинга ПК
from flask import Flask, request, jsonify, render_template
import json
import os

app = Flask(__name__)

DATA_FILE = "reports.json"

def load_reports():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def save_reports(reports):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(reports, f, indent=2, ensure_ascii=False)

@app.route("/report", methods=["POST"])
def receive_report():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON"}), 400
    reports = load_reports()
    data["id"] = len(reports) + 1
    reports.append(data)
    save_reports(reports)
    return jsonify({"status": "ok", "id": data["id"]})

@app.route("/")
def dashboard():
    return render_template("index.html", reports=load_reports())

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)