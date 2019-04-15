var http = require('http');
var	express = require('express');
var	app = express();
var	bodyParser = require('body-parser');
var	pjson = require('./package.json');
var	serveStatic = require('serve-static');
var PATH = require('path');
var	winston = require('winston');
var	path = require('path-extra');
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)(),
        new (winston.transports.File)({ filename: PATH.join(path.homedir(), 'd2.log'), maxSize: 100000 })
    ]
});
console.log = function (d) { 
	logger.info(d);
};
var server = function (sensor, idMaquina, reintentos, timeout) {
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: false }));
	app.disable('etag');
	app.use(express.static(path.join(__dirname, 'public')));
	app.get('/', enviarIndex);
	/******Se registran todas las rutas accesibles*********/
	app.all('/ledOn', sensor.encenderLed);
	app.all('/enrolar/:dedo', sensor.enrolar);
	app.all('/borrar', sensor.borrarHuellas);
	app.all('/cancelar', sensor.cancelar);
	app.all('/escribir/:dedo', sensor.escribirHuella);
	app.all('/verificar', sensor.verificar);
	/*************Datos del sistema***************/
	app.get('/version', function (req, resp) { return resp.send(pjson.version); });
	app.get('/id', function (req, resp) { resp.send(parseInt(idMaquina).toString()); });
	app.get('/reintentos', function (req, resp) { resp.send(parseInt(reintentos).toString()); });
	app.get('/timeout', function (req, resp) { resp.send(parseInt(timeout).toString()); });
	/*************Creación de servidor***************/
	var server = http.createServer(app);
	server.listen(3001);
	server.timeout=0;
	console.log("Escuchando conexiones del puerto 3001");
	console.log(server.timeout);
	function enviarIndex(request,res) {
		res.sendFile(__dirname +'/public/index.html');
	}
	return server;
}
module.exports = server;