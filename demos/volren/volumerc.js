/*
	Copyright 2011 Vicomtech

	Licensed under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at

	http://www.apache.org/licenses/LICENSE-2.0

	Unless required by applicable law or agreed to in writing, software
	distributed under the License is distributed on an "AS IS" BASIS,
	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	See the License for the specific language governing permissions and
	limitations under the License.
*/

/*
GLobal variables
*/

/*
Zoom factor
*/
var zoom=2.0;

/*
*/
var drawVolume;

/*
Mouse Positions
*/
var mouseDown = false;
var lastMouseX = null;
var lastMouseY = null;
var mouseZoom = null;


/*
Matrix which rotates the cube
*/
var objectRotationMatrix = createRotationMatrix(90, [1, 0, 0]).x(createRotationMatrix(180, [0, 0, 1]));


/*
load_resource

get a document from a web direction
*/
function load_resource(url) {
	var req = new XMLHttpRequest();
	req.open('GET', url, false);
	req.overrideMimeType('text/plain; charset=x-user-defined');
	req.send(null);

	if (req.status != 200) return '';
	return req.responseText;
}


/*
initShaders

function to get the shaders from an url and compile them
*/
function initShaders(gl, vertex_url, fragment_url)
{
	var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	var vertexShader = gl.createShader(gl.VERTEX_SHADER);

	var src = load_resource(vertex_url);
	gl.shaderSource(vertexShader, src);
	gl.compileShader(vertexShader);

	if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
	{
		return null;
	}

	src = load_resource(fragment_url);

	gl.shaderSource(fragmentShader, src);
	gl.compileShader(fragmentShader);

	if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))
	{
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
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

	shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
	gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");

	return shaderProgram
}


/*
cubeBuffer

Create a cube in webgl with color vertex for each axis
*/
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

/*
setMatrixUniforms
	
define the model matrix and projection matrix for the model
*/
function setMatrixUniforms(gl)
{
	gl.uniformMatrix4fv(gl.shaderProgram.pMatrixUniform, false, new Float32Array(pMatrix.flatten()));
	gl.uniformMatrix4fv(gl.shaderProgram.mvMatrixUniform, false, new Float32Array(mvMatrix.flatten()));
}

/*
drawCube

render the cube
*/
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

/*
initFBO

initializes the Frame Buffer Objects
*/
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

/*
handleLoadedTexture

Create a texture from an image
*/
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

/*
initTexture

read the textures from internet and set the callbacks for the texture creation
*/
function initTexture(gl, imgData, imgTF)
{
	gl.tf_tex = gl.createTexture();
	gl.tf_img = new Image();
	gl.tf_img.onload = function()
	{
		handleLoadedTexture(gl, gl.tf_img, gl.tf_tex);
	}
	gl.tf_img.src = imgTF;


	gl.vol_tex = gl.createTexture();
	gl.vol_img = new Image();
	gl.vol_img.onload = function()
	{
		handleLoadedTexture(gl,gl.vol_img,gl.vol_tex)
		setTimeout(drawVolume, 1);
	}
	gl.vol_img.src = imgData;
	//gl.vol_img.src = "./skull.png";
	//gl.vol_img.src = "./engine.png";
}

/*
main function
*/
function volumerc_main(rayfrag, imgData, imgTF)
{
	var canvas = document.getElementById("canvas_win");
	var gl;
	
	try {
		gl = canvas.getContext("webgl", {premultipliedAlpha: false}) || canvas.getContext("experimental-webgl",{premultipliedAlpha: false});
	} catch (e) {
	}
	if (!gl) {
		alert("Could not initialise WebGL, sorry :-(");
	}	

	gl.shaderProgram_BackCoord = initShaders(gl,'./simple.vert','./simple.frag');
	gl.shaderProgram_RayCast = initShaders(gl,'./raycast.vert',rayfrag, imgData, imgTF);
	
	gl.fboBackCoord = initFBO(gl, canvas.width, canvas.height);
	initTexture(gl, imgData, imgTF);

	var cube = cubeBuffer(gl);

	canvas.onmousedown = handleMouseDown;
	document.onmouseup = handleMouseUp;
	document.onmousemove = handleMouseMove;


	drawVolume = function()
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
		gl.uniform1i(gl.getUniformLocation(gl.shaderProgram, "uTransferFunction"), 2);

		//Set Texture
		drawCube(gl,cube);
	}

	setTimeout(drawVolume, 15);
}

/*
MouseDown callback
*/
function handleMouseDown(event) {
	if (event.altKey){
		mouseZoom = true;
	}else {
		mouseDown = true;
		lastMouseX = event.clientX;
		lastMouseY = event.clientY;
	}
}
/*
MouseUp callback
*/
function handleMouseUp(event)
{
	mouseDown = false;
	mouseZoom = false;
}

/*
MouseMove callback
*/
function handleMouseMove(event)
{
	if (mouseDown) {
		var newX = event.clientX;
		var newY = event.clientY;

		var deltaX = newX - lastMouseX
		var newRotationMatrix = createRotationMatrix(deltaX / 10, [0, 1, 0]);

		var deltaY = newY - lastMouseY;
		newRotationMatrix = newRotationMatrix.x(createRotationMatrix(deltaY / 10, [1, 0, 0]));

		objectRotationMatrix = newRotationMatrix.x(objectRotationMatrix);

		lastMouseX = newX
		lastMouseY = newY;
		setTimeout(drawVolume, 1);

	} else if (mouseZoom) {
		var newX = event.clientX;
		var newY = event.clientY;

		var deltaX = newX - lastMouseX;
		var deltaY = newY - lastMouseY;

		zoom -= (deltaX+deltaY)/100,0;

		lastMouseX = newX;
		lastMouseY = newY;
		setTimeout(drawVolume, 1);

	}
	return;
}


