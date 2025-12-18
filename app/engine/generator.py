import os
from pylatex import Document, Package, NoEscape, NewPage
from pylatex.base_classes import Environment # Importação crucial para corrigir o erro

class LatexGenerator:
    def __init__(self, filename="output_document"):
        self.filename = filename
        self.doc = Document(default_filepath=filename, page_numbers=False)
        self._setup_packages()

    def _setup_packages(self):
        self.doc.packages.append(Package('textpos', options=['absolute', 'overlay']))
        self.doc.packages.append(Package('graphicx'))
        self.doc.packages.append(Package('tabularx'))
        self.doc.packages.append(Package('helvet'))   
        self.doc.append(NoEscape(r'\TPGrid{210}{297}'))

    def add_new_pdf_page(self):
        self.doc.append(NewPage())

    def add_text_box(self, content, x, y, width, height):
        # Correção: Usando a classe Environment para criar o bloco de texto
        with self.doc.create(Environment('textblock', arguments=[width, NoEscape(f"({x},{y})")])):
            with self.doc.create(Environment('minipage', arguments=[NoEscape(f"{width}mm")])):
                self.doc.append(content)

    def add_image(self, image_path, x, y, width, height):
        path = image_path.replace('\\', '/')
        with self.doc.create(Environment('textblock', arguments=[width, NoEscape(f"({x},{y})")])):
            self.doc.append(NoEscape(
                fr'\includegraphics[width={width}mm, height={height}mm, keepaspectratio=false]{{{path}}}'
            ))

    def add_table(self, data, x, y, width, height):
        if not data or not data[0]: return
        col_format = "|" + "X|" * len(data[0])
        with self.doc.create(Environment('textblock', arguments=[width, NoEscape(f"({x},{y})")])):
            with self.doc.create(Environment('tabularx', arguments=[NoEscape(f"{width}mm"), col_format])) as table:
                table.append(NoEscape(r'\hline'))
                for row in data:
                    # Limpa caracteres especiais do LaTeX que podem quebrar a tabela
                    clean_row = [str(cell).replace('&', r'\&').replace('%', r'\%') for cell in row]
                    table.append(NoEscape(" & ".join(clean_row) + r" \\ \hline"))

    def generate_pdf(self):
        try:
            self.doc.generate_pdf(self.filename, clean_tex=True, compiler='pdflatex')
            return f"{self.filename}.pdf"
        except Exception as e:
            print(f"Erro LaTeX: {e}")
            return None