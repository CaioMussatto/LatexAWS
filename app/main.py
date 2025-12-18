import os
import uuid
import base64
import traceback
from flask import Flask, render_template, request, jsonify, send_from_directory
from app.engine.generator import LatexGenerator

app = Flask(__name__)

UPLOAD_FOLDER = 'temp_uploads'
OUTPUT_FOLDER = 'output'

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate():
    try:
        data = request.json
        pages = data.get('pages', [])
        
        job_id = str(uuid.uuid4())
        pdf_filename = f"caio_design_{job_id}"
        pdf_full_path = os.path.join(OUTPUT_FOLDER, pdf_filename)
        
        gen = LatexGenerator(pdf_full_path)

        for i, page in enumerate(pages):
            if i > 0:
                gen.add_new_pdf_page()

            for el in page.get('elements', []):
                x, y, w, h = el['x'], el['y'], el['w'], el['h']
                
                if el['type'] == 'text':
                    gen.add_text_box(el['content'], x, y, w, h)
                
                elif el['type'] == 'table':
                    gen.add_table(el['content'], x, y, w, h)
                
                elif el['type'] == 'image':
                    try:
                        header, encoded = el['content'].split(",", 1)
                        img_data = base64.b64decode(encoded)
                        img_path = os.path.join(UPLOAD_FOLDER, f"img_{uuid.uuid4().hex}.png")
                        with open(img_path, "wb") as f:
                            f.write(img_data)
                        gen.add_image(img_path, x, y, w, h)
                    except Exception as img_err:
                        print(f"Erro imagem: {img_err}")
                        continue

        generated_file = gen.generate_pdf()
        
        if generated_file:
            print(f"PDF Gerado com sucesso: {generated_file}")
            return jsonify({"pdf_url": f"/download/{os.path.basename(generated_file)}"})
        
        return jsonify({"message": "O compilador pdflatex falhou. Verifique se ele está no PATH."}), 500

    except Exception as e:
        print("--- ERRO NO PROCESSAMENTO ---")
        traceback.print_exc() # Mostra o erro exato no terminal do VS Code
        return jsonify({"message": str(e)}), 500

@app.route('/download/<filename>')
def download(filename):
    return send_from_directory(os.path.abspath(OUTPUT_FOLDER), filename, as_attachment=True)

if __name__ == '__main__':
    print("Iniciando LatexAWS em http://192.168.0.165:8080")
    app.run(host='0.0.0.0', port=8080, debug=True)