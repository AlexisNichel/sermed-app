var SerialPort = require("serialport"),
	EventEmitter = require('events');
var Sensor = function (comName) {
	var nombrePuerto = comName,
		sensor = this,
		estaConectado = false,
		puerto = new SerialPort(nombrePuerto, {
			baudRate: 115200,
			autoOpen: false
		}, false);


	puerto.on('error', function (err) {
		console.log("error");
	})
	puerto.on('open', function () {
		console.log("conectado");
	});
	puerto.on('close', function () {
		console.log("cierre");
	});
	puerto.on('disconnected', function () {
		console.log("se desconecto");
	});


	this.connect = function (req, resp) {
		return new Promise((resolve, reject) => {
			puerto.open(function (err) {
				if (err) {
					reject(err);
				}
				resolve();
			});
		});
	}

	//Comandos 
	this.encenderLed = function (req, resp) {
		console.log("Encendiendo LED...");
		var data = new Buffer("55AA24010200010000000000000000000000000000002701", "hex");
		puerto.write(data, function () {
			puerto.once('data', function (data) {
				resp.send(data);
			});
		});
	};

	this.apagarLed = function (req, resp) {
		console.log("Apagando LED...");
		var data = new Buffer("55AA24010200000000000000000000000000000000002601", "hex");
		puerto.write(data, function () {
			puerto.once('data', function (result) {
				resp.send(result);
			});
		});
	};

	this.borrarHuellas = function (req, resp) {
		if (estaConectado) {
			resp.status(500).send("Ya existe una conexión con el sensor desde otra ventana del navegador.");
		}
		else {
			estaConectado = true;
			var data = new Buffer("55AA06010000000000000000000000000000000000000601", "hex");
			console.log('data? ');
			var timeout = setTimeout(function () {
				estaConectado = false;
				puerto.removeAllListeners('data');
				resp.status(500).send("Reiniciando aplicación. Por favor espere unos segundos y vuelva a intentarlo.");
				sensor.emit("restart");
			
			
			}, 1000);
			var data = new Buffer("55AA06010000000000000000000000000000000000000601", "hex");
			puerto.write(data, function () {
				puerto.once('data', function (result) {
					clearTimeout(timeout);
					if (result[6] === 0 && result[7] === 0) {
						console.log("Huellas Borradas");
						resp.send("Huellas Borradas");
					}
					else {
						estaConectado = false;
						resp.status(500).send("Por favor, reconecte el lector e intente nuevamente. Si el problema persiste, solicite un nuevo lector");
					}
				});
			});
		}
	};

	this.cancelar = function (req, resp) {
		estaConectado = false;
		var data = new Buffer("55AA30010000000000000000000000000000000000003001", "hex");
		var timeout = setTimeout(function () {
			console.log("Operación Cancelada.");
			puerto.close(function () {
				console.log("Timeout");
				console.log("Sensor apagado");
				resp.status(500).send("Operación Cancelada.");
			});
		}, 5000);
		puerto.write(data, function () {
			puerto.on('data', function (result) {
				clearTimeout(timeout);
				puerto.removeAllListeners('data');
				console.log("Operación Cancelada");
				resp.status(500).send("Operación Cancelada.");
			});
		});
	};

	this.verificar = function (req, resp) {
		console.log("Verificando.");
		var data = new Buffer("55AA02010000000000000000000000000000000000000201", "hex");
		puerto.write(data, function () {
			puerto.on('data', function (result) {
				estaConectado = false;
				console.log("El comando mide " + result.length + " bytes");
				if (result.length == 48) {
					console.log(result.toString('hex'));
					result = result.slice(24, 48);
					console.log(result.toString('hex'));
				}
				if (result[8] == 0xF4) {
					estaConectado = true;
					console.log("Dejar de pulsar el sensor");
				}
				else if ((result[6] === 0) && (result[7] === 0 && result[2] == 0x02 && result[3] == 0x01)) {
					puerto.removeAllListeners('data');
					resp.send("La huella se encuentra en el template " + result[8]);
					console.log("La huella se encuentra en el template " + result[8]);
				}
				else if (result[8] === 0x23) {
					console.log("Tiempo de espera agotado.");
					puerto.removeAllListeners('data');
					resp.status(500).send("Tiempo de espera agotado.");
				}
				else if (result[2] == 0x02 && result[3] == 0x01 && result[8] == 0x12) {
					puerto.removeAllListeners('data');
					console.log("La huella no se encuentra registrada");
					resp.status(500).send("La huella no se encuentra registrada");
				}
				else if (result[2] == 0x02 && result[3] == 0x01 && result[8] == 0x21) {
					puerto.removeAllListeners('data');
					console.log("El sensor y/o la huella del paciente poseen manchas o impurezas. Limpie ambos e intente nuevamente.");
					resp.status(500).send("El sensor y/o la huella del paciente poseen manchas o impurezas. Limpie ambos e intente nuevamente.");
				}
				else if (result[2] == 0x30 && result[3] == 0x01 && result[8] == 0x00) {
					puerto.removeAllListeners('data');
					console.log("Verificacion Cancelada");
					resp.status(500).send("Verificación Cancelada");
				}
				else {
					console.log(result.toString('hex'));


					puerto.removeAllListeners('data');
					console.log("Ha ocurrido un error. Intente nuevamente");
					resp.status(500).send("Ha ocurrido un error. Intente nuevamente");
				}
			});
		});
	},


		this.escribirHuella = function (req, resp) {
			console.log("Escribiendo Huella..");
			var dedo = req.params.dedo;
			var data = new Buffer("55AA0B010200F20100000000000000000000000000000002", "hex");
			var huella1 = new Buffer(req.body.huella, "base64");
			var huella = new Buffer(huella1.toString("hex"), "hex");
			puerto.write(data, function () {
				puerto.once('data', function (result) {
					console.log("Escribiendo nueva huella " + dedo);
					var command = new Buffer("5AA50B01F4010" + dedo + "00", "hex");
					command = Buffer.concat([command, huella]);
					puerto.write(checksum(command), function () {
						puerto.once('data', function (result) {
							resp.send("Huellas escritas");
						});
					});
				});
			});
		},

		this.obtenerHuella = function (req, resp, huella) {
			var command = new Buffer("55AA0A0102000" + huella + "000000000000000000000000000000", "hex");
			var i = 0;
			var vector = [];
			puerto.write(checksum(command), function () {
				puerto.on('data', function (result) {
					i++;
					console.log(i);
					vector[i] = result;
					if (i == 2 && vector[2].length == 510) {
						var extractInitial = vector[2].slice(10);
						var extractFinal = extractInitial.slice(0, extractInitial.length - 2)
						puerto.removeAllListeners('data');
						var data = Buffer(extractFinal);
						estaConectado = false;
						resp.send(data.toString('base64'));
					}
					else if (i == 3) {
						var fingerData1 = new Buffer(vector[2].slice(10), "hex");
						var fingerData2 = new Buffer(vector[3].slice(0, vector[3].length - 2), "hex");
						var data = Buffer.concat([fingerData1, fingerData2]);
						estaConectado = false;
						puerto.removeAllListeners('data');
						resp.send(data.toString('base64'));
					}
				});
			});
		},

		this.enrolar = function (req, resp) {
			var data;
			var huella = req.params.dedo;
			console.log("llega solicitud de enroll de huella " + huella);
			var command = [];
			command = set_cmd(command);
			command[2] = 0x03;
			command[3] = 0x01;
			command[4] = 0x02;
			command[6] = parseInt(huella);
			command = calcular_chk(command);
			data = command;
			console.log("Enrolando huella " + huella + "...");
			var timeout = setTimeout(function () {
				estaConectado = false;
				console.log(timeout);
				resp.status(500).send("Tiempo de espera agotado.");
			}, 5000);
			puerto.write(data, function () {
				puerto.on('data', function (result) {
					clearTimeout(timeout);
					estaConectado = false;
					console.log("El comando mide " + result.length + " bytes");
					if (result.length == 48) {
						console.log(result.toString('hex'));
						result = result.slice(24, 48);
						result = result.toString('hex');
						console.log(result);
					}
					if (result[8] == 0x23) {
						puerto.removeAllListeners('data');
						console.log("Tiempo de espera agotado");
						resp.status(500).send("Tiempo de espera agotado.");
					}
					else if (result[8] == 0xF1) {
						estaConectado = true;
						console.log("Ingresar huella");
					}
					else if (result[8] == 0xF2 || result[8] == 0xF3) {
						estaConectado = true;
						console.log("Ingresar huella nuevamente");
					}
					else if (result[8] == 0xF4) {
						estaConectado = true;
						console.log("Dejar de pulsar el sensor");
					}
					else if (result[8] == 0x14) {
						puerto.removeAllListeners('data');
						console.log("Ya hay una huella en la posición " + huella);
						resp.status(500).send("Ya hay una huella en la posición " + huella);
					}
					else if (result[8] == 0x19) {
						console.log("La huella ya existe.");
						puerto.removeAllListeners('data');
						resp.status(500).send("La huella ya existe.");
					}
					else if (result[4] == 0x06 && (result[8] == 0x01 || result[8] == 0x02)) {
						estaConectado = true;
						puerto.removeAllListeners('data');
						return sensor.obtenerHuella(req, resp, huella);
					}
					else if (result[8] == 0x30) {
						puerto.removeAllListeners('data');
						console.log("Error en la marcación.");
						resp.status(500).send("Error en la marcación de la huella.");
					}
					else if (result[2] == 0x30 && result[3] == 0x01 && result[8] == 0x00) {
						puerto.removeAllListeners('data');
						console.log("Enrolamiento Cancelado.");
						resp.status(500).send("Enrolamiento Cancelado.");
					}
					else if (result[8] == 0x21) {
						puerto.removeAllListeners('data');
						console.log("El sensor y/o la huella del paciente poseen manchas o impurezas. Limpie ambos e intente nuevamente.");
						resp.status(500).send("El sensor y/o la huella del paciente poseen manchas o impurezas. Limpie ambos e intente nuevamente.");
					}
					else {
						puerto.removeAllListeners('data');
						console.log(result.toString('hex'));
						console.log("Error Inesperado");
						//	puerto.close(function () {
						console.log("Sensor apagado.");
						//		resp.status(500).send("Por favor, reconecte el lector e intente nuevamente. Si el problema persiste, solicite un nuevo lector");
						//	});
						// resp.status(500).send("Ha ocurrido un error. Intente nuevamente.");
					}
				});
			});
		};
}
Sensor.prototype = new EventEmitter.EventEmitter;
module.exports = Sensor;

//Utilidades
function checksum(command) {
	var i, sum = 0;
	for (i = 0; i < command.length; i++) {
		sum = sum + command[i];
	}
	sum = sum.toString(16);
	var hexSum = sum.length == 3 ? "0" + sum : sum;
	var chk = new Buffer(hexSum, "hex");
	var chk1 = chk[0];
	chk[0] = chk[1];
	chk[1] = chk1;
	return Buffer.concat([command, chk]);
}

function calcular_chk(command) {
	var i,
		sum = 0;
	for (i = 0; i <= 21; i++) {
		sum = sum + command[i];
	}
	command[22] = sum;
	command[23] = 0x01;
	return command;
}

function set_cmd(command) {
	var i;
	for (i = 0; i <= 23; i++) {
		command[i] = 0;
	}
	command[0] = 85;
	command[1] = 0xAA;
	return command;
}

