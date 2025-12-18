import os
import uuid
import base64
from flask import Flask, render_template, request, jsonify, send_from_directory
from app.engine.generator import LatexGenerator

app = Flask(__name__)

# Configuração de caminhos
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
        elements = data.get('elements', [])
        
        job_id = str(uuid.uuid4())
        pdf_filename = f"caio_design_{job_id}"
        pdf_full_path = os.path.join(OUTPUT_FOLDER, pdf_filename)
        
        gen = LatexGenerator(pdf_full_path)

        for el in elements:
            x, y = el['x'], el['y']
            w, h = el['width'], el['height']
            
            if el['type'] == 'text':
                gen.add_text_box(el['content'], x, y, w, h, el.get('font', 'serif'))
            
            elif el['type'] == 'image':
                try:
                    header, encoded = el['content'].split(",", 1)
                    img_data = base64.b64decode(encoded)
                    img_name = f"img_{uuid.uuid4().hex}.png"
                    img_path = os.path.join(UPLOAD_FOLDER, img_name)
                    
                    with open(img_path, "wb") as f:
                        f.write(img_data)
                    
                    gen.add_image(img_path, x, y, w, h)
                except Exception as e:
                    print(f"Erro imagem: {e}")
                    continue

        generated_file = gen.generate_pdf()
        
        if generated_file:
            # Retorna a URL para o JS disparar o download
            return jsonify({
                "pdf_url": f"/download/{os.path.basename(generated_file)}"
            })
        
        return jsonify({"message": "Erro na compilação"}), 500

    except Exception as e:
        return jsonify({"message": str(e)}), 500

@app.route('/download/<filename>')
def download(filename):
    # as_attachment=True força o download no navegador
    return send_from_directory(
        os.path.abspath(OUTPUT_FOLDER), 
        filename, 
        as_attachment=True
    )

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)