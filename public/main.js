
$(document).ready(function () {
	$.get("/id").success(function (id) {
		localStorage.id = id;
	})
	$.get("/version").success(function (version) {
		$("#version").text("Versión " + version);
	})

	var success = $("#success"),
		error = $("#error"),
		loading = $("#loading"),
		params = { p_id_maquina: parseInt(localStorage.id) },
		fields,
		server = "http://10.211.55.5:2332";
		
   // server = "http://mail.sermed.com.py:8081/WSHuella/ws/procesos";
	var tipo = getUrlParameter("p_tipo");
	var grupo = getUrlParameter("p_grupo");
	var secuencia = getUrlParameter("p_secuencia");

	$("#id-link").click(ocultarCI);

	$("#back-to-verify").click(function () {
		$("#enrol").hide();
		$("#verify").fadeIn("slow");
		success.hide();
		error.hide();
		loading.hide();
		return false;
	});

	$("#back-to-ci").click(function () {
		$("#back-to-ci").hide();
		$("#P_CI").attr("required", "");
		$("#text-id").hide();
		$("#P_ID_GRUPO").removeAttr("required");
		$("#P_ID_GRUPO").val('');
		$("#text-ci").fadeIn("slow");
		success.hide();
		error.hide();
		loading.hide();
		return false;
	});

	$(".cancel").click(function (e) {
		e.preventDefault();
		console.log("Cancelando");
		$(".submit-btn, .cancel-btn").prop('disabled', true);
		$.xhrPool.abortAll(function () {
			$(".submit-btn, .back-btn, .cancel-btn").prop('disabled', false);
			$.post("/cancelar").always(abort);
	   });
	});

	var limit = 2;
	$('input.css-checkbox').on('change', function (evt) {
		if ($(this).siblings(':checked').length >= limit) {
			this.checked = false;
		}
	});

	$("#verify").submit(function (e) {
		var nombre;
		var checksum;
		var carnet;

		$(".submit-btn, .back-btn").prop('disabled', true);
		e.preventDefault();
		error.hide();
		success.hide();
		loading.html('<img src="loading.gif" /> Obteniendo huellas..');
		loading.fadeIn("slow", function () {
			$(".cancel-btn").prop('disabled', false);
		});
		var fields = $("#verify").serializeArray();
		var params = {
			accion: fields[0].value,
			p_id_maquina: parseInt(localStorage.id)
		}
		if (fields[1].value) {
			params.p_ci = fields[1].value;
		};
		
		borrarHuellas() 
			.then(obtenerHuellas) 
			.then(comprobarHuellas) 
			.then(escribirHuellas) 
			.then(verificarHuellas) 
			.then(enviarResultado) 
			.done(verificarResultado)
			.fail(enviarError, abort); 

		function verificarResultado(data) {
			var response = JSON.parse(data);
			nombre = response.P_NOMBRE;
			checksum = "2345354554324234234124353452"; //ejemplo (viene en el responde del server)
			carnet = "12345"; //ejemplo (viene en el responde del server)

			if (response.P_OK == "NO") {
				abort({ responseText: "Error Inesperado. Intente Nuevamente" });
			}
			else {
				$("#manos").hide();
				loading.hide();
				if (nombre) {
					success.text("El beneficiario " + nombre + " se ha validado correctamente.");
				}
				else {
					success.text("El beneficiario se ha validado correctamente");
				}
				$(".submit-btn, .back-btn").prop('disabled', false);
				$(".cancel-btn").prop('disabled', true);
				success.fadeIn();
				setTimeout(function(){
					window.open("http://visa.sermed.info/auth?"+'socio='+carnet+'&checksum='+checksum,"_self")
				},3000);
				
			}
		}
		function enviarResultado() {
			return $.ajax({
				type: 'POST',
				url: server+"/resultados",
				data: JSON.stringify(params),
				dataType: 'json',
				processData: false,
				contentType: 'application/json'
			})
		}
		function verificarHuellas() {
			$("#manos").fadeIn();
			$(".cancel-btn").prop('disabled', false);
			return $.ajax(
				{
					method: "POST",
					url: "/verificar",
					timeout: 6000
				})
		}
		function escribirHuellas(response) {
			var deferred = $.Deferred();
			loading.html('<img src="loading.gif" /> Escribiendo Huellas..');
			$(".cancel-btn").prop('disabled', true);
			$.post("/escribir/1", { huella: response.P_HUELLA1.replace(/(?:\\[rn]|[\r\n]+)+/g, "") }).done(function (res) {
			$.post("/escribir/2", { huella: response.P_HUELLA2.replace(/(?:\\[rn]|[\r\n]+)+/g, "") }).done(function () {
					if (response.P_NOMBRE_BENEFICIARIO != null) {
						nombre = response.P_NOMBRE_BENEFICIARIO;
						loading.html('<img src="loading.gif" />Bienvenido <br>' + toTitleCase(response.P_NOMBRE_BENEFICIARIO) + '<br> Ingrese huella Nro <b>' + response.P_NRO_DEDO1 + '</b> o huella Nro <b>' + response.P_NRO_DEDO2) + "</b>";
					}
					else {
						loading.html('<img src="loading.gif" />Bienvenido <br> Ingrese huella Nro <b>' + response.P_NRO_DEDO1 + '</b> o huella Nro <b>' + response.P_NRO_DEDO2) + "</b>";
					}
					deferred.resolve(response);
				});
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
					return deferred.reject({ responseText: "Beneficiario Inactivo o Inexistente." })
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
				url: server+"/huellas",
				data: JSON.stringify(params),
				dataType: 'json',
				processData: false,
				contentType: 'application/json'
			});
		}
		function enviarError() {
			params.accion = "resultado";
			params.p_resultado = "Error en la Validación";
			return $.ajax({
				type: 'POST',
				url: server+"/errores",
				data: JSON.stringify(params),
				dataType: 'json',
				processData: false,
				contentType: 'application/json'
			})
		}
	})
	function ocultarCI() {
		$("#text-ci").hide();
		$("#P_CI").val('');
		$("#P_ID_GRUPO").attr("required", "");
		$("#P_CI").removeAttr("required");
		$("#back-to-ci").show();
		$("#text-id").fadeIn("slow");
	}
	$("input[name='P_SECUENCIA'").val(parseInt(secuencia));
	$("input[name='P_ID_GRUPO'").val(grupo);
	if (tipo == "enrolar") {
		mostrarEnrol();
		$("#f5,#f6").click();
		enrolar();
	}
	else if (tipo == "validar") {
		$("#verify").submit();
		ocultarCI();
	}
	$("#enrol-link").click(mostrarEnrol);
	function getUrlParameter(sParam) {
		var sPageURL = window.location.search.substring(1);
		var sURLVariables = sPageURL.split('&');
		for (var i = 0; i < sURLVariables.length; i++) {
			var sParameterName = sURLVariables[i].split('=');
			if (sParameterName[0] == sParam) {
				return sParameterName[1];
			}
		}
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
			if (response.responseText == "Reiniciando aplicación. Por favor espere unos segundos y vuelva a intentarlo.") {
				startTimer(20, loading);
			}
			if (response.responseText === "Ya existe una conexión con el sensor desde otra ventana del navegador.") {
				$(".cancel-btn").prop('disabled', false);
				$(".submit-btn, .back-btn").prop('disabled', true);
			}
			else if (response.responseText !== "Ya existe una conexión con el sensor desde otra ventana del navegador.") {
				$.post("/cancelar") 
			}
		}
		else if (response.statusText === "timeout") {
			$.post("/cancelar") 
			error.text("Tiempo de espera agotado.");
		}
		else if (response.statusText == "abort") {
			error.text("Operación Cancelada.");
		}
		else {
			error.text("Por favor, inicie la aplicación sermed.exe");
		}
		error.fadeIn();

	}

	function mostrarEnrol() {
		$("#verify").hide();
		$("#enrol").fadeIn("slow");
		return false;
	}

	$("#enrol").submit(function (e) {
		e.preventDefault();
		enrolar()
	});
	function enrolar() {
		error.hide();
		success.hide();
		fields = $("#enrol").serializeArray();
		if (fields[2] == null || fields[3] == null) {
			alert("Debe elegir 2 huellas a enrolar");
			return;
		}
		if (fields[1].value == "") {
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
			.then(enrolarHuella2) 
			.then(enviarHuellas) 
			.done(alInsertarRegistro)
			.fail(abort);
	}

	function toTitleCase(str) {
		return str.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
	}
	function enrolarHuella1() {
		loading.html('<img src="loading.gif" /> Ingrese huella <b>Nro ' + fields[2].name[1] + '</b> 3 veces');
		return $.ajax({
			type: "POST",
			url: "/enrolar/1",
			timeout: 0
		}).then(res=>{return res});
	}
	function borrarHuellas() {
		var deferred = $.Deferred();
		$.ajax({
			type: "POST",
			url: "/borrar",
			timeout: 0
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
	function enrolarHuella2(valorHuella) {
		params["p_huella1"] = valorHuella;
		loading.html('<img src="loading.gif" /> Ingrese huella <b>Nro ' + fields[3].name[1] + '</b> 3 veces');
		return $.ajax({
			type: "POST",
			url: "/enrolar/2",
			timeout: 0
		}).then(res=>{return res});
	}
	function enviarHuellas(valorHuella) {
		params["p_huella2"] = valorHuella;
		return $.ajax({
			type: 'POST',
			url: server+"/huellas",
			data: JSON.stringify(construirPeticion()),
			processData: false,
			contentType: false,
			dataType: 'json',
			contentType: 'application/json'
		});
	}
	function construirPeticion() {
		var ci = parseInt(fields[1].value);
		if (!isNaN(ci)) {
			params.p_ci = ci;
		}
		params.p_id_maquina = parseInt(localStorage.id);

		params.accion = fields[0].value;
		params.p_nro_dedo1 = parseInt(fields[2].name[1]);
		params.p_nro_dedo2 = parseInt(fields[3].name[1]);
		return params;
	}

	function alInsertarRegistro(response) {
		console.log(response);
		loading.hide();
		try {
			var respuesta = JSON.parse(response);
			if (respuesta.P_MENSAJE == "Registro Insertado Correctamente") {
				if (respuesta.P_NOMBRE_BENEFICIARIO) {
					success.text("Huella de" + toTitleCase(respuesta.P_NOMBRE_BENEFICIARIO) + "\n Cargada Exitosamente.");
				}
				else {
					success.text("Huella Cargada Exitosamente.");
				}
				success.fadeIn();

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

$("#login").submit(function (e) {
	e.preventDefault();
	console.log("login");
});