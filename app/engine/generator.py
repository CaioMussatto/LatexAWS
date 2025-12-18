import os
from pylatex import Document, Package, NoEscape

class LatexGenerator:
    def __init__(self, filename="output_document"):
        self.filename = filename
        # Página A4 limpa e vertical
        self.doc = Document(default_filepath=filename, page_numbers=False)
        self._setup_packages()

    def _setup_packages(self):
        # textpos para coordenadas (X, Y) exatas
        self.doc.packages.append(Package('textpos', options=['absolute', 'overlay']))
        self.doc.packages.append(Package('graphicx'))
        
        # Fontes
        self.doc.packages.append(Package('helvet'))   # Sans-serif
        self.doc.packages.append(Package('courier'))  # Monospace
        
        # Grid de 1mm (A4: 210x297)
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
        with self.doc.create(self.doc.environment('textblock', arguments=[width, (x, y)])):
            self.doc.append(NoEscape(f'{font_cmd}'))
            with self.doc.create(self.doc.environment('minipage', arguments=[NoEscape(f'{width}mm')])):
                self.doc.append(content)

    def add_image(self, image_path, x, y, width, height):
        path = image_path.replace('\\', '/')
        with self.doc.create(self.doc.environment('textblock', arguments=[width, (x, y)])):
            # keepaspectratio=false permite que o LaTeX siga a distorção manual se o Shift não for usado
            self.doc.append(NoEscape(
                fr'\includegraphics[width={width}mm, height={height}mm, keepaspectratio=false]{{{path}}}'
            ))

    def generate_pdf(self):
        try:
            self.doc.generate_pdf(self.filename, clean_tex=True, compiler='pdflatex')
            return f"{self.filename}.pdf"
        except Exception as e:
            print(f"Erro no motor LaTeX: {e}")
            return None