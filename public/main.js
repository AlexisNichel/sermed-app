//Cancel all previous ajax request
function ajaxCancel() {
	$(function () {
		$.xhrPool = [];
		$.xhrPool.abortAll = function (callback) {
			$(this).each(function (i, jqXHR) {   //  cycle through list of recorded connection
				jqXHR.abort();  //  aborts connection
				$.xhrPool.splice(i, 1); //  removes from list by index
			});
			callback();
		}
		$.ajaxSetup({
			timeout: 5000,
			beforeSend: function (jqXHR) { $.xhrPool.push(jqXHR); }, //  annd connection to list
			complete: function (jqXHR) {
				var i = $.xhrPool.indexOf(jqXHR);   //  get index for current connection completed
				if (i > -1) $.xhrPool.splice(i, 1); //  removes from list by index
			}
		});
	})
}
ajaxCancel();

var versions = "0.0.0";
$(document).ready(function () {
	/**********Basic server info**************/
	$.get("/id").success(function (id) {
		localStorage.id = id;
	})
	$.get("/reintentos").success(function (reintent) {
		localStorage.reintent = reintent;
	})
	$.get("/timeout").success(function (timeout) {
		localStorage.timeout = timeout;
	})
	$.get("/version").success(function (version) {
		$("#version").text("Versión " + version);
		versions = version;
	})

	/************Get url params**************/
	function get(name) {
		if (name = (new RegExp('[?&]' + encodeURIComponent(name) + '=([^&]*)')).exec(location.search))
			return decodeURIComponent(name[1].replace('_', ''));
	}
	var socio = get('so');
	var origen = get('or');

	/************Get DOM elements**************/
	var success = $("#success");
	var error = $("#error");
	var loading = $("#loading");

	/************Var. definicion**************/
	var params = { p_id_maquina: parseInt(localStorage.id) };
	var fields;
	var server = "http://visa.sermed.info:8081/WSHuella/ws/procesos";
	//var server = "http://localhost:2332";
	var reintento = 0;
	var timeouts = 0;
	var nombre;
	var verifyUserStatus = false;

	/***************Events*****************/
	$("#verifyenrol").submit(function (e) {
		e.preventDefault();
		verifyUser(true);
	});
	$("#back-to-verify").click(function () {
		$("#enrol").hide();
		$("#verifyenrol").hide();
		$("#verify").fadeIn("slow");
		success.hide();
		error.hide();
		loading.hide();
		return false;
	});
	$("#back-to-ci").click(function () {
		$("#back-to-ci").hide();
		$("#text-id").hide();
		$("#text-ci").fadeIn("slow");
		success.hide();
		error.hide();
		loading.hide();
		return false;
	});
	$(".cancel").click(function (e) {
		e.preventDefault();
		$(".submit-btn, .cancel-btn").prop('disabled', true);
		$.xhrPool.abortAll(function () {
			$(".submit-btn, .back-btn, .cancel-btn").prop('disabled', false);
			$.post("/cancelar").always(abort);
			setTimeout(function () {
				window.open("http://visa.sermed.info/auth/index.php/visacion/visacion", "_self")
			}, 2000);
		});
	});
	$("#login").submit(function (e) {
		e.preventDefault();
	});
	$("#enrol-link").click(mostrarEnrol);
	$("#enrol").submit(function (e) {
		e.preventDefault();
		enrolar()
	});

	/***************Main*****************/
	verifyUser(false);

	/***************Functions*****************/
	function verifyUser(verifyUsers) {
		if (verifyUsers)
			verifyUserStatus = true;
		var limit = 1;
		$('input.css-checkbox').on('change', function (evt) {
			if ($(this).siblings(':checked').length >= limit)
				this.checked = false;
		});
		$(".submit-btn, .back-btn").prop('disabled', true);
		error.hide();
		success.hide();
		loading.html('<img src="loading.gif" /> Obteniendo huellas..');
		loading.fadeIn("slow", function () {
			$(".cancel-btn").prop('disabled', false);
		});
		params = {
			accion: "VALIDAR",
			p_id_maquina: parseInt(localStorage.id),
			version: versions
		}
		if (socio)
			params.p_ci = socio;
		switch (origen) {
			case "ve":
				params.type = "verify";
				break;
			default:
				params.type = "visa";
				break;
		}
		return borrarHuellas()
			.then(obtenerHuellas)
			.then(comprobarHuellas)
			.then(escribirHuellas)
			.then(verificarHuellas)
			.then(enviarResultado)
			.done(verificarResultado)
			.fail(enviarError, abort);
	}
	function verificarResultado(data) {
		var response = data;
		nombre = response.P_NOMBRE;
		if (response.P_OK == "NO")
			abort({ responseText: "Error Inesperado. Intente Nuevamente" });
		else {
			$("#manos").hide();
			loading.hide();
			if (nombre)
				success.text("El beneficiario " + nombre + " se ha validado correctamente.");
			else
				success.text("El beneficiario se ha validado correctamente");
			$(".submit-btn, .back-btn").prop('disabled', false);
			$(".cancel-btn").prop('disabled', true);
			success.fadeIn();
			console.log(origen);
		
				setTimeout(function () {
					switch (origen) {
						case "cn":
							window.open("http://visa.sermed.info/auth/visacion/visacion/visaConsultaHv/" + params.p_ci, "_self")
							break;
						case "cu":
							window.open("http://visa.sermed.info/auth/visacion/visacion/visaConsultaUrgenciaHv/" + params.p_ci, "_self")
							break;
						case "sn":
							window.open("http://visa.sermed.info/auth/visacion/visacion/visaServicioHv/" + params.p_ci, "_self")
							break;
						case "su":
							window.open("http://visa.sermed.info/auth/visacion/visacion/visaServicioUrgenciaHv/" + params.p_ci, "_self")
							break;
						case "ve":
							window.open("http://visa.sermed.info/auth/index.php/visacion/visacion", "_self")
							break;
					}
				}, 3000);

		}
	}
	function enviarResultado() {
		return $.ajax({
			type: 'POST',
			url: server + "/resultados",
			data: JSON.stringify(params),
			dataType: 'json',
			processData: false,
			contentType: 'text/plain'
		//	contentType: 'application/json'
		})
	}
	function verificarHuellas() {
		$("#manos").fadeIn();
		$(".cancel-btn").prop('disabled', false);
		return $.ajax(
			{
				method: "POST",
				url: "/verificar",
				timeout: timeouts
			})


	}
	function escribirHuellas(response) {
		var deferred = $.Deferred();
		loading.html('<img src="loading.gif" /> Escribiendo Huellas..');
		$(".cancel-btn").prop('disabled', true);
		$.post("/escribir/1", { huella: response.P_HUELLA1.replace(/(?:\\[rn]|[\r\n]+)+/g, "") }).done(function (res) {
			if (response.P_NOMBRE_BENEFICIARIO != null) {
				nombre = response.P_NOMBRE_BENEFICIARIO;
				loading.html('<img src="loading.gif" />Bienvenido <br>' + toTitleCase(response.P_NOMBRE_BENEFICIARIO) + '<br> Ingrese huella Nro <b>' + response.P_NRO_DEDO1 + '</b>');
			}
			else
				loading.html('<img src="loading.gif" />Bienvenido <br> Ingrese huella Nro <b>' + response.P_NRO_DEDO1 + '</b>');
			deferred.resolve(response);
		})
			.fail(function (err) {
				deferred.reject({ responseText: "Error Inesperado. Intente Nuevamente" })
			});
		return deferred.promise()
	}
	function comprobarHuellas(data) {
		var deferred = $.Deferred();
		try {
			if (!data.P_HUELLA1) {
				mostrarEnrol();
				if (!data.P_MENSAJE)
					return deferred.reject({ responseText: "Beneficiario no tiene huellas cargadas" })
				else
					return deferred.reject({ responseText: data.P_MENSAJE })
			};
			deferred.resolve(data);
		}
		catch (e) {
			return deferred.reject({ responseText: "Error Inesperado. Intente Nuevamente" });
		}
		return deferred.promise()
	}
	function obtenerHuellas() {
		return $.ajax({
			type: 'POST',
			url: server + "/huellas",
			data: JSON.stringify(params),
			dataType: 'json',
			processData: false,
			contentType: 'text/plain'
			//contentType: 'application/json'
		});
	}
	function enviarError(res) {
		params.accion = "resultado";
		params.p_resultado = "Error en la Validación";
		if (res && res.responseText != "Beneficiario no tiene huellas cargadas" && res.responseText != "HUELLA NO ENCONTRADA") {
			setTimeout(function () {
				reintento = reintento + 1;
				if (reintento < parseInt(localStorage.reintent))
					verifyUser();
				else 
					window.open("http://visa.sermed.info/auth/index.php/visacion/visacion", "_self")
			}, 5000);
		}
		return $.ajax({
			type: 'POST',
			url: server + "/errores",
			data: JSON.stringify(params),
			dataType: 'json',
			processData: false,
			contentType: 'text/plain'
		//	contentType: 'application/json'
		})
	}
	function startTimer(duration, display) {
		loading.show();
		var timer = duration, minutes, seconds;
		var interval = setInterval(function () {
			loading.show();
			minutes = parseInt(timer / 60, 10);
			seconds = parseInt(timer % 60, 10);
			minutes = minutes < 10 ? "0" + minutes : minutes;
			seconds = seconds < 10 ? "0" + seconds : seconds;
			display.text("Reiniciando en: " + seconds + " segundos");
			$(".submit-btn, .back-btn, .cancel-btn").prop('disabled', true);
			error.show();
			if (--timer < 0) {
				clearInterval(interval);
				error.fadeOut();
				loading.fadeOut();
				$(".submit-btn, .back-btn, .cancel-btn").prop('disabled', false);
			}
		}, 1000);
	}
	function abort(response) {
		loading.hide();
		$("#manos").hide();
		$('html, body').animate({ scrollTop: error.offset().top }, 'slow');
		$(".submit-btn, .back-btn").prop('disabled', false);
		$(".cancel-btn").prop('disabled', true);
		if (response.responseText) {
			error.text(response.responseText);
			if (response.responseText == "Reiniciando aplicación. Por favor espere unos segundos y vuelva a intentarlo.")
				startTimer(20, loading);
			if (response.responseText === "Ya existe una conexión con el sensor desde otra ventana del navegador.") {
				$(".cancel-btn").prop('disabled', false);
				$(".submit-btn, .back-btn").prop('disabled', true);
			}
			else if (response.responseText !== "Ya existe una conexión con el sensor desde otra ventana del navegador.")
				$.post("/cancelar")
		}
		else if (response.statusText === "timeout") {
			$.post("/cancelar")
			error.text("Tiempo de espera agotado.");
		}
		else if (response.statusText == "abort")
			error.text("Operación Cancelada.");
		else
			error.text("Por favor, inicie la aplicación sermed.exe");
		error.fadeIn();
	}
	function mostrarEnrol() {
		$("#verify").hide();
		$("#verifyenrol").hide();
		$("#enrol").fadeIn("slow");
		return false;
	}

	function enrolar() {
		error.hide();
		success.hide();
		fields = $("#enrol").serializeArray();
		if (fields[0] == null) {
			alert("Debe elegir huella a enrolar");
			return;
		}
		if (socio == "") {
			alert("Debe completar el campo código de carnet");
			return;
		}
		$(".submit-btn, .back-btn").prop('disabled', true);
		loading.html('<img src="loading.gif" /> Cargando..');
		loading.fadeIn("slow", function () {
			$(".cancel-btn").prop('disabled', false);
		});
		$('html, body').animate({ scrollTop: loading.offset().top }, 'slow');
		borrarHuellas()
			.then(enrolarHuella1)
			.then(enviarHuellas)
			.done(alInsertarRegistro)
			.fail(abort);
	}
	function toTitleCase(str) {
		return str.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
	}
	function enrolarHuella1() {
		loading.html('<img src="loading.gif" /> Ingrese huella <b>Nro ' + fields[0].name[1] + '</b> 3 veces');
		return $.ajax({
			type: "POST",
			url: "/enrolar/1",
			timeout: timeouts
		}).then(res => { return res });
	}
	function borrarHuellas() {
		var deferred = $.Deferred();
		$.ajax({
			type: "POST",
			url: "/borrar",
			timeout: timeouts
		})
			.done(function (data) {
				deferred.resolve(data)
			})
			.fail(function (data) {
				$.post("/cancelar");
				deferred.reject(data);
			})
		return deferred.promise();
	}
	function enviarHuellas(valorHuella) {
		params["p_huella1"] = valorHuella;
		return $.ajax({
			type: 'POST',
			url: server + "/huellas",
			data: JSON.stringify(construirPeticion()),
			processData: false,
			contentType: false,
			dataType: 'json',
			contentType: 'text/plain'
		//	contentType: 'application/json'
		});
	}
	function construirPeticion() {
		var ci = socio;
		if (ci)
			params.p_ci = ci;
		params.p_id_maquina = parseInt(localStorage.id);
		params.accion = "INSERTAR";
		params.p_nro_dedo1 = parseInt(fields[0].name[1]);
		return params;
	}
	function alInsertarRegistro(response) {
		loading.hide();
		try {
			var respuesta = response;
			if (respuesta.P_MENSAJE == "INSERCION CORRECTA.") {
				if (respuesta.P_NOMBRE_BENEFICIARIO)
					success.text("Huella de" + toTitleCase(respuesta.P_NOMBRE_BENEFICIARIO) + "\n Cargada Exitosamente.");
				else
					success.text("Huella Cargada Exitosamente.");
				success.fadeIn();
				setTimeout(function () {
					$("#verify").hide();
					$("#verifyenrol").fadeIn("slow");
					$("#enrol").hide();
					$(".cancel-btn").prop('disabled', false);
				}, 2000);
			}
			else {
				error.text(respuesta.P_MENSAJE);
				error.fadeIn();
			}
		}
		catch (e) {
			abort({ responseText: "Ha ocurrido un error. Intente Nuevamente" });
			return;
		}
		$(".submit-btn, .back-btn").prop('disabled', false);
		$(".cancel-btn").prop('disabled', true);
	}
});
