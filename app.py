import os
import secrets
import json
from werkzeug.middleware.proxy_fix import ProxyFix
from flask import Flask, request, jsonify, render_template

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
STATIC_DIR = os.path.join(BASE_DIR, "static")
DATA_DIR = os.path.join(STATIC_DIR, "data")

os.makedirs(DATA_DIR, exist_ok=True)

app = Flask(__name__, template_folder=TEMPLATES_DIR, static_folder=STATIC_DIR)
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)
app.secret_key = os.getenv("SECRET_KEY", secrets.token_hex(24))

@app.route("/")
def index():
    return render_template("modulos_render/index.html")

@app.route("/modulos_render/<modulo>")
def modulos_render(modulo):
    return render_template(f"modulos_render/{modulo}.html")

@app.route("/api/grafos/guardar", methods=["POST"])
def guardar_grafo():
    try:
        data = request.get_json()
        nombre_archivo = data.get("nombre", "grafo_guardado.json")
        ruta_archivo = os.path.join(DATA_DIR, nombre_archivo)
        
        with open(ruta_archivo, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
            
        return jsonify({"status": "success", "message": "Grafo guardado correctamente"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/grafos/cargar/<nombre_archivo>", methods=["GET"])
def cargar_grafo(nombre_archivo):
    try:
        ruta_archivo = os.path.join(DATA_DIR, nombre_archivo)
        if not os.path.exists(ruta_archivo):
            return jsonify({"status": "error", "message": "Archivo no encontrado"}), 404
            
        with open(ruta_archivo, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        return jsonify(data)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    port = int(os.getenv("PORT", 7070))
    app.run(debug=False, host="0.0.0.0", port=port)
