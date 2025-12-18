import os
from pylatex import Document, Package, NoEscape

class LatexGenerator:
    def __init__(self, filename="output_document"):
        self.filename = filename
        # Setup da página A4 sem numeração para design profissional
        self.doc = Document(default_filepath=filename, page_numbers=False)
        self._setup_packages()

    def _setup_packages(self):
        # textpos: Coordenadas absolutas (x, y) no papel
        self.doc.packages.append(Package('textpos', options=['absolute', 'overlay']))
        self.doc.packages.append(Package('graphicx'))
        
        # Fontes do sistema
        self.doc.packages.append(Package('helvet'))   # Sans-serif
        self.doc.packages.append(Package('courier'))  # Monospace
        
        # Define a grade: 1 unidade = 1mm (A4 tem 210mm x 297mm)
        self.doc.append(NoEscape(r'\TPGrid{210}{297}'))

    def _get_font_command(self, font_name):
        mapping = {
            'serif': r'\rmfamily',
            'sans-serif': r'\sffamily',
            'monospace': r'\ttfamily'
        }
        return mapping.get(font_name, r'\rmfamily')

    def add_text_box(self, content, x, y, width, height, font='serif'):
        font_cmd = self._get_font_command(font)
        # textblock{largura}(x, y)
        with self.doc.create(self.doc.environment('textblock', arguments=[width, (x, y)])):
            self.doc.append(NoEscape(f'{font_cmd}'))
            # minipage força o conteúdo a respeitar a largura definida no canvas
            with self.doc.create(self.doc.environment('minipage', arguments=[NoEscape(f'{width}mm')])):
                self.doc.append(content)

    def add_image(self, image_path, x, y, width, height):
        path = image_path.replace('\\', '/')
        with self.doc.create(self.doc.environment('textblock', arguments=[width, (x, y)])):
            # keepaspectratio=false: Garante que a imagem estique/achate conforme o JS mandou
            self.doc.append(NoEscape(
                fr'\includegraphics[width={width}mm, height={height}mm, keepaspectratio=false]{{{path}}}'
            ))

    def generate_pdf(self):
        try:
            # Gera o PDF e limpa os arquivos auxiliares (.aux, .log)
            self.doc.generate_pdf(self.filename, clean_tex=True, compiler='pdflatex')
            return f"{self.filename}.pdf"
        except Exception as e:
            print(f"Erro LaTeX: {e}")
            return None