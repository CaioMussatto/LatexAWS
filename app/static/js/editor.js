let selectedElement = null;
let isShiftPressed = false;

// Monitor de teclado para o Shift (proporção de imagem)
window.addEventListener('keydown', (e) => { if (e.key === 'Shift') isShiftPressed = true; });
window.addEventListener('keyup', (e) => { if (e.key === 'Shift') isShiftPressed = false; });

const trashIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/></svg>`;

// --- GESTÃO DE PÁGINAS ---
function addNewPage() {
    const container = document.getElementById('pages-container');
    const wrapper = document.createElement('div');
    wrapper.className = 'page-wrapper';
    wrapper.innerHTML = `
        <button class="delete-page-btn" onclick="this.parentElement.remove()">Excluir Página</button>
        <div class="canvas-white"></div>
    `;
    container.appendChild(wrapper);
}

function getActiveCanvas() {
    const canvases = document.querySelectorAll('.canvas-white');
    return canvases[canvases.length - 1];
}

// --- INTERATIVIDADE ---
function makeElementInteractive(el, isImage = false) {
    const resizer = el.querySelector('.resizer');
    const delBtn = el.querySelector('.delete-btn');

    // Clique para selecionar e manter a lixeira visível
    el.addEventListener('mousedown', function(e) {
        if (selectedElement) selectedElement.classList.remove('selected');
        selectedElement = el;
        el.classList.add('selected');

        // Lógica de Arrastar
        if (e.target.closest('.resizer') || e.target.closest('.delete-btn') || e.target.tagName === 'TD') return;
        
        let rect = el.getBoundingClientRect();
        let shiftX = e.clientX - rect.left;
        let shiftY = e.clientY - rect.top;

        function moveAt(pageX, pageY) {
            let canvas = el.closest('.canvas-white');
            let cRect = canvas.getBoundingClientRect();
            el.style.left = (pageX - cRect.left - shiftX) + 'px';
            el.style.top = (pageY - cRect.top - shiftY) + 'px';
        }

        function onMouseMove(e) { moveAt(e.pageX, e.pageY); }
        document.addEventListener('mousemove', onMouseMove);
        document.onmouseup = () => document.removeEventListener('mousemove', onMouseMove);
    });

    // Redimensionamento
    resizer.addEventListener('mousedown', function(e) {
        e.stopPropagation();
        e.preventDefault();
        const startW = el.offsetWidth;
        const startH = el.offsetHeight;
        const startX = e.clientX;
        const startY = e.clientY;
        const ratio = startW / startH;

        function resize(e) {
            let w = startW + (e.clientX - startX);
            let h = startH + (e.clientY - startY);
            if (isImage && isShiftPressed) h = w / ratio;
            el.style.width = Math.max(30, w) + 'px';
            el.style.height = Math.max(30, h) + 'px';
        }
        function stop() { 
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stop);
        }
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stop);
    });

    // DELETAR ELEMENTO
    delBtn.addEventListener('mousedown', function(e) {
        e.stopPropagation(); // Impede o 'mousedown' do elemento de rodar
        el.remove();
        selectedElement = null;
    });
}

// --- FÁBRICA DE ELEMENTOS ---
function createBase(type) {
    const el = document.createElement('div');
    el.className = `element ${type}`;
    el.style.left = '50px'; el.style.top = '50px';
    el.innerHTML = `<div class="resizer"></div><button class="delete-btn">${trashIcon}</button>`;
    return el;
}

function addTextBox() {
    const box = createBase('text-box');
    box.style.width = '200px'; box.style.height = '60px';
    const content = document.createElement('div');
    content.className = 'text-content';
    content.contentEditable = true;
    content.style.fontFamily = document.getElementById('fontSelector').value;
    content.innerText = 'Texto aqui...';
    box.prepend(content);
    getActiveCanvas().appendChild(box);
    makeElementInteractive(box, false);
}

function addTable() {
    const cols = document.getElementById('tableCols').value;
    const rows = document.getElementById('tableRows').value;
    const box = createBase('table-element');
    box.style.width = '300px'; box.style.height = '80px';
    let html = '<table>';
    for(let r=0; r<rows; r++) {
        html += '<tr>';
        for(let c=0; c<cols; c++) html += '<td contenteditable="true"></td>';
        html += '</tr>';
    }
    html += '</table>';
    box.insertAdjacentHTML('afterbegin', html);
    getActiveCanvas().appendChild(box);
    makeElementInteractive(box, false);
}

function handleImage(e) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        const box = createBase('image-box');
        const img = document.createElement('img');
        img.src = ev.target.result;
        img.onload = () => {
            box.style.width = '200px';
            box.style.height = (200 * (img.naturalHeight / img.naturalWidth)) + 'px';
        };
        box.prepend(img);
        getActiveCanvas().appendChild(box);
        makeElementInteractive(box, true);
    };
    reader.readAsDataURL(e.target.files[0]);
}

function triggerImageUpload() { document.getElementById('imageInput').click(); }

// --- LOGICA DE DOWNLOAD ---
async function generatePDF() {
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');
    btnText.innerText = "GERANDO...";
    btnLoader.classList.remove('d-none');

    const pxToMm = (px) => Math.round(parseFloat(px || 0) / 3.78);
    const pagesData = [];

    document.querySelectorAll('.canvas-white').forEach(canvas => {
        const elements = [];
        canvas.querySelectorAll('.element').forEach(el => {
            let type = 'text', content = '';
            if (el.classList.contains('text-box')) {
                content = el.querySelector('.text-content').innerText;
            } else if (el.classList.contains('image-box')) {
                type = 'image'; content = el.querySelector('img').src;
            } else if (el.classList.contains('table-element')) {
                type = 'table';
                content = Array.from(el.querySelectorAll('tr')).map(tr => 
                    Array.from(tr.querySelectorAll('td')).map(td => td.innerText)
                );
            }
            elements.push({
                type, content,
                x: pxToMm(el.style.left), y: pxToMm(el.style.top),
                w: pxToMm(el.style.width), h: pxToMm(el.style.height)
            });
        });
        pagesData.push({ elements });
    });

    try {
        const response = await fetch('/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pages: pagesData })
        });
        
        if (!response.ok) throw new Error("Erro no servidor");

        const result = await response.json();
        if (result.pdf_url) {
            window.location.href = result.pdf_url; // Dispara o download
        }
    } catch (err) {
        console.error(err);
        alert("Erro ao baixar. Verifique o console do VS Code.");
    } finally {
        btnText.innerText = "BAIXAR PDF";
        btnLoader.classList.add('d-none');
    }
}

window.onload = addNewPage;