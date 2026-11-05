let photoCount = 0;
let captureInterval;
let firstCaptureTimeout;
let stream = null;
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const videoContainer = document.getElementById('video-container');
const videoPreview = document.getElementById('video-preview');
const gallery = document.getElementById('gallery');

// Función para guardar la foto en el servidor
async function guardarFoto(blob) {
    const formData = new FormData();
    formData.append('foto', blob, `foto-${Date.now()}.jpg`);

    try {
        const response = await fetch('/guardar-foto', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        console.log('Foto guardada:', data);
        
        // Mostrar el texto extraído si existe
        if (data.textoExtraido && data.textoExtraido.trim() !== '') {
            mostrarEstado('Texto extraído y guardado');
            console.log('Texto extraído:', data.textoExtraido);
        }
        
        return data;
    } catch (error) {
        console.error('Error al guardar la foto:', error);
        return { error: 'Error al guardar la foto' };
    }
}

// Función para mostrar notificaciones
function mostrarEstado(mensaje, esError = false) {
    const status = document.getElementById('status');
    status.textContent = mensaje;
    status.style.color = esError ? '#ff6b6b' : 'white';
    status.style.display = 'block';
    status.style.animation = 'none';
    status.offsetHeight; // Trigger reflow
    status.style.animation = 'fadeIn 0.3s';
    
    setTimeout(() => {
        status.style.animation = 'fadeOut 0.5s forwards';
    }, 2500);
}

// Función para detener la cámara
function detenerCamara() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    if (captureInterval) {
        clearInterval(captureInterval);
        captureInterval = null;
    }
    if (firstCaptureTimeout) {
        clearTimeout(firstCaptureTimeout);
        firstCaptureTimeout = null;
    }
    videoPreview.srcObject = null;
    
    videoContainer.style.display = 'none';
    startButton.style.display = 'block';
    stopButton.style.display = 'none';
    mostrarEstado('Cámara detenida');
}

// Mensaje legible según el tipo de error de cámara
function mensajeErrorCamara(err) {
    switch (err && err.name) {
        case 'NotAllowedError':
        case 'SecurityError':
            return 'Permiso de cámara denegado. Habilítalo en el navegador y recarga.';
        case 'NotFoundError':
        case 'DevicesNotFoundError':
            return 'No se encontró ninguna cámara en el dispositivo.';
        case 'NotReadableError':
        case 'TrackStartError':
            return 'La cámara está siendo usada por otra aplicación.';
        case 'OverconstrainedError':
        case 'ConstraintNotSatisfiedError':
            return 'La cámara no admite la configuración solicitada.';
        default:
            return (err && err.message) || 'Error desconocido';
    }
}

// Espera a que el video tenga dimensiones reales antes de capturar
function esperarVideoListo(video, timeoutMs = 8000) {
    if (video.videoWidth > 0) return Promise.resolve();

    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            cleanup();
            reject(new Error('La cámara no entregó imagen'));
        }, timeoutMs);

        function onReady() {
            if (video.videoWidth > 0) {
                cleanup();
                resolve();
            }
        }

        function cleanup() {
            clearTimeout(timer);
            video.removeEventListener('loadedmetadata', onReady);
            video.removeEventListener('playing', onReady);
            video.removeEventListener('resize', onReady);
        }

        video.addEventListener('loadedmetadata', onReady);
        video.addEventListener('playing', onReady);
        video.addEventListener('resize', onReady);
    });
}

// Función para rotar imagen 90 grados a la izquierda
function rotateImageLeft(canvas) {
    const rotatedCanvas = document.createElement('canvas');
    const ctx = rotatedCanvas.getContext('2d');
    
    // Intercambiamos el ancho y alto para la rotación
    rotatedCanvas.width = canvas.height;
    rotatedCanvas.height = canvas.width;
    
    // Aplicamos la rotación
    ctx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    
    return rotatedCanvas;
}

// Función para capturar foto
async function capturePhoto() {
    // Sin dimensiones válidas el canvas sería 0x0 y el servidor rechazaría la foto
    if (!videoPreview.videoWidth || !videoPreview.videoHeight) {
        console.warn('Video sin dimensiones todavía, se omite la captura');
        return;
    }

    // Crear canvas para la captura original
    const originalCanvas = document.createElement('canvas');
    originalCanvas.width = videoPreview.videoWidth;
    originalCanvas.height = videoPreview.videoHeight;
    const originalCtx = originalCanvas.getContext('2d');
    originalCtx.drawImage(videoPreview, 0, 0, originalCanvas.width, originalCanvas.height);
    
    // Rotar la imagen 90 grados a la izquierda
    const rotatedCanvas = rotateImageLeft(originalCanvas);
    
    // Crear elemento de imagen para la galería
    const img = document.createElement('img');
    img.src = rotatedCanvas.toDataURL('image/jpeg');
    img.style.width = '120px';
    img.style.height = '160px';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '8px';
    img.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    gallery.insertBefore(img, gallery.firstChild);
    
    // Actualizar contador
    photoCount++;
    document.getElementById('photoCount').textContent = photoCount;
    
    // Guardar la foto en el servidor
    try {
        const blob = await new Promise(resolve => {
            rotatedCanvas.toBlob(resolve, 'image/jpeg', 0.9);
        });
        if (!blob) throw new Error('No se pudo generar la imagen');

        const resultado = await guardarFoto(blob);
        if (resultado.error) {
            mostrarEstado('Error al guardar', true);
        } else {
            mostrarEstado('Foto guardada y rotada');
        }
    } catch (error) {
        console.error('Error al guardar la foto:', error);
        mostrarEstado('Error al guardar', true);
    }
}

// Iniciar cámara
async function startCamera() {
    // getUserMedia solo existe en contextos seguros (HTTPS o localhost)
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        console.error('Contexto no seguro: la cámara requiere HTTPS o localhost');
        mostrarEstado('La cámara requiere HTTPS o localhost. Abre la dirección https:// del servidor.', true);
        return;
    }

    try {
        const resolucion = {
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        };

        let mediaStream;
        try {
            // Solicitar acceso a la cámara trasera (ideal: no falla si no existe una exacta)
            mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' }, ...resolucion },
                audio: false
            });
        } catch (err) {
            if (err && err.name === 'OverconstrainedError') {
                mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: resolucion,
                    audio: false
                });
            } else {
                throw err;
            }
        }

        stream = mediaStream;
        
        // Configurar el elemento de video
        videoPreview.srcObject = stream;
        videoContainer.style.display = 'block';
        startButton.style.display = 'none';
        stopButton.style.display = 'block';
        
        await videoPreview.play().catch(() => {});
        await esperarVideoListo(videoPreview);
        
        // Iniciar captura automática cada 8 segundos
        captureInterval = setInterval(capturePhoto, 8000);
        
        // Tomar primera foto después de 1 segundo
        firstCaptureTimeout = setTimeout(capturePhoto, 1000);
        
        mostrarEstado('Cámara iniciada');
        
    } catch (err) {
        console.error('Error al acceder a la cámara:', err);
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        videoPreview.srcObject = null;
        if (captureInterval) {
            clearInterval(captureInterval);
            captureInterval = null;
        }
        if (firstCaptureTimeout) {
            clearTimeout(firstCaptureTimeout);
            firstCaptureTimeout = null;
        }
        videoContainer.style.display = 'none';
        startButton.style.display = 'block';
        stopButton.style.display = 'none';
        mostrarEstado('Error al acceder a la cámara: ' + mensajeErrorCamara(err), true);
    }
}

// Event Listeners
startButton.addEventListener('click', startCamera);
stopButton.addEventListener('click', detenerCamara);

// Detener la cámara cuando se cierre la pestaña
window.addEventListener('beforeunload', () => {
    detenerCamara();
});

// Añadir animación de fadeOut
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-10px); }
    }
`;
document.head.appendChild(style);