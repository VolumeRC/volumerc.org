// initWebGL
//
// Initialize WebGL, returning the GL context or null if
// WebGL isn't available or could not be initialized.
//
function initWebGL(canvas) {
  gl = null;
  
  try {
    gl = canvas.getContext("webgl", {premultipliedAlpha: false}) || canvas.getContext("experimental-webgl",{premultipliedAlpha: false});
  }
  catch(e) {
  }
  
  // If there is no GL context
  if (!gl) {
    alert("Unable to initialize WebGL. Your browser may not support it.");
  }
  return gl;
}

function load_resource(url) {
	var req = new XMLHttpRequest();
	req.open('GET', url, false);
	req.overrideMimeType('text/plain; charset=x-user-defined');
	req.send(null);
	//  alert(req.status);
	if (req.status != 200) return '';
	return req.responseText;
}

function initShaders(gl, vertex_url, fragment_url)
{
	var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	var vertexShader = gl.createShader(gl.VERTEX_SHADER);

	var src = load_resource(vertex_url);
	gl.shaderSource(vertexShader, src);
	gl.compileShader(vertexShader);

	if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
	{
		alert("Compiling VS"+ src + "\n ------------ \n" + gl.getShaderInfoLog(vertexShader));
		return null;
	}

	src = load_resource(fragment_url);

	gl.shaderSource(fragmentShader, src);
	gl.compileShader(fragmentShader);

	if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))
	{
		alert("Compiling FS"+ src + "\n ------------ \n" + gl.getShaderInfoLog(fragmentShader));
		return null;
	}

	var shaderProgram = gl.createProgram();

	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Linking " + vertex_url + "+"+ fragment_url + "\n ------------ \n" + gl.getProgramInfoLog(shaderProgram));
	}

	gl.useProgram(shaderProgram);

	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	alert(vertex_url + ":" + shaderProgram.vertexPositionAttribute);
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

	shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
	gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	//shaderProgram.imat = gl.getUniformLocation(shaderProgram, "imat");
	//shaderProgram.ipmat = gl.getUniformLocation(shaderProgram, "ipmat");

	return shaderProgram
}

function cubeBuffer(gl)
{
	var cube = new Object();
	cube.VertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cube.VertexPositionBuffer);
	var vertices = [
		// Front face
		0.0, 0.0, 1.0,
		1.0, 0.0, 1.0,
		1.0, 1.0, 1.0,
		0.0, 1.0, 1.0,

		// Back face
		0.0, 0.0, 0.0,
		0.0, 1.0, 0.0,
		1.0, 1.0, 0.0,
		1.0, 0.0, 0.0,

		// Top face
		0.0,  1.0, 0.0,
		0.0,  1.0, 1.0,
		1.0,  1.0, 1.0,
		1.0,  1.0, 0.0,

		// Bottom face
		0.0, 0.0, 0.0,
		1.0, 0.0, 0.0,
		1.0, 0.0, 1.0,
		0.0, 0.0, 1.0,

		// Right face
		1.0, 0.0, 0.0,
		1.0, 1.0, 0.0,
		1.0, 1.0, 1.0,
		1.0, 0.0, 1.0,

		// Left face
		0.0, 0.0, 0.0,
		0.0, 0.0, 1.0,
		0.0, 1.0, 1.0,
		0.0, 1.0, 0.0,
	];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	cube.VertexPositionBuffer.itemSize = 3;
	cube.VertexPositionBuffer.numItems = 24;

	cube.VertexColorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cube.VertexColorBuffer);
/*
	var colors = [
	[1.0, 0.0, 0.0, 1.0],     // Front face
	[1.0, 1.0, 0.0, 1.0],     // Back face
	[0.0, 1.0, 0.0, 1.0],     // Top face
	[1.0, 0.5, 0.5, 1.0],     // Bottom face
	[1.0, 0.0, 1.0, 1.0],     // Right face
	[0.0, 0.0, 1.0, 1.0],     // Left face
	];
	var unpackedColors = []
	for (var i in colors) {
		var color = colors[i];
		for (var j=0; j < 4; j++) {
			unpackedColors = unpackedColors.concat(color);
		}
	}
*/
	var colors = [
		// Front face
		0.0, 0.0, 1.0, 1.0,
		1.0, 0.0, 1.0, 1.0,
		1.0, 1.0, 1.0, 1.0,
		0.0, 1.0, 1.0, 1.0,

		// Back face
		0.0, 0.0, 0.0, 1.0,
		0.0, 1.0, 0.0, 1.0,
		1.0, 1.0, 0.0, 1.0,
		1.0, 0.0, 0.0, 1.0,

		// Top face
		0.0, 1.0, 0.0, 1.0,
		0.0, 1.0, 1.0, 1.0,
		1.0, 1.0, 1.0, 1.0,
		1.0, 1.0, 0.0, 1.0,

		// Bottom face
		0.0, 0.0, 0.0, 1.0,
		1.0, 0.0, 0.0, 1.0,
		1.0, 0.0, 1.0, 1.0,
		0.0, 0.0, 1.0, 1.0,

		// Right face
		1.0, 0.0, 0.0, 1.0,
		1.0, 1.0, 0.0, 1.0,
		1.0, 1.0, 1.0, 1.0,
		1.0, 0.0, 1.0, 1.0,

		// Left face
		0.0, 0.0, 0.0, 1.0,
		0.0, 0.0, 1.0, 1.0,
		0.0, 1.0, 1.0, 1.0,
		0.0, 1.0, 0.0, 1.0
	];

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
	//gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
	cube.VertexColorBuffer.itemSize = 4;
	cube.VertexColorBuffer.numItems = 24;

	cube.VertexIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cube.VertexIndexBuffer);
	var VertexIndices = [
	0, 1, 2,      0, 2, 3,    // Front face
	4, 5, 6,      4, 6, 7,    // Back face
	8, 9, 10,     8, 10, 11,  // Top face
	12, 13, 14,   12, 14, 15, // Bottom face
	16, 17, 18,   16, 18, 19, // Right face
	20, 21, 22,   20, 22, 23  // Left face
	]
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(VertexIndices), gl.STATIC_DRAW);
	cube.VertexIndexBuffer.itemSize = 1;
	cube.VertexIndexBuffer.numItems = 36;

	return cube;
}

function setMatrixUniforms(gl)
{
	gl.uniformMatrix4fv(gl.shaderProgram.pMatrixUniform, false, new Float32Array(pMatrix.flatten()));
	gl.uniformMatrix4fv(gl.shaderProgram.mvMatrixUniform, false, new Float32Array(mvMatrix.flatten()));
	//gl.uniformMatrix4fv(gl.shaderProgram.imat, false, new Float32Array(pMatrix.x(mvMatrix).inverse().flatten()));
	//gl.uniformMatrix4fv(gl.shaderProgram.ipmat, false, new Float32Array(pMatrix.inverse().flatten()));
}

var zoom=2.0;


function drawCube(gl,cube)
{
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

	perspective(45.0, 1.0, 0.1, 100.0);
	loadIdentity();

	mvTranslate([0.0, 0.0, -zoom])
	mvPushMatrix();
	multMatrix(objectRotationMatrix);
	mvTranslate([-0.5, -0.5, -0.5])
	gl.bindBuffer(gl.ARRAY_BUFFER, cube.VertexPositionBuffer);
	gl.vertexAttribPointer(gl.shaderProgram.vertexPositionAttribute, cube.VertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, cube.VertexColorBuffer);
	gl.vertexAttribPointer(gl.shaderProgram.vertexColorAttribute, cube.VertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cube.VertexIndexBuffer);
	setMatrixUniforms(gl);
	gl.drawElements(gl.TRIANGLES, cube.VertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

	mvPopMatrix();
}


function initFBO(gl, width, height)
{
	var fbo = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);

	fbo.depthbuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER,fbo.depthbuffer);

    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);

	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, fbo.depthbuffer);

	fbo.tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, fbo.tex);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(width*height*4));

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fbo.tex, 0);

	switch(gl.checkFramebufferStatus(gl.FRAMEBUFFER))
	{
		case gl.FRAMEBUFFER_COMPLETE:
			//alert("Framebuffer OK");
		break;
		case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
			alert("Framebuffer incomplete attachment");
		break;
		case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
			alert("Framebuffer incomplete missing attachment");
		break;
		case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
			alert("Framebuffer incomplete dimensions");
		break;
		case gl.FRAMEBUFFER_UNSUPPORTED:
			alert("Framebuffer unsuported");
		break;
	}
	return fbo
}

function handleLoadedTexture(gl,image, texture)
{
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.bindTexture(gl.TEXTURE_2D, null);
}


function initTexture(gl)
{
	gl.tf_tex = gl.createTexture();
	gl.tf_img = new Image();
	gl.tf_img.onload = function()
	{
		handleLoadedTexture(gl, gl.tf_img, gl.tf_tex);
	}
	gl.tf_img.src = "./tf11.png";


	gl.vol_tex = gl.createTexture();
	gl.vol_img = new Image();
	var t0 = new Date().getTime();
	gl.vol_img.onload = function()
	{
		handleLoadedTexture(gl,gl.vol_img,gl.vol_tex)
		//alert("Volume Data Loaded "+(new Date()-t0));
		setTimeout(tick, 1);
	}
	gl.vol_img.src = "./aorta2.jpg";

}

var tick;

function volumerc_main()
{
	var canvas = document.getElementById("canvas_win");
	var gl = initWebGL(canvas);//, {premultipliedAlpha:true,alpha:true});

	gl.shaderProgram_BackCoord = initShaders(gl,'./simple.vert?x'+Math.random(),'./simple.frag?x'+Math.random());
	gl.shaderProgram_RayCast = initShaders(gl,'./raycast.vert?d'+Math.random(),'./raycast.frag?x='+Math.random());
	

	gl.fboBackCoord = initFBO(gl, canvas.width, canvas.height);
	initTexture(gl);

	var cube = cubeBuffer(gl);

	canvas.onmousedown = handleMouseDown;
	//document.onmousewheel = handleWheelMove;
	document.onmouseup = handleMouseUp;
	document.onmousemove = handleMouseMove;
	window.addEventListener('mousewheel', handleMouseRoll, false)/*Chrome*/||window.addEventListener('DOMMouseScroll', handleMouseRoll, false) ; //Firefox

	
	canvas.addEventListener("touchstart",handleTouchStop,false);
	window.addEventListener("touchend",handleTouchStart,false);
	window.addEventListener("touchmove",handleTouchMove,false);
	
	


	tick = function()
	{
		gl.clearColor(0.0, 0.0, 0.0, 0.0);
		gl.enable(gl.DEPTH_TEST);

		gl.bindFramebuffer(gl.FRAMEBUFFER, gl.fboBackCoord);
		gl.shaderProgram = gl.shaderProgram_BackCoord;
		gl.useProgram(gl.shaderProgram);
		gl.clearDepth(-50.0);
		gl.depthFunc(gl.GEQUAL);
		drawCube(gl,cube);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.shaderProgram = gl.shaderProgram_RayCast;
		gl.useProgram(gl.shaderProgram);
		gl.clearDepth(50.0);
		gl.depthFunc(gl.LEQUAL);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, gl.fboBackCoord.tex);

		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, gl.vol_tex);

		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, gl.tf_tex);

		gl.uniform1i(gl.getUniformLocation(gl.shaderProgram, "uBackCoord"), 0);
		gl.uniform1i(gl.getUniformLocation(gl.shaderProgram, "uVolData"), 1);
		gl.uniform1i(gl.getUniformLocation(gl.shaderProgram, "utransferFunction"), 2);

		//Set Texture
		drawCube(gl,cube);
	}

	setTimeout(tick, 15);
	//setTimeout(rotation, 10);
	//setInterval(tick,100);
	
}


var mouseDown = false;
var lastMouseX = null;
var lastMouseY = null;
var mouseZoom = null;

var objectRotationMatrix = Matrix.I(4);

//===================================================================

function handleMouseDown(event) {
	event.preventDefault();

	if (event.altKey){
		mouseZoom = true;
	}else {
		mouseDown = true;
		lastMouseX = event.clientX;
		lastMouseY = event.clientY;
	}

}

function handleMouseUp(event)
{
	//event.preventDefault();
	mouseDown = false;
	mouseZoom = false;
}

function handleMouseRoll(event)
{
	event.preventDefault();
	var roll;
	if (event.detail) {
		roll = event.detail; //Firefox
	} else {
		roll = -0.025*event.wheelDeltaY; //chrome
	}

	zoom += 0.01*roll;
	setTimeout(tick, 1);
}

var delta = 0;
function rotation()
{
	delta += 1.0;
	var newRotationMatrix = createRotationMatrix(90, [1, 0, 0]);
	objectRotationMatrix = newRotationMatrix.x(createRotationMatrix(delta , [0, 0, 1]));
	//objectRotationMatrix = newRotationMatrix;
	setTimeout(rotation, 10);
}


function handleMouseMove(event)
{
  	event.preventDefault();
	
	if (mouseDown == true){
		var newX = event.clientX;
		var newY = event.clientY;		

		var deltaX = newX - lastMouseX
		var newRotationMatrix = createRotationMatrix(deltaX / 10, [0, 1, 0]);

		var deltaY = newY - lastMouseY;
		newRotationMatrix = newRotationMatrix.x(createRotationMatrix(deltaY / 10, [1, 0, 0]));

		objectRotationMatrix = newRotationMatrix.x(objectRotationMatrix);

		lastMouseX = newX
		lastMouseY = newY;
		setTimeout(tick, 1);
	} else if (mouseZoom) {
		var newX = event.clientX;
		var newY = event.clientY;

		var deltaX = newX - lastMouseX;
		var deltaY = newY - lastMouseY;

		zoom -= (deltaX+deltaY)/100,0;

		lastMouseX = newX;
		lastMouseY = newY;
		setTimeout(tick, 1);

	}

	return;
}





//===================================================================

function handleTouchStop(event) {
	event.preventDefault();
	var eventT = event.changedTouches;
	mouseDown = true;
	lastMouseX = eventT[eventT.length-1].clientX;
	lastMouseY = eventT[eventT.length-1].clientY;

}

function handleTouchStart(event)
{
	event.preventDefault();
	mouseDown = false;
	mouseZoom = false;
}

var delta = 0;
function rotation()
{
	delta += 1.0;
	var newRotationMatrix = createRotationMatrix(90, [1, 0, 0]);
	objectRotationMatrix = newRotationMatrix.x(createRotationMatrix(delta , [0, 0, 1]));
	//objectRotationMatrix = newRotationMatrix;
	setTimeout(rotation, 10);
}


function handleTouchMove(event)
{
	event.preventDefault();
	var eventT = event.changedTouches;
	var newX = eventT[eventT.length-1].clientX;
	var newY = eventT[eventT.length-1].clientY;

	var deltaX = newX - lastMouseX
	var newRotationMatrix = createRotationMatrix(deltaX / 10, [0, 1, 0]);

	var deltaY = newY - lastMouseY;
	newRotationMatrix = newRotationMatrix.x(createRotationMatrix(deltaY / 10, [1, 0, 0]));

	objectRotationMatrix = newRotationMatrix.x(objectRotationMatrix);

	lastMouseX = newX
	lastMouseY = newY;
	setTimeout(tick, 1);

	return;
}

//function handleWheelMove(event){
//	alert(event);
//}
