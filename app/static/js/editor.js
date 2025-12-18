const canvas = document.getElementById('canvas');
let selectedElement = null;

function selectElement(el) {
    if (selectedElement) selectedElement.classList.remove('selected');
    selectedElement = el;
    selectedElement.classList.add('selected');
}

// Global Delete Listener
document.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElement) {
        if (document.activeElement !== selectedElement) {
            selectedElement.remove();
            selectedElement = null;
        }
    }
});

function makeElementInteractive(el) {
    el.addEventListener('mousedown', function(e) {
        if (e.target.classList.contains('resizer')) return;
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
        document.onmouseup = () => document.removeEventListener('mousemove', onMouseMove);
    });

    // Resizing Logic
    const resizer = el.querySelector('.resizer');
    resizer.addEventListener('mousedown', function(e) {
        e.stopPropagation();
        e.preventDefault();

        function resize(e) {
            let rect = el.getBoundingClientRect();
            el.style.width = (e.clientX - rect.left) + 'px';
            el.style.height = (e.clientY - rect.top) + 'px';
        }

        function stopResize() { document.removeEventListener('mousemove', resize); }
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
    });
}

function addTextBox() {
    const box = document.createElement('div');
    box.className = 'element text-box';
    box.contentEditable = true;
    box.innerHTML = 'New Text';
    box.style.left = '50px'; box.style.top = '50px';
    
    const resizer = document.createElement('div');
    resizer.className = 'resizer';
    box.appendChild(resizer);
    
    canvas.appendChild(box);
    makeElementInteractive(box);
}

function triggerImageUpload() { document.getElementById('imageInput').click(); }

function handleImage(e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = function(event) {
        const box = document.createElement('div');
        box.className = 'element image-box';
        box.style.width = '150px';
        box.style.left = '50px'; box.style.top = '50px';
        
        const img = document.createElement('img');
        img.src = event.target.result;
        
        const resizer = document.createElement('div');
        resizer.className = 'resizer';
        
        box.appendChild(img);
        box.appendChild(resizer);
        canvas.appendChild(box);
        makeElementInteractive(box);
    };
    reader.readAsDataURL(file);
}

async function generatePDF() {
    const elements = [];
    const pxToMm = (px) => Math.round(parseFloat(px || 0) / 3.78);

    document.querySelectorAll('.element').forEach(el => {
        const isText = el.classList.contains('text-box');
        elements.push({
            type: isText ? 'text' : 'image',
            content: isText ? el.innerText : 'image_placeholder', // To be updated with actual upload logic
            x: pxToMm(el.style.left),
            y: pxToMm(el.style.top),
            width: pxToMm(getComputedStyle(el).width)
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
