from flask import Flask, request, jsonify, render_template
import json
import os
from datetime import datetime

app = Flask(__name__)
DATA_FILE = "reports.json"

# Загрузка сохранённых отчётов
def load_reports():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

# Сохранение отчётов
def save_reports(reports):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(reports, f, indent=2, ensure_ascii=False)

@app.route("/report", methods=["POST"])
def receive_report():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON data"}), 400

    reports = load_reports()
    data["id"] = len(reports) + 1
    reports.append(data)
    save_reports(reports)
    return jsonify({"status": "success", "id": data["id"]}), 200

@app.route("/")
def dashboard():
    reports = load_reports()
    return render_template("index.html", reports=reports)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)