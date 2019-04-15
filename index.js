const pjson = require('./package.json');
const Sensor = require('./sensor');
const Server = require('./server');
const shell = require('electron').shell;
var PATH = require('path');
var path = require('path-extra');
const { app, BrowserWindow } = require('electron');
const { Menu, Tray } = require('electron');
const { ipcMain } = require('electron');
var LocalStorage = require('node-localstorage').LocalStorage;
var localStorage = new LocalStorage(PATH.join(path.homedir(), 'config'));
var puerto = localStorage.getItem('puerto');
var idMaquina = localStorage.getItem('idMaquina');
var reintentos = localStorage.getItem('reintentos');
var timeout = localStorage.getItem('timeout');
let win;
const { dialog } = require('electron');
var dialogOptions = { type: 'error', message: `Verifique que el sensor se encuentra conectado en el ${puerto} e intente nuevamente` }

ipcMain.on('set-config', (event, maquina, puerto, reintent, timeouts) => {
	idMaquina = parseInt(maquina);
	reintentos = parseInt(reintent);
	timeout = parseInt(timeouts);
	localStorage.setItem('puerto', puerto);
	var verify = true;
	if(puerto.indexOf("COM") == -1)
	{
		dialogOptions = { type: 'error', message: `El formato del puerto es: COM3` }
		verify = false;
	}
	localStorage.setItem('idMaquina', idMaquina);
	if(idMaquina > 99999  || idMaquina < 0 || Number.isNaN(idMaquina))
	{
		dialogOptions = { type: 'error', message: `El número de máquina no puede ser mayor a 99999` }
		verify = false;
	}
	localStorage.setItem('reintentos', reintentos);
	if(reintentos > 5 || reintentos < 0  || Number.isNaN(reintentos))
	{
	  dialogOptions = { type: 'error', message: `El número de reintentos no puede ser mayor a 5` }
		verify = false;	 
	}
	localStorage.setItem('timeout', timeout);
	if(timeout > 60 || timeout < 0 || Number.isNaN(timeout))
	{
		dialogOptions = { type: 'error', message: `El timeout máximo es de 60 segundos` }
		verify = false;
	}
	if(verify){
		var sensor = new Sensor(puerto);
		sensor.connect().then(function () {
			var server = Server(sensor, idMaquina, reintentos, timeout);
			sensor.configTimeout(timeout);
			openWebMainPage();
			win.hide();
			event.sender.send('response', 'success');
		}).catch(function (err) {
			errorport(puerto, win);
		})
	}
	else
		dialog.showMessageBox(dialogOptions, i => console.log(i))
});
ipcMain.on('get-version', (event) => {
	event.returnValue = 'Versión ' + pjson.version;
})
ipcMain.on('get-config', (event) => {
	if (puerto !== null && reintentos !== null)
		event.returnValue = true;
	else
		event.returnValue = false;
})
function openWebMainPage() {
	const args = process.argv;
	if(args.indexOf("relaunch") == -1)
		shell.openExternal('http://visa.sermed.info/auth/index.php/visacion/visacion');
}
function errorport(puerto, win) {
	win.webContents.on('did-finish-load', () => {
		win.webContents.send('error', 'No se pudo conectar al sensor')
	})
	const dialogOptions = { type: 'error', message: `Verifique que el sensor se encuentra conectado en el ${puerto} e intente nuevamente` }
	dialog.showMessageBox(dialogOptions, i => console.log(i))
}
let tray = null
app.on('ready', () => {
	tray = new Tray(path.join(__dirname, 'public/logo.png'))
	const contextMenu = Menu.buildFromTemplate([{
		label: 'Mostrar', click: function () {
			win.show();
		}
	},
	{
		label: 'Salir', click: function () {
			app.isQuiting = true;
			app.quit();
		}
	}])
	tray.setToolTip('Sermed')
	tray.setContextMenu(contextMenu);
})
function createWindow() {
	win = new BrowserWindow({
		toolbar: false,
		resizable: false,
		frame: true,
		width: 405,
		height: 300,
		icon: 'public/logo.png'
	})
	win.setMenu(null);
	win.on('minimize', function (event) {
		event.preventDefault();
		win.hide();
	});
	if (puerto !== null && reintentos != null) {
		console.log(puerto);
		console.log(timeout);
		var sensor = new Sensor(puerto);
		sensor.connect().then(function () {
			var server = Server(sensor, idMaquina, reintentos, timeout);
			sensor.configTimeout(timeout);
			openWebMainPage();
			win.hide();
		}).catch(function (err) {
			errorport(puerto, win);
		})
		sensor.on("restart", function () {
			app.relaunch({args: '--relaunch'})
			app.exit(0);
		});
	}
	win.loadFile('index.html')
	win.on('closed', () => {
		win = null
	})
}
app.on('ready', createWindow)
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') 
		app.quit()
})
app.on('activate', () => {
	if (win === null) 
		createWindow()
})
