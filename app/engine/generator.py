import os
import subprocess
from pylatex import Document, Package, NoEscape, NewPage

class LatexGenerator:
    def __init__(self, full_path_no_ext):
        self.filename = full_path_no_ext
        self.doc = Document(default_filepath=self.filename, page_numbers=False, geometry_options={"margin": "0in"})
        self._setup_packages()

    def _setup_packages(self):
        self.doc.packages.append(Package('textpos', options=['absolute', 'overlay']))
        self.doc.packages.append(Package('graphicx'))
        self.doc.packages.append(Package('tabularx'))
        self.doc.packages.append(Package('helvet'))   
        self.doc.append(NoEscape(r'\TPGrid{210}{297}'))
        self.doc.append(NoEscape(r'\renewcommand{\familydefault}{\sfdefault}'))
        self.doc.append(NoEscape(r'~')) 

    def clean_text(self, text):
        if not text: return ""
        replacements = {'&': r'\&', '%': r'\%', '$': r'\$', '#': r'\#', '_': r'\_', '{': r'\{', '}': r'\}'}
        text = str(text)
        for char, replacement in replacements.items():
            text = text.replace(char, replacement)
        return text

    def add_new_pdf_page(self):
        self.doc.append(NewPage())
        self.doc.append(NoEscape(r'~'))

    def add_text_box(self, content, x, y, width, height):
        safe_content = self.clean_text(content)
        # SINTAXE MANUAL: Evita o erro de __init__ do Environment
        self.doc.append(NoEscape(fr'\begin{{textblock}}{{{width}}}({x},{y})'))
        self.doc.append(NoEscape(safe_content))
        self.doc.append(NoEscape(r'\end{textblock}'))

    def add_image(self, image_path, x, y, width, height):
        image_path = image_path.replace('\\', '/')
        if os.path.exists(image_path):
            self.doc.append(NoEscape(fr'\begin{{textblock}}{{{width}}}({x},{y})'))
            self.doc.append(NoEscape(
                fr'\includegraphics[width={width}mm, height={height}mm, keepaspectratio=false]{{{image_path}}}'
            ))
            self.doc.append(NoEscape(r'\end{textblock}'))

    def add_table(self, data, x, y, width, height):
        if not data or not data[0]: return
        col_format = "|" + "X|" * len(data[0])
        self.doc.append(NoEscape(fr'\begin{{textblock}}{{{width}}}({x},{y})'))
        self.doc.append(NoEscape(fr'\begin{{tabularx}}{{{width}mm}}{{{col_format}}}'))
        self.doc.append(NoEscape(r'\hline'))
        for row in data:
            clean_row = [self.clean_text(cell) for cell in row]
            self.doc.append(NoEscape(" & ".join(clean_row) + r" \\ \hline"))
        self.doc.append(NoEscape(r'\end{tabularx}'))
        self.doc.append(NoEscape(r'\end{textblock}'))

    def generate_pdf(self):
        try:
            self.doc.generate_tex(self.filename)
            output_dir = os.path.dirname(self.filename)
            tex_file = self.filename + '.tex'
            
            subprocess.run(
                ['pdflatex', '-interaction=nonstopmode', '-output-directory', output_dir, tex_file],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False
            )

            pdf_path = self.filename + ".pdf"
            return pdf_path if os.path.exists(pdf_path) else None
        except Exception as e:
            print(f"Erro no compilador: {e}")
            return None