AutoFoto_ComputeVision es un servidor web en Node JS que toma automaticamente fotos y las guarda en un directorio ubicado en el servidor donde se despliegue [Galeria]
Cada imagen tomada es analizada con Compute Vision para extraer el texto y guardarlo en [TextosExtraidos.txt]

Funciona SIN https, debe ajustarse en el navegador para que funcione correctamente en chrome:

En chrome://flags/ buscar "Insecure content allowed" y activarla para la Ip del servidor donde está corriendo AutoFoto_ComputeVision

Funciona sin https, debe ajustarse en el navegador para que funcione correctamente en chrome:

chrome://flags/
Y buscar "Insecure content allowed" y activarla para la Ip del servidor donde está corriendo AutoFoto
Ejemplo: http://192.168.1.100:3000

Para inicializar el proyecto:
#####################################
1. Instalar dependencias: npm install
2. Editar el azure.env con el endpoint de Compute Vision Azure (Gratuito, solo crear la cuenta en Azure y crear el recurso)
AZURE_VISION_ENDPOINT=https://<Tu-recurso>.cognitiveservices.azure.com/
AZURE_VISION_KEY=xxxxx

3. Iniciar el servidor: npm start o node index.js

El servidor se iniciará en http://192.168.1.100:3000

El directorio de las fotos se encuentra en la carpeta "Galeria"

Consumir la webapp
#####################################
1. En el smartphone, abrir el navegador e ir a 
http://192.168.1.100:3000 y presionar [Comenzar]
.
![AutoFoto](https://github.com/user-attachments/assets/6a30d71d-62e5-457e-a31d-e65c260a359e)
