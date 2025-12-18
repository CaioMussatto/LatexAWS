const canvas = document.getElementById('canvas');
let selectedElement = null;

// Ícone SVG de lixo (Bootstrap oficial)
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

function makeElementInteractive(el) {
    // 1. Arrastar Elemento (Movimentação)
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
        document.onmouseup = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.onmouseup = null;
        };
    });

    // 2. Redimensionar LIVRE (X e Y para Imagem e Texto)
    const resizer = el.querySelector('.resizer');
    resizer.addEventListener('mousedown', function(e) {
        e.stopPropagation();
        e.preventDefault();
        
        const startWidth = el.offsetWidth;
        const startHeight = el.offsetHeight;
        const startX = e.clientX;
        const startY = e.clientY;

        function resize(e) {
            // Aqui calculamos a nova largura e altura baseada puramente no mouse
            let newWidth = startWidth + (e.clientX - startX);
            let newHeight = startHeight + (e.clientY - startY);

            // Aplica as dimensões sem travas de proporção
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

    // 3. Deletar
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
    box.style.width = '200px'; box.style.height = '80px';

    const content = document.createElement('div');
    content.className = 'text-content';
    content.contentEditable = true;
    content.innerText = 'Edite seu texto...';

    const resizer = document.createElement('div');
    resizer.className = 'resizer';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = trashIcon;

    box.append(content, resizer, deleteBtn);
    canvas.appendChild(box);
    makeElementInteractive(box);
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
        box.style.height = '200px'; // Altura inicial quadrada, agora livre
        
        const img = document.createElement('img');
        img.src = event.target.result;
        img.style.width = '100%';
        img.style.height = '100%';
        
        const resizer = document.createElement('div');
        resizer.className = 'resizer';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = trashIcon;

        box.append(img, resizer, deleteBtn);
        canvas.appendChild(box);
        makeElementInteractive(box);
        selectElement(box);
    };
    reader.readAsDataURL(file);
}

function triggerImageUpload() { document.getElementById('imageInput').click(); }

async function generatePDF() {
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

    const response = await fetch('/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elements })
    });

    const result = await response.json();
    if (result.pdf_url) window.location.href = result.pdf_url;
}