//Servidor node js
const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const os = require('os');
// Cargar variables de entorno desde azure.env
require('dotenv').config({ path: path.join(__dirname, 'azure.env') });
// Azure Computer Vision (Visual OCR)
const { ComputerVisionClient } = require('@azure/cognitiveservices-computervision');
const { ApiKeyCredentials } = require('@azure/ms-rest-js');
// Initialize Azure Vision client (requires AZURE_VISION_ENDPOINT and AZURE_VISION_KEY env vars)
const AZURE_VISION_ENDPOINT = process.env.AZURE_VISION_ENDPOINT;
const AZURE_VISION_KEY = process.env.AZURE_VISION_KEY;
if (!AZURE_VISION_ENDPOINT || !AZURE_VISION_KEY) {
    console.warn('Advertencia: Debes configurar AZURE_VISION_ENDPOINT y AZURE_VISION_KEY en variables de entorno.');
}
const cvClient = new ComputerVisionClient(
    new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': AZURE_VISION_KEY || '' } }),
    AZURE_VISION_ENDPOINT || ''
);
const port = 3000;
// Utilidad para obtener la IP local sin depender de módulos externos
function getLocalIP() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name] || []) {
            if (net && net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

// Función para guardar texto extraído
async function saveExtractedText(text, imageName) {
    const textFilePath = path.join(__dirname, 'TextosExtraidos.txt');
    const timestamp = new Date().toLocaleString();
    const logEntry = `\n\n--- ${timestamp} - ${imageName} ---\n${text}\n`;
    
    try {
        await fs.appendFile(textFilePath, logEntry);
        console.log('Texto guardado en TextosExtraidos.txt');
    } catch (error) {
        console.error('Error al guardar el texto extraído:', error);
    }
}

// Configuración de multer para guardar archivos
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'Galeria');
        await fs.ensureDir(uploadDir); 
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'foto-' + uniqueSuffix + '.jpg');
    }
});

const upload = multer({ storage: storage });

// Middleware para servir archivos estáticos
app.use(express.static(__dirname));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta para guardar fotos y extraer texto
app.post('/guardar-foto', upload.single('foto'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ninguna foto' });
    }
    
    const imagePath = req.file.path;
    const imageName = path.basename(imagePath);
    
    try {
        // Extraer texto usando Azure Computer Vision Read API (OCR)
        // Pasar un Buffer (ArrayBufferView) para cumplir con ms-rest-js
        const imageBuffer = await fs.readFile(imagePath);
        // Indicar que el contenido está en inglés
        const readResponse = await cvClient.readInStream(imageBuffer, { language: 'en' });
        const operationLocation = readResponse.operationLocation;
        const operationId = operationLocation.substring(operationLocation.lastIndexOf('/') + 1);

        // Poll hasta completar
        let readResult;
        while (true) {
            readResult = await cvClient.getReadResult(operationId);
            const status = readResult.status;
            if (status === 'succeeded') break;
            if (status === 'failed') throw new Error('OCR falló en Azure Vision');
            await new Promise(r => setTimeout(r, 1000));
        }

        // Concatenar líneas detectadas
        let text = '';
        const pages = readResult.analyzeResult?.readResults || [];
        for (const page of pages) {
            for (const line of page.lines || []) {
                text += line.text + '\n';
            }
        }
        
        // Guardar el texto extraído
        if (text && text.trim() !== '') {
            await saveExtractedText(text, imageName);
        }
        
        res.json({ 
            mensaje: 'Foto guardada exitosamente',
            ruta: `/Galeria/${imageName}`,
            textoExtraido: text
        });
    } catch (error) {
        console.error('Error al procesar la imagen:', error);
        res.status(500).json({ 
            error: 'Error al procesar la imagen',
            detalle: error.message 
        });
    }
});

// Ruta para obtener la lista de fotos
getFotos = () => {
    const galeriaPath = path.join(__dirname, 'Galeria');
    if (!fs.existsSync(galeriaPath)) return [];
    return fs.readdirSync(galeriaPath)
        .filter(file => file.endsWith('.jpg'))
        .map(file => `/Galeria/${file}`);
};

app.get('/obtener-fotos', (req, res) => {
    res.json({ fotos: getFotos() });
});

// Ruta principal para servir el HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'componentes.html'));
});

// Iniciar el servidor
app.listen(port, '0.0.0.0', () => { // Escucha en todas las interfaces
    const host = getLocalIP();
    console.log(`Servidor escuchando en http://${host}:${port}`);
    
    // Crear el directorio de galería si no existe
    const galeriaPath = path.join(__dirname, 'Galeria');
    fs.ensureDirSync(galeriaPath);
    console.log(`Las fotos se guardarán en: ${galeriaPath}`);
});