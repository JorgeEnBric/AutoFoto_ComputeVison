
AutoFoto es un servidor web que permite subir y mostrar fotos en una galeria.

Funciona sin https, debe ajustarse en el navegador para que funcione correctamente en chrome:

chrome://flags/
Y buscar "Insecure content allowed" y activarla para la Ip del servidor donde está corriendo AutoFoto
Ejemplo: http://192.168.1.100:3000

Para inicializar el proyecto:
1. Instalar dependencias: npm install
2. Iniciar el servidor: npm start

El servidor se iniciará en http://localhost:3000

El directorio de las fotos se encuentra en la carpeta "Galeria"

Para subir una foto:
1. En el celular, abrir el navegador e ir a 
http://IPSuministrada:3000
