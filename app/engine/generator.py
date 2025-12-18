import os
from pylatex import Document, Package, NoEscape

class LatexGenerator:
    def __init__(self, filename="output_document"):
        self.filename = filename
        self.doc = Document(default_filepath=filename, page_numbers=False)
        self._setup_packages()

    def _setup_packages(self):
        self.doc.packages.append(Package('textpos', options=['absolute', 'overlay']))
        self.doc.packages.append(Package('graphicx'))
        # Grid de 1mm (A4: 210mm x 297mm)
        self.doc.append(NoEscape(r'\TPGrid{210}{297}'))

    def add_text_box(self, content, x, y, width):
        with self.doc.create(self.doc.environment('textblock', arguments=[width, (x, y)])):
            self.doc.append(content)

    def add_image(self, image_path, x, y, width):
        # Escapa o caminho para evitar problemas com caracteres especiais do Windows/Linux
        path = image_path.replace('\\', '/')
        with self.doc.create(self.doc.environment('textblock', arguments=[width, (x, y)])):
            self.doc.append(NoEscape(fr'\includegraphics[width=\linewidth]{{{path}}}'))

    def generate_pdf(self):
        try:
            self.doc.generate_pdf(self.filename, clean_tex=True, compiler='pdflatex')
            return f"{self.filename}.pdf"
        except Exception as e:
            print(f"Erro no LaTeX: {e}")
            return None