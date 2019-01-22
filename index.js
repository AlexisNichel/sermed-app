const pjson = require('./package.json');
const Sensor = require('./sensor');
const Server = require('./server');
const shell = require('electron').shell;
var PATH = require('path');
var path = require('path-extra');
const { app, BrowserWindow } = require('electron')
const { Menu, Tray } = require('electron')
const { ipcMain } = require('electron')
var LocalStorage = require('node-localstorage').LocalStorage;
localStorage = new LocalStorage(PATH.join(path.homedir(), 'config'));

var puerto = localStorage.getItem('puerto');
var idMaquina = localStorage.getItem('idMaquina');
let win
const { dialog } = require('electron');
const dialogOptions = { type: 'error', message: `Verifique que el sensor se encuentra conectado en el ${puerto} e intente nuevamente` }

ipcMain.on('set-config', (event, maquina, puerto) => {
	idMaquina = parseInt(maquina);
	localStorage.setItem('puerto', puerto);
	localStorage.setItem('idMaquina', idMaquina);
	console.log(puerto);
	var sensor = new Sensor(puerto);
	sensor.connect().then(function () {
		var server = Server(sensor, idMaquina);
		openWebMainPage();
		win.hide();
		event.sender.send('response', 'success');
	}).catch(function (err) {
		errorport(puerto, win);
	})
});

ipcMain.on('get-version', (event) => {
	event.returnValue = 'Versión ' + pjson.version;
})

ipcMain.on('get-config', (event) => {
	if (puerto !== null)
		event.returnValue = true;
	else
		event.returnValue = false;
})

function openWebMainPage() {
	const args = process.argv;
	console.log(args)
	if(args.indexOf("relaunch") == -1)
	{
		shell.openExternal('http://visa.sermed.info/auth/index.php/visacion/visacion');
	}
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
		height: 235,
		icon: 'public/logo.png'
	})
	win.setMenu(null);

	win.on('minimize', function (event) {
		event.preventDefault();
		win.hide();
	});
	if (puerto !== null) {
		console.log(puerto);
		var sensor = new Sensor(puerto);
		sensor.connect().then(function () {
			var server = Server(sensor, idMaquina);
			openWebMainPage();
			win.hide();
		}).catch(function (err) {
			errorport(puerto, win);
		})
		sensor.on("restart", function () {
		//	process.exit(1);
			app.relaunch({args: '--relaunch'})
			app.exit(0);
		});

	}
	// and load the index.html of the app.
	win.loadFile('index.html')

	// Open the DevTools.
	//win.webContents.openDevTools();

	win.on('closed', () => {
		win = null
	})
}

app.on('ready', createWindow)
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})
app.on('activate', () => {
	if (win === null) {
		createWindow()
	}
})
