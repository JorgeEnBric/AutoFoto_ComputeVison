AutoFoto_ComputeVision es un servidor web en Node JS que toma automaticamente fotos y las guarda en un directorio ubicado en el servidor donde se despliegue [Galeria]
Cada imagen tomada es analizada con Compute Vision para extraer el texto y guardarlo en [TextosExtraidos.txt]

Para inicializar el proyecto:

1. Instalar dependencias: npm install
2. Editar el azure.env con el endpoint de Compute Vision Azure (Gratuito, solo crear la cuenta en Azure y crear el recurso)
   AZURE_VISION_ENDPOINT=https://<Tu-recurso>.cognitiveservices.azure.com/
   AZURE_VISION_KEY=xxxxx

3. Iniciar el servidor: npm start o node index.js

El servidor se iniciará en https://192.168.1.100:3000 y redirigirá http://192.168.1.100:3001 a HTTPS.

El directorio de las fotos se encuentra en la carpeta "Galeria"

## HTTPS y acceso a la cámara

La cámara del navegador (`getUserMedia`) solo funciona en contextos seguros: **HTTPS** o **localhost**.
Por eso el servidor ahora usa HTTPS con un certificado autofirmado.

- El certificado se genera automáticamente al iniciar (dependencia `selfsigned`) en la carpeta `certs/`.
- Se regenera solo si vence o si cambia la IP local del equipo.
- `certs/` está excluido de git.

En el smartphone:

1. Abrir `https://192.168.1.100:3000` (importante: `https`, no `http`).
2. Chrome mostrará "Tu conexión no es privada": tocar **Avanzado > Continuar**.
3. Presionar [Comenzar] y permitir el acceso a la cámara.

Notas:

- Si el antivirus o Windows Firewall bloquea el puerto, permitir Node.js en la red privada.
- Si alguien entra con `http://192.168.1.100:3001`, se redirige automáticamente a HTTPS.
- No se sirve el directorio completo del proyecto: `azure.env` y el código del servidor no quedan expuestos.

Alternativa sin certificado (solo un teléfono por USB, requiere depuración USB):

```
adb reverse tcp:3000 tcp:3000
```

y en el teléfono abrir `http://localhost:3000` (localhost sí es un contexto seguro).

Consumir la webapp

1. En el smartphone, abrir el navegador e ir a
https://192.168.1.100:3000 y presionar [Comenzar]
![AutoFoto](https://github.com/user-attachments/assets/7ea76d8f-e853-4fa5-91dc-7c218364da11)


<img width="938" height="486" alt="Extraccion" src="https://github.com/user-attachments/assets/1e40bd86-d56e-41d1-9bb9-9bcfbe37e166" />
