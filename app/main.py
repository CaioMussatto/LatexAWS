import os
import uuid
import base64
from flask import Flask, render_template, request, send_file, jsonify
from app.engine.generator import LatexGenerator

app = Flask(__name__)

OUTPUT_DIR = os.path.join(os.getcwd(), "output")
UPLOAD_DIR = os.path.join(os.getcwd(), "temp_uploads")
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate():
    try:
        data = request.json
        elements = data.get('elements', [])
        job_id = str(uuid.uuid4())
        base_path = os.path.join(OUTPUT_DIR, job_id)
        
        gen = LatexGenerator(base_path)
        temp_files = []

        for el in elements:
            x, y, width = int(el['x']), int(el['y']), int(el['width'])
            
            if el['type'] == 'text':
                gen.add_text_box(el['content'], x, y, width)
            
            elif el['type'] == 'image' and 'content' in el:
                # Processa imagem Base64 vinda do frontend
                header, encoded = el['content'].split(",", 1)
                ext = header.split('/')[1].split(';')[0]
                img_filename = f"img_{uuid.uuid4()}.{ext}"
                img_path = os.path.join(UPLOAD_DIR, img_filename)
                
                with open(img_path, "wb") as f:
                    f.write(base64.b64decode(encoded))
                
                temp_files.append(img_path)
                gen.add_image(img_path, x, y, width)

        pdf_path = gen.generate_pdf()
        
        # Limpa imagens temporárias (opcional, mas recomendado)
        # for f in temp_files: os.remove(f)

        if pdf_path and os.path.exists(pdf_path):
            return jsonify({"status": "success", "pdf_url": f"/download/{job_id}"})
        return jsonify({"status": "error", "message": "Falha na geração"}), 500

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/download/<job_id>')
def download(job_id):
    path = os.path.join(OUTPUT_DIR, f"{job_id}.pdf")
    return send_file(path, as_attachment=True)

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8080, debug=True)