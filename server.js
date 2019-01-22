var http = require('http'),
	express = require('express'),
	app = express(),
	bodyParser = require('body-parser'),
	pjson = require('./package.json'),
	serveStatic = require('serve-static');

var PATH = require('path'),
	winston = require('winston'),
	path = require('path-extra');
	
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)(),
        new (winston.transports.File)({ filename: PATH.join(path.homedir(), 'Bioid.log'), maxSize: 100000 })
    ]
});

console.log = function (d) { 
	logger.info(d);
};

var server = function (sensor, idMaquina) {
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: false }));
	app.disable('etag');
	//app.use(serveStatic(process.cwd() + '/public/', { maxAge: 0 }));
	app.use(express.static(path.join(__dirname, 'public')));
	app.get('/', enviarIndex);

	// Se registran todas las rutas accesibles 
	app.all('/ledOn', sensor.encenderLed);

	app.all('/enrolar/:dedo', sensor.enrolar);

	app.all('/borrar', sensor.borrarHuellas);

	app.all('/cancelar', sensor.cancelar);

	app.all('/escribir/:dedo', sensor.escribirHuella);

	app.all('/verificar', sensor.verificar);

	//app.all('/obtener/:dedo', sensor.obtenerHuella);  //solo para probar el enroll

	//Datos del sistema
	app.get('/version', function (req, resp) { return resp.send(pjson.version); });
	app.get('/id', function (req, resp) { resp.send(parseInt(idMaquina).toString()); });

	// Una vez configurado, se crea el servidor
	var server = http.createServer(app);
	// server.maxConnections = 5;
	server.listen(3001);
	console.log("Escuchando conexiones del puerto 3001");
	server.timeout = 10 * 1000

	function enviarIndex(request,res) {
		//aca tengo el header aun pero como le paso eso al html
		res.sendFile(__dirname +'/public/index.html');
	}
	return server;
}
module.exports = server;