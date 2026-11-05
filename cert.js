// Gestión del certificado TLS autofirmado para servir la app por HTTPS.
// getUserMedia solo está disponible en contextos seguros (HTTPS o localhost),
// por eso el servidor debe usar HTTPS para que la cámara funcione en Android.
const path = require('path');
const fs = require('fs-extra');
const selfsigned = require('selfsigned');

const CERTS_DIR = path.join(__dirname, 'certs');
const KEY_PATH = path.join(CERTS_DIR, 'server.key');
const CERT_PATH = path.join(CERTS_DIR, 'server.crt');
const META_PATH = path.join(CERTS_DIR, 'meta.json');

const DAYS = 397; // Dentro del límite de validez que acepta Chrome
const RENEW_BEFORE_MS = 7 * 24 * 60 * 60 * 1000; // Renovar 7 días antes de vencer

function normalizeIPs(ips) {
    const all = ['127.0.0.1', ...(ips || [])];
    return [...new Set(all.map(ip => String(ip).trim()).filter(Boolean))].sort();
}

function sameIPs(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((ip, i) => ip === b[i]);
}

async function readMeta() {
    try {
        return await fs.readJson(META_PATH);
    } catch {
        return null;
    }
}

async function generate(ips) {
    const notBeforeDate = new Date();
    const notAfterDate = new Date(notBeforeDate.getTime() + DAYS * 24 * 60 * 60 * 1000);

    const pems = await selfsigned.generate(
        [{ name: 'commonName', value: 'AutoFoto' }],
        {
            keySize: 2048,
            algorithm: 'sha256',
            notBeforeDate,
            notAfterDate,
            extensions: [
                { name: 'basicConstraints', cA: false },
                { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
                { name: 'extKeyUsage', serverAuth: true },
                {
                    name: 'subjectAltName',
                    altNames: [
                        { type: 2, value: 'localhost' },
                        ...ips.map(ip => ({ type: 7, ip }))
                    ]
                }
            ]
        }
    );

    await fs.ensureDir(CERTS_DIR);
    await fs.writeFile(KEY_PATH, pems.private, { mode: 0o600 });
    await fs.writeFile(CERT_PATH, pems.cert);
    await fs.writeJson(META_PATH, {
        ips,
        createdAt: notBeforeDate.toISOString(),
        expiresAt: notAfterDate.toISOString()
    }, { spaces: 2 });

    console.log(`Certificado TLS generado para: ${ips.join(', ')}`);
    return { key: pems.private, cert: pems.cert };
}

// Devuelve { key, cert } en PEM, generando o renovando el certificado si hace falta.
async function ensureCertificate(ips) {
    const wantedIPs = normalizeIPs(ips);
    const meta = await readMeta();

    const exists = await fs.pathExists(KEY_PATH) && await fs.pathExists(CERT_PATH);
    const coversIPs = sameIPs(meta?.ips, wantedIPs);
    const expiresAt = meta?.expiresAt ? new Date(meta.expiresAt).getTime() : 0;
    const stillValid = expiresAt - Date.now() > RENEW_BEFORE_MS;

    if (exists && coversIPs && stillValid) {
        return {
            key: await fs.readFile(KEY_PATH),
            cert: await fs.readFile(CERT_PATH)
        };
    }

    return generate(wantedIPs);
}

module.exports = { ensureCertificate };
