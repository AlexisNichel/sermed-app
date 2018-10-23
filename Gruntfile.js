//Gruntfile para compilar aplicación de clínicas en un solo ejecutable.
//IMPORTANTE! SI Se agregan directorios al raiz que no son js/html/json se debe modificar el copy!!
//Hay que copiar node_modules a /bin! No se crea solo.

//Requisitos
// - Node-webkit versión 0.12.0-alpha3 en el /build/node-webkit
// - Enigma Virtual Box instalado
// - Node.js y npm install

/* Intrucciones para compilarlo en node-webkit
Install MS Visual Studio Express 2013 for Desktop
Install Python 2.7.6
Add Python to the path
Reboot
Open the 'Visual Studio Command Prompt' (Developer Eingabeaufforderung für VS2013)
Install nw-gyp with this command: npm install nw-gyp -g
Install node-pre-gyp with this command: npm install node-pre-gyp -g
Change to my working directory (project directory)
Install serialport with this command: npm install serialport
Switch to the serialport modul directory: cd node_modules\serialport
Make a clean: node-pre-gyp clean
Configure the build process: node-pre-gyp configure --runtime=node-webkit --target=0.12.0
Build the module for node-webkit: node-pre-gyp build --runtime=node-webkit --target=0.12.0
After all I have to change the directoryname from /node_modules/serialport/build/serialport/v1.6.3/Release/node-webkit-v0.12.0-win32-x64\ to /node_modules/serialport/build/serialport/v1.6.3/Release/node-webkit-v43-win32-x64\
*/

//NO USAR SERVI.JS, le falta el abort que lo hice yo!!! agregarlo

module.exports = function (grunt) {
	grunt.initConfig({
		copy: {
			main: {
				files: [
					// includes files within path
					{
						expand: true,
						src: '*.{js,html,json}',
						dest: './build/bin/'
					}, {
						expand: true,
						src: './public/*',
						dest: './build/bin/'
					},
				]
			},
			node: {
				files: [
					// includes files within path
					{
						flatten: true,
						expand: true,
						src: './build/node-webkit/nw.exe',
						dest: './build/dist/'
					}
				]
			}
		},
		compress: {
			main: {
				options: {
					mode: 'zip',
					archive: "build/dist/app.nw"
				},
				files: [{
					expand: true,
					cwd: 'build/bin',
					src: ['**'],
				}]
			}
		},
		exec: {
			dist: {
				cmd: "copy /b nw.exe+app.nw nw1.exe /y",
				cwd: 'build/dist/'
			},
			compile: {
				cmd: "enigmavirtualbox gen app.evp nw.exe nw1.exe ../node-webkit/icudtl.dat ../node-webkit/nw.pak",
				cwd: 'build/dist/'
			},
			build: {
				cmd: "enigmavirtualbox cli app.evp",
				cwd: 'build/dist/',
				exitCode: 1
			},
			open: {
				cmd: "nw.exe",
				cwd: 'build/dist/',
				exitCode: 1
			}
		},


	});
	grunt.loadNpmTasks('grunt-contrib-compress');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-exec');

	grunt.registerTask('build', ['copy', 'compress', 'exec:dist', 'exec:compile', 'exec:build']);
	grunt.registerTask('serve', ['copy', 'compress', 'exec']);
	grunt.registerTask('default', ['copy', 'compress', 'exec']);
	grunt.registerTask('test', ['exec:open']);
};