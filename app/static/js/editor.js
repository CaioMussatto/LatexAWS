const canvas = document.getElementById('canvas');
let selectedElement = null;
let isShiftPressed = false;

// Monitorar tecla Shift
window.addEventListener('keydown', (e) => { if (e.key === 'Shift') isShiftPressed = true; });
window.addEventListener('keyup', (e) => { if (e.key === 'Shift') isShiftPressed = false; });

const trashIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
  <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
</svg>`;

function selectElement(el) {
    if (selectedElement) selectedElement.classList.remove('selected');
    selectedElement = el;
    selectedElement.classList.add('selected');
}

canvas.addEventListener('mousedown', (e) => {
    if (e.target === canvas) {
        if (selectedElement) selectedElement.classList.remove('selected');
        selectedElement = null;
    }
});

function makeElementInteractive(el, isImage = false) {
    // 1. Dragging
    el.addEventListener('mousedown', function(e) {
        if (e.target.closest('.resizer') || e.target.closest('.delete-btn')) return;
        selectElement(el);
        let shiftX = e.clientX - el.getBoundingClientRect().left;
        let shiftY = e.clientY - el.getBoundingClientRect().top;

        function moveAt(pageX, pageY) {
            let rect = canvas.getBoundingClientRect();
            el.style.left = (pageX - rect.left - shiftX) + 'px';
            el.style.top = (pageY - rect.top - shiftY) + 'px';
        }
        function onMouseMove(e) { moveAt(e.pageX, e.pageY); }
        document.addEventListener('mousemove', onMouseMove);
        document.onmouseup = () => { document.removeEventListener('mousemove', onMouseMove); };
    });

    // 2. Resizing com Shift Lock
    const resizer = el.querySelector('.resizer');
    resizer.addEventListener('mousedown', function(e) {
        e.stopPropagation();
        e.preventDefault();
        const startWidth = el.offsetWidth;
        const startHeight = el.offsetHeight;
        const startX = e.clientX;
        const startY = e.clientY;
        const aspectRatio = startWidth / startHeight;

        function resize(e) {
            let newWidth = startWidth + (e.clientX - startX);
            let newHeight = startHeight + (e.clientY - startY);

            // Lógica do Shift: Mantém proporção se pressionado
            if (isImage && isShiftPressed) {
                newHeight = newWidth / aspectRatio;
            }

            el.style.width = newWidth + 'px';
            el.style.height = newHeight + 'px';
        }
        function stopResize() {
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
        }
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
    });

    // 3. Delete
    el.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        el.remove();
        selectedElement = null;
    });
}

function addTextBox() {
    const font = document.getElementById('fontSelector').value;
    const box = document.createElement('div');
    box.className = 'element text-box';
    box.dataset.font = font;
    box.style.left = '50px'; box.style.top = '50px';
    box.style.width = '200px'; box.style.height = '60px';
    const content = document.createElement('div');
    content.className = 'text-content';
    content.contentEditable = true;
    content.innerText = 'Novo texto...';
    const resizer = document.createElement('div');
    resizer.className = 'resizer';
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = trashIcon;
    box.append(content, resizer, deleteBtn);
    canvas.appendChild(box);
    makeElementInteractive(box, false);
    selectElement(box);
}

function handleImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        const box = document.createElement('div');
        box.className = 'element image-box';
        box.style.left = '100px'; box.style.top = '100px';
        box.style.width = '200px';
        const img = document.createElement('img');
        img.src = event.target.result;
        img.onload = () => {
            box.style.height = (box.offsetWidth * (img.naturalHeight / img.naturalWidth)) + 'px';
        };
        const resizer = document.createElement('div');
        resizer.className = 'resizer';
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = trashIcon;
        box.append(img, resizer, deleteBtn);
        canvas.appendChild(box);
        makeElementInteractive(box, true);
        selectElement(box);
    };
    reader.readAsDataURL(file);
}

function triggerImageUpload() { document.getElementById('imageInput').click(); }

async function generatePDF() {
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');
    btnText.innerText = "GENERATING...";
    btnLoader.classList.remove('d-none');

    const elements = [];
    const pxToMm = (px) => Math.round(parseFloat(px || 0) / 3.78);

    document.querySelectorAll('.element').forEach(el => {
        const isText = el.classList.contains('text-box');
        elements.push({
            type: isText ? 'text' : 'image',
            content: isText ? el.querySelector('.text-content').innerText : el.querySelector('img').src,
            font: el.dataset.font || 'serif',
            x: pxToMm(el.style.left),
            y: pxToMm(el.style.top),
            width: pxToMm(el.style.width),
            height: pxToMm(el.style.height)
        });
    });

    try {
        const response = await fetch('/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ elements })
        });
        const result = await response.json();
        
        if (result.pdf_url) {
            // Lógica de Download Automático
            const link = document.createElement('a');
            link.href = result.pdf_url;
            link.download = 'meu_documento_caio.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (err) {
        alert("Erro ao baixar PDF!");
    } finally {
        btnText.innerText = "GENERATE PDF";
        btnLoader.classList.add('d-none');
    }
}