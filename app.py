import os
import secrets
from werkzeug.middleware.proxy_fix import ProxyFix
from flask import Flask, request, jsonify, render_template

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
STATIC_DIR = os.path.join(BASE_DIR, "static")
DATA_DIR = os.path.join(STATIC_DIR, "data")

try:
    os.makedirs(DATA_DIR, exist_ok=True)
except OSError:
    pass

app = Flask(__name__, template_folder=TEMPLATES_DIR, static_folder=STATIC_DIR)
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)
app.secret_key = os.getenv("SECRET_KEY", secrets.token_hex(24))

@app.route("/")
def index():
    return render_template("modulos_render/index.html")

@app.route("/modulos_render/<modulo>")
def modulos_render(modulo):
    ruta = f"modulos_render/{modulo}.html"
    return render_template(ruta)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 7070))
    app.run(debug=False, host="0.0.0.0", port=port)
