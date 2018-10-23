finger-asismed
==============

Aplicación de para manejo del sensor de huellas digitales
Para poder ejecutar la libreria node-serialport con electron, es necesario que se utilice la misma version de node tanto en la maquina como en electron.

Al momento de hacer este tutorial, la ultima version de electron es la `2.0.8`, utilizando node `8.9.3`. Para utilizar esta version de node de manera local:

1. 
2. Clonar el proyecto
3. Descargar nvm-setup.zip de https://github.com/coreybutler/nvm-windows/releases
4. Iniciar Windows PowerShell con permisos de Administrador (Boton derecho, ejecutar como administrados) lanzar el comando `nvm install 8.9.3`
5. Ejecutar `npm --add-python-to-path='true' --debug install --global windows-build-tools`
6. Siempre dentro de PowerShell, dirigirse la raiz del proyecto en consola y ejecutar npm install .
7. Ejecutar los siguientes comandos para compilar node-serialport con las versiones requeridas para trabajar.
```
rmdir /S /Q node_modules\serialport\build\ 
node_modules\.bin\electron-rebuild -w serialport -f
dir node_modules\serialport\build\Release
```
8. Ejecutar en consola `npm start`

Para configurar electron, utilizar el archivo index.js. Esto al momento solo abre un index.html que no se esta utilizando pero podria ser utilizado para configuracion.

Para utilizar las funciones del lector, se pueden usar las funciones que estan en `sensor.js` . Hay que probarlas primero.

Hay un servidor corriendo en `server.js` . Habria que *probarlas* en detalle

Para empaquetarlo en un unico archivo, se podria utilizar este proceso: 
https://electronjs.org/docs/tutorial/application-packaging


# sermed-app
