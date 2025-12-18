import os
import uuid
import base64
import traceback
import time
from flask import Flask, render_template, request, jsonify, send_file, after_this_request
from app.engine.generator import LatexGenerator

app = Flask(__name__)

# Configuração de caminhos absolutos
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FOLDER = os.path.join(BASE_DIR, 'output')
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'temp_uploads')

# Garante que as pastas existam
os.makedirs(OUTPUT_FOLDER, exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
print(f"Pastas prontas em: {BASE_DIR}")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate():
    print("Iniciando geração de PDF...")
    try:
        data = request.json
        if not data: return jsonify({"message": "Dados inválidos"}), 400
        
        job_id = str(uuid.uuid4())
        pdf_base_path = os.path.join(OUTPUT_FOLDER, f"caio_design_{job_id}")
        
        gen = LatexGenerator(pdf_base_path)

        for i, page in enumerate(data.get('pages', [])):
            if i > 0: gen.add_new_pdf_page()
            
            for el in page.get('elements', []):
                # Conversão segura para números
                x, y = float(el.get('x', 0)), float(el.get('y', 0))
                w, h = float(el.get('w', 20)), float(el.get('h', 10))
                
                if el['type'] == 'text':
                    gen.add_text_box(el['content'], x, y, w, h)
                elif el['type'] == 'table':
                    gen.add_table(el['content'], x, y, w, h)
                elif el['type'] == 'image':
                    try:
                        header, encoded = el['content'].split(",", 1)
                        img_path = os.path.join(UPLOAD_FOLDER, f"img_{uuid.uuid4().hex}.png")
                        with open(img_path, "wb") as f:
                            f.write(base64.b64decode(encoded))
                        gen.add_image(img_path, x, y, w, h)
                    except: continue

        generated_file = gen.generate_pdf()
        
        if generated_file and os.path.exists(generated_file):
            print(f"PDF gerado: {generated_file}")
            return jsonify({"pdf_url": f"/download/{os.path.basename(generated_file)}"})
        
        return jsonify({"message": "Erro ao gerar PDF"}), 500

    except Exception as e:
        print("!!! ERRO NO SERVIDOR !!!")
        traceback.print_exc()
        return jsonify({"message": str(e)}), 500

@app.route('/download/<filename>')
def download(filename):
    file_path = os.path.join(OUTPUT_FOLDER, filename)
    
    # Espera o arquivo ser liberado pelo sistema
    for _ in range(5):
        if os.path.exists(file_path): break
        time.sleep(0.5)

    if os.path.exists(file_path):
        @after_this_request
        def remove_file(response):
            try:
                # Remove o PDF e os arquivos auxiliares do LaTeX
                os.remove(file_path)
                for ext in ['.tex', '.log', '.aux']:
                    aux_file = file_path.replace('.pdf', ext)
                    if os.path.exists(aux_file): os.remove(aux_file)
            except: pass
            return response
        return send_file(file_path, as_attachment=True)
    
    return "Arquivo não encontrado", 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)