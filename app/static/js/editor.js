let selectedElement = null;
let isShiftPressed = false;

window.addEventListener('keydown', (e) => { if (e.key === 'Shift') isShiftPressed = true; });
window.addEventListener('keyup', (e) => { if (e.key === 'Shift') isShiftPressed = false; });

const trashIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/></svg>`;

function addNewPage() {
    const container = document.getElementById('pages-container');
    const wrapper = document.createElement('div');
    wrapper.className = 'page-wrapper';
    wrapper.innerHTML = `<button class="delete-page-btn" onclick="this.parentElement.remove()">Delete Page</button><div class="canvas-white"></div>`;
    container.appendChild(wrapper);
}

function makeElementInteractive(el, isImage = false) {
    const resizer = el.querySelector('.resizer');
    const delBtn = el.querySelector('.delete-btn');

    el.addEventListener('mousedown', function(e) {
        if (selectedElement) selectedElement.classList.remove('selected');
        selectedElement = el;
        el.classList.add('selected');
        
        if (e.target.closest('.resizer') || e.target.closest('.delete-btn') || e.target.tagName === 'TD') return;
        
        let rect = el.getBoundingClientRect();
        let sX = e.clientX - rect.left, sY = e.clientY - rect.top;
        
        function move(e) {
            let c = el.closest('.canvas-white').getBoundingClientRect();
            el.style.left = (e.pageX - c.left - sX) + 'px';
            el.style.top = (e.pageY - c.top - sY) + 'px';
        }
        
        document.addEventListener('mousemove', move);
        document.onmouseup = () => document.removeEventListener('mousemove', move);
    });

    resizer.addEventListener('mousedown', (e) => {
        e.stopPropagation(); e.preventDefault();
        const sW = el.offsetWidth, sH = el.offsetHeight, sX = e.clientX, sY = e.clientY, r = sW/sH;
        function resize(e) {
            let w = sW + (e.clientX - sX), h = sH + (e.clientY - sY);
            if (isImage && isShiftPressed) h = w / r;
            el.style.width = Math.max(30, w) + 'px';
            el.style.height = Math.max(30, h) + 'px';
        }
        document.addEventListener('mousemove', resize);
        document.onmouseup = () => document.removeEventListener('mousemove', resize);
    });

    delBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation(); e.preventDefault();
        el.remove();
        selectedElement = null;
    });
}

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
    const c = document.createElement('div');
    c.className = 'text-content'; c.contentEditable = true;
    c.innerText = 'Type here...'; box.prepend(c);
    const canvases = document.querySelectorAll('.canvas-white');
    canvases[canvases.length - 1].appendChild(box);
    makeElementInteractive(box);
}

function addTable() {
    const box = createBase('table-element');
    box.style.width = '300px'; box.style.height = '80px';
    let h = '<table>';
    const rows = document.getElementById('tableRows').value;
    const cols = document.getElementById('tableCols').value;
    for(let r=0; r<rows; r++) {
        h += '<tr>'; 
        for(let c=0; c<cols; c++) h += '<td contenteditable="true"></td>';
        h += '</tr>';
    }
    box.insertAdjacentHTML('afterbegin', h + '</table>');
    const canvases = document.querySelectorAll('.canvas-white');
    canvases[canvases.length - 1].appendChild(box);
    makeElementInteractive(box);
}

function handleImage(e) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        const box = createBase('image-box');
        const img = document.createElement('img');
        img.src = ev.target.result;
        img.onload = () => { box.style.width = '200px'; box.style.height = (200 * (img.naturalHeight / img.naturalWidth)) + 'px'; };
        box.prepend(img);
        const canvases = document.querySelectorAll('.canvas-white');
        canvases[canvases.length - 1].appendChild(box);
        makeElementInteractive(box, true);
    };
    reader.readAsDataURL(e.target.files[0]);
}

async function generatePDF() {
    const btn = document.getElementById('generateBtn');
    const btnText = document.getElementById('btnText');
    btn.disabled = true;
    btnText.innerText = "PROCESSING...";

    const pxToMm = (px) => Math.round(parseFloat(px || 0) / 3.78);
    const pages = [];
    
    document.querySelectorAll('.canvas-white').forEach(canvas => {
        const elements = [];
        canvas.querySelectorAll('.element').forEach(el => {
            let type = 'text', content = '';
            if (el.classList.contains('text-box')) content = el.querySelector('.text-content').innerText;
            else if (el.classList.contains('image-box')) { type = 'image'; content = el.querySelector('img').src; }
            else if (el.classList.contains('table-element')) {
                type = 'table';
                content = Array.from(el.querySelectorAll('tr')).map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.innerText));
            }
            elements.push({ 
                type, content, 
                x: pxToMm(el.style.left), y: pxToMm(el.style.top), 
                w: pxToMm(el.style.width), h: pxToMm(el.style.height) 
            });
        });
        pages.push({ elements });
    });

    try {
        const r = await fetch('/generate', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ pages }) 
        });
        const res = await r.json();
        
        if (res.pdf_url) {
            setTimeout(() => {
                const a = document.createElement('a');
                a.href = res.pdf_url;
                a.download = "";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                btnText.innerText = "DOWNLOAD PDF";
                btn.disabled = false;
            }, 1000);
        } else {
            alert("Error: " + res.message);
            btn.disabled = false;
            btnText.innerText = "DOWNLOAD PDF";
        }
    } catch (err) {
        alert("Server connection error.");
        btn.disabled = false;
        btnText.innerText = "DOWNLOAD PDF";
    }
}

window.onload = addNewPage;
function triggerImageUpload() { document.getElementById('imageInput').click(); }