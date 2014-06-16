/*
	Copyright (c) 2011, Vicomtech
	All rights reserved.

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

//
//  volrenrc.js
//
//  Description:
//      Provides an object for Volume Rendering with Ray Casting in JavaScript.
//
//  Author:
//      John Congote (jcongote@vicomtech.org)
//      Luis Kabongo (lkabongo@vicomtech.org)
//      Vicomtech
//


var uOpacityFactor;
var uLightFactor;

var uOffsetX;
var uOffsetY;
var uOffsetZ;
var uZoomLevel;

// imgData y imgWidth y _imgHeight : de la imagen (no panorama allowed)
// sx, sy, sz  : scale!!!
// of y lf : opacity factor y light factor
function VolRenRC(_gl, _canvas, _imgData, _imgWidth, _imgHeight, sx, sy, sz, oF, lF)
{
	var gl = _gl;
	var canvas = _canvas;
	var imgData = _imgData;
	var imgWidth = _imgWidth;
	var imgHeight = _imgHeight;
	var nSlices = _imgData.length;
	var matrixsize = 1;
//	var opacityFactor = oF;//0.005;
//	var lightFactor = lF;//5.0;

	uOpacityFactor=oF;
	uLightFactor=lF;
	uOffsetX=0.0;
	uOffsetY=0.0;
	uOffsetZ=0.0;
	uZoomLevel=1.0;
	uNumSteps=80.0;
	
	var srcSimpleVert = '#ifdef GL_ES\n'+
		'precision highp float;\n'+
		'#endif\n'+
		'\n'+
		'attribute vec3 aVertexPosition;\n'+
		'attribute vec4 aVertexColor;\n'+
		'\n'+
		'uniform mat4 uMVMatrix;\n'+
		'uniform mat4 uPMatrix;\n'+
		'\n'+
		'varying vec4 backColor;\n'+
		'\n'+
		'void main(void)\n'+
		'{\n'+
		'	vec4 pos = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\n'+
		'	gl_Position = pos;\n'+
		'	backColor = aVertexColor;\n'+
		'}\n';

	var srcSimplFrag =   '#ifdef GL_ES\n'+
		'precision highp float;\n'+
		'#endif\n'+
		'\n'+
		'varying vec4 backColor;\n'+
		'\n'+
		'void main(void)\n'+
		'{\n'+
		'	gl_FragColor = backColor;\n'+
		'}\n';

	var srcRaycastVert = '#ifdef GL_ES\n'+
		'precision highp float;\n'+
		'#endif\n'+
		'\n'+
		'attribute vec3 aVertexPosition;\n'+
		'attribute vec4 aVertexColor;\n'+
		'\n'+
		'uniform mat4 uMVMatrix;\n'+
		'uniform mat4 uPMatrix;\n'+
		'\n'+
		'varying vec4 frontColor;\n'+
		'varying vec4 pos;\n'+
		'\n'+
		'void main(void)\n'+
		'{\n'+
		'	pos = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\n'+
		'	gl_Position = pos;\n'+
		'	frontColor = aVertexColor;\n'+
		'}\n';

	var srcRaycastFrag = '#ifdef GL_ES\n'+
		'precision highp float;\n'+
		'#endif\n'+
		'\n'+
		'varying vec4 frontColor;\n'+
		'varying vec4 pos;\n'+
		'\n'+
		'uniform sampler2D uBackCoord;\n'+
		'uniform sampler2D uVolData;\n'+
		'//uniform sampler2D uTransferFunction;\n'+
		'\n'+
		//~amoreno
		'const float steps = 80.0;\n'+
		//~amoreno
		//amoreno
		//'uniform float steps;\n'+
		//amoreno
		'uniform float numberOfSlices;\n'+
		'uniform float slicesOverX;\n'+
		'uniform float slicesOverY;\n'+
		'uniform float opacityFactor;\n'+
		'uniform float lightFactor;\n'+
		//amoreno
		'uniform vec4 color00;\n'+
		'uniform vec4 color01;\n'+
		'uniform vec4 color02;\n'+
		'uniform vec4 color03;\n'+
		'uniform vec4 color04;\n'+
		'uniform vec4 color05;\n'+
		'uniform vec4 color06;\n'+
		'uniform vec4 color07;\n'+
		'uniform vec4 color08;\n'+
		'uniform vec4 color09;\n'+
		'uniform vec4 color10;\n'+
		'uniform vec4 color11;\n'+
		'uniform vec4 color12;\n'+
		'uniform vec4 color13;\n'+
		'uniform vec4 color14;\n'+
		'uniform vec4 color15;\n'+
		'uniform vec4 color16;\n'+
		'uniform vec4 color17;\n'+
		'uniform float uOffsetX;\n'+
		'uniform float uOffsetY;\n'+
		'uniform float uOffsetZ;\n'+
		'uniform float uZoomLevel;\n'+
		'\n'+
		'vec4 getColorTF(float cc){\n'+
		'	float c = 256.0*cc;\n'+
		'	if (c == 0.0){\n'+
		'		return color00;\n'+
		'	}\n'+
		'	else if (c > 0.0 && c<16.0){\n'+
		'		return color01;\n'+
		'	}\n'+
		'	else if (c >= 16.0 && c<32.0){\n'+
		'		return color02;\n'+
		'	}\n'+
		'	else if (c >= 32.0 && c<48.0){\n'+
		'		return color03;\n'+
		'	}\n'+
		'	else if (c >= 48.0 && c<64.0){\n'+
		'		return color04;\n'+
		'	}\n'+
		'	else if (c >= 64.0 && c<80.0){\n'+
		'		return color05;\n'+
		'	}\n'+
		'	else if (c >= 80.0 && c<96.0){\n'+
		'		return color06;\n'+
		'	}\n'+
		'	else if (c >= 96.0 && c<112.0){\n'+
		'		return color07;\n'+
		'	}\n'+
		'	else if (c >= 112.0 && c<128.0){\n'+
		'		return color08;\n'+
		'	}\n'+
		'	else if (c >= 128.0 && c<144.0){\n'+
		'		return color09;\n'+
		'	}\n'+
		'	else if (c >= 144.0 && c<160.0){\n'+
		'		return color10;\n'+
		'	}\n'+
		'	else if (c >= 160.0 && c<176.0){\n'+
		'		return color11;\n'+
		'	}\n'+
		'	else if (c >= 176.0 && c<192.0){\n'+
		'		return color12;\n'+
		'	}\n'+
		'	else if (c >= 192.0 && c<208.0){\n'+
		'		return color13;\n'+
		'	}\n'+
		'	else if (c >= 208.0 && c<224.0){\n'+
		'		return color14;\n'+
		'	}\n'+
		'	else if (c >= 224.0 && c<240.0){\n'+
		'		return color15;\n'+
		'	}\n'+
		'	else if (c >= 240.0 && c<255.0){\n'+
		'		return color16;\n'+
		'	}\n'+
		'	return color17;\n'+
		'}\n'+
		//amoreno
		'\n'+
		'\n'+
		'vec4 getVolumeValue(vec3 volpos)\n'+
		'{\n'+
		'	float s1,s2;\n'+
		'	float dx1,dy1;\n'+
		'	float dx2,dy2;\n'+
		'\n'+
		'	vec2 texpos1,texpos2;\n'+
		'\n'+
		'	s1 = floor(volpos.z*numberOfSlices);\n'+
		'	s2 = s1+1.0;\n'+
		'\n'+
		'	dx1 = fract(s1/slicesOverX);\n'+
		'	dy1 = floor(s1/slicesOverY)/slicesOverY;\n'+
		'\n'+
		'	dx2 = fract(s2/slicesOverX);\n'+
		'	dy2 = floor(s2/slicesOverY)/slicesOverY;\n'+
		'\n'+
		'	texpos1.x = dx1+(volpos.x/slicesOverX);\n'+
		'	texpos1.y = dy1+(volpos.y/slicesOverY);\n'+
		'\n'+
		'	texpos2.x = dx2+(volpos.x/slicesOverX);\n'+
		'	texpos2.y = dy2+(volpos.y/slicesOverY);\n'+
		'\n'+
		'	return mix( texture2D(uVolData,texpos1), texture2D(uVolData,texpos2), (volpos.z*numberOfSlices)-s1);\n'+
		'}\n'+
		'\n'+
		'void main(void)\n'+
		'{\n'+
		'	vec2 texC = pos.xy/pos.w;\n'+
		'	texC.x = 0.5*texC.x + 0.5;\n'+
		'	texC.y = 0.5*texC.y + 0.5;\n'+
		'\n'+
		'	vec4 backColor = texture2D(uBackCoord,texC);\n'+
		'\n'+
		'	vec3 dir = backColor.rgb - frontColor.rgb;\n'+
		'	vec4 vpos = frontColor;\n'+
		'\n'+
		'  	float cont = 0.0;\n'+
		'\n'+
		'	vec3 Step = dir/steps;\n'+
		'\n'+
		'	vec4 accum  = vec4(0.0, 0.0, 0.0, 0.0);\n'+
		'	vec4 sample = vec4(0.0, 0.0, 0.0, 0.0);\n'+
		'	vec4 value  = vec4(0.0, 0.0, 0.0, 0.0);\n'+
		'	vec4 color  = vec4(0.0, 0.0, 0.0, 0.0);\n'+
		'\n'+
		'	for(float i = 0.0; i < steps; i+=1.0)\n'+
		'	{\n'+
		'\n'+
		//amoreno
		'		vec4 vpos_center=vpos-vec4(0.5, 0.5, 0.5, 0);\n'+
		'		vpos_center=vpos_center*uZoomLevel;\n'+
		'		vpos_center=vpos_center+vec4(0.5, 0.5, 0.5, 0);\n'+
		'		vpos_center=vpos_center+vec4(uOffsetX*uZoomLevel, uOffsetY*uZoomLevel, uOffsetZ*uZoomLevel, 0.0);\n'+
		'		color = getVolumeValue(vpos_center.xyz);\n'+
		'		color = getColorTF(color.x);\n'+
		//amoreno
		//~amoreno
		//'		color = getVolumeValue(vpos.xyz);\n'+
		//~amoreno
		//'		value = vec4(color.rgb,(color.r+color.g+color.b)/3.0);\n'+
		//'		value = vec4(color.rgb,0.9);;\n'+
		'		value = color;\n'+
		'\n'+
		'		// Process the volume sample\n'+
		'		sample.a = value.a * opacityFactor * (1.0/steps);\n'+
		//'		sample.a = value.a * opacityFactor;\n'+
		'		sample.rgb = value.rgb * sample.a * lightFactor;\n'+
		//'		sample.rgb = value.rgb * lightFactor;\n'+
		'\n'+
		'		accum.rgb += (1.0 - accum.a) * sample.rgb;\n'+
		//'		accum.rgb += sample.rgb;\n'+
		'		accum.a += sample.a;\n'+
		'\n'+
		'		//advance the current position\n'+
		'		vpos.xyz += Step;\n'+
		'\n'+
		'		//break if the position is greater than <1, 1, 1>\n'+
        '		if(vpos.x > 1.0 || vpos.y > 1.0 || vpos.z > 1.0 || accum.a>=1.0)\n'+
		'		    break;\n'+
		'	}\n'+
		'\n'+
		//'	gl_FragColor = vec4(0.0,accum.g,0.0,1.0);\n'+
		//'	gl_FragColor = vec4(accum.rgb,1.0);\n'+
		'	gl_FragColor = accum;\n'+
		'}\n';
	

	this.setColors = function (){
		for (i=0;i<18;i++){
			var col=[initColor.colors.components[i].R/255.0,
						initColor.colors.components[i].G/255.0,
						initColor.colors.components[i].B/255.0,
						initColor.colors.components[i].A/255.0];
						
//			var col=[(255.0-initColor.colors.components[i].R)/255.0,
//						(255.0-initColor.colors.components[i].G)/255.0,
//						(255.0-initColor.colors.components[i].B)/255.0,
//						(initColor.colors.components[i].A)/255.0];
			gl.uniform4fv(this.shaderProgram_RayCast.color[i], col);
		}
	};

	//function to get the shaders from an url and compile them
	this.initShaders = function (vertex_src, fragment_src)
	{
		var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		var vertexShader = gl.createShader(gl.VERTEX_SHADER);

		gl.shaderSource(vertexShader, vertex_src);
		gl.compileShader(vertexShader);

		if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
		{
			return null;
		}

		gl.shaderSource(fragmentShader, fragment_src);
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

		//shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
		//shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");

		//amoreno
		var color = new Array();
		color[0] = gl.getUniformLocation(shaderProgram, "color00");
		color[1] = gl.getUniformLocation(shaderProgram, "color01");
		color[2] = gl.getUniformLocation(shaderProgram, "color02");
		color[3] = gl.getUniformLocation(shaderProgram, "color03");
		color[4] = gl.getUniformLocation(shaderProgram, "color04");
		color[5] = gl.getUniformLocation(shaderProgram, "color05");
		color[6] = gl.getUniformLocation(shaderProgram, "color06");
		color[7] = gl.getUniformLocation(shaderProgram, "color07");
		color[8] = gl.getUniformLocation(shaderProgram, "color08");
		color[9] = gl.getUniformLocation(shaderProgram, "color09");
		color[10] = gl.getUniformLocation(shaderProgram, "color10");
		color[11] = gl.getUniformLocation(shaderProgram, "color11");
		color[12] = gl.getUniformLocation(shaderProgram, "color12");
		color[13] = gl.getUniformLocation(shaderProgram, "color13");
		color[14] = gl.getUniformLocation(shaderProgram, "color14");
		color[15] = gl.getUniformLocation(shaderProgram, "color15");
		color[16] = gl.getUniformLocation(shaderProgram, "color16");
		color[17] = gl.getUniformLocation(shaderProgram, "color17");
		shaderProgram.color = color;
		//amoreno
		
		return shaderProgram
	};

	//initializes the Frame Buffer Objects
	this.initFBO = function (width, height)
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
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		return fbo
	};

	//Create a cube in webgl with color vertex for each axis
	this.cubeBuffer = function(sx, sy, sz)
	{
		var cube = new Object();
		cube.VertexPositionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, cube.VertexPositionBuffer);
		var vertices = [
			// Front face
			sx*(-0.5), sy*(-0.5), sz*0.5,
			sx*0.5, sy*(-0.5), sz*0.5,
			sx*0.5, sy*0.5, sz*0.5,
			sx*(-0.5), sy*0.5, sz*0.5,

			// Back face
			sx*(-0.5), sy*(-0.5), sz*(-0.5),
			sx*(-0.5), sy*0.5, sz*(-0.5),
			sx*0.5, sy*0.5, sz*(-0.5),
			sx*0.5, sy*(-0.5), sz*(-0.5),

			// Top face
			sx*(-0.5), sy*0.5, sz*(-0.5),
			sx*(-0.5), sy*0.5, sz*0.5,
			sx*0.5, sy*0.5, sz*0.5,
			sx*0.5, sy*0.5, sz*(-0.5),

			// Bottom face
			sx*(-0.5), sy*(-0.5), sz*(-0.5),
			sx*0.5, sy*(-0.5), sz*(-0.5),
			sx*0.5, sy*(-0.5), sz*0.5,
			sx*(-0.5), sy*(-0.5), sz*0.5,

			// Right face
			sx*0.5, sy*(-0.5), sz*(-0.5),
			sx*0.5, sy*0.5, sz*(-0.5),
			sx*0.5, sy*0.5, sz*0.5,
			sx*0.5, sy*(-0.5), sz*0.5,

			// Left face
			sx*(-0.5), sy*(-0.5), sz*(-0.5),
			sx*(-0.5), sy*(-0.5), sz*0.5,
			sx*(-0.5), sy*0.5, sz*0.5,
			sx*(-0.5), sy*0.5, sz*(-0.5)
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
	};

	//render the cube
	this.drawCube = function (shader, pMatrix, mvMatrix)
	{
		gl.bindBuffer(gl.ARRAY_BUFFER, this.cube.VertexPositionBuffer);
		gl.vertexAttribPointer(shader.vertexPositionAttribute, this.cube.VertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(shader.vertexPositionAttribute);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.cube.VertexColorBuffer);
		gl.vertexAttribPointer(shader.vertexColorAttribute, this.cube.VertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(shader.vertexColorAttribute);
		
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.cube.VertexIndexBuffer);

		gl.uniformMatrix4fv(gl.getUniformLocation(shader, "uPMatrix"), false, new Float32Array(pMatrix.flatten()));
		gl.uniformMatrix4fv(gl.getUniformLocation(shader, "uMVMatrix"), false, new Float32Array(mvMatrix.flatten()));

		gl.drawElements(gl.TRIANGLES, this.cube.VertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
	};

	//read the textures from internet and set the callbacks for the texture creation
	this.initTexture = function (imgs)
	{
		var texture = new Object();
		texture.tex = gl.createTexture();
		texture.imgs = new Array();
		
		//var texturesize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
		var texturesize=4096;
		matrixsize = Math.ceil(Math.sqrt(imgs.length));
		
		patchsize = Math.floor(texturesize/matrixsize);
		
		var i,j,k;
		var sliceCanvas = document.createElement('canvas');
		sliceCanvas.width = texturesize;
		sliceCanvas.height = texturesize;

		var sliceContext = sliceCanvas.getContext('2d');
		sliceContext.rect(0, 0, texturesize, texturesize);
		sliceContext.fillStyle = 'black';
		sliceContext.fill();
		var slicesLoaded = 0;
		for (i=0,k=0;i<matrixsize && k<imgs.length;i++)
		{
			for (j=0;j<matrixsize && k<imgs.length;j++,k++)
			{
				texture.imgs[k] = new Image();								
				texture.imgs[k].onload = (function(gll,ii,jj,kk,ps,img,tex,sContext,sCanvas,maxSlices) { return function()
				{
					sContext.drawImage(img, 0,0,img.width, img.height, jj*ps, ii*ps, ps, ps);					
					console.log('[VRC] Image texture loaded '+ slicesLoaded + ' : ' + img.src);
					slicesLoaded++;
					if (slicesLoaded == maxSlices)
					{
						gll.bindTexture(gll.TEXTURE_2D, tex);
						gll.texImage2D(gll.TEXTURE_2D, 0, gll.RGBA, gll.RGBA, gll.UNSIGNED_BYTE, sCanvas);
						gll.texParameteri(gll.TEXTURE_2D, gll.TEXTURE_WRAP_S, gll.CLAMP_TO_EDGE);
						gll.texParameteri(gll.TEXTURE_2D, gll.TEXTURE_WRAP_T, gll.CLAMP_TO_EDGE);
						gll.texParameteri(gll.TEXTURE_2D, gll.TEXTURE_MAG_FILTER, gll.LINEAR);
						gll.texParameteri(gll.TEXTURE_2D, gll.TEXTURE_MIN_FILTER, gll.LINEAR);
						gll.bindTexture(gll.TEXTURE_2D, null);
						console.log('[VRC] Image texture Finished');
					}
					
				}})(gl,i,j,k,patchsize,texture.imgs[k],texture.tex,sliceContext,sliceCanvas,imgs.length);
				texture.imgs[k].src = imgs[k];
			}			
		}
		
		return texture;
	};

	//draws the volume in the screen
	this.drawVolume = function(pMatrix, mvMatrix)
	{
		//gl.clearColor(0.0, 0.0, 0.0, 0.0);
		gl.enable(gl.DEPTH_TEST);

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboBackCoord);
		gl.useProgram(this.shaderProgram_BackCoord);
		gl.clearDepth(-50.0);		
		gl.depthFunc(gl.GEQUAL);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		this.drawCube(this.shaderProgram_BackCoord, pMatrix, mvMatrix);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.useProgram(this.shaderProgram_RayCast);
		gl.clearDepth(50.0);
		gl.depthFunc(gl.LEQUAL);
				
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.fboBackCoord.tex);
		gl.uniform1i(gl.getUniformLocation(this.shaderProgram_RayCast, "uBackCoord"), 0);
		
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.volTex.tex);
		gl.uniform1i(gl.getUniformLocation(this.shaderProgram_RayCast, "uVolData"), 1);

		gl.uniform1f(gl.getUniformLocation(this.shaderProgram_RayCast, "numberOfSlices"), nSlices);
		gl.uniform1f(gl.getUniformLocation(this.shaderProgram_RayCast, "slicesOverX"), matrixsize);
		gl.uniform1f(gl.getUniformLocation(this.shaderProgram_RayCast, "slicesOverY"), matrixsize);
		
		//~amoreno
		//gl.uniform1f(gl.getUniformLocation(this.shaderProgram_RayCast, "opacityFactor"), opacityFactor);
		//gl.uniform1f(gl.getUniformLocation(this.shaderProgram_RayCast, "lightFactor"), lightFactor);
		//~amoreno
		
		//amoreno
		gl.uniform1f(gl.getUniformLocation(this.shaderProgram_RayCast, "opacityFactor"), uOpacityFactor);
		gl.uniform1f(gl.getUniformLocation(this.shaderProgram_RayCast, "lightFactor"), uLightFactor);
		gl.uniform1f(gl.getUniformLocation(this.shaderProgram_RayCast, "uOffsetX"), uOffsetX);
		gl.uniform1f(gl.getUniformLocation(this.shaderProgram_RayCast, "uOffsetY"), uOffsetY);
		gl.uniform1f(gl.getUniformLocation(this.shaderProgram_RayCast, "uOffsetZ"), uOffsetZ);
		gl.uniform1f(gl.getUniformLocation(this.shaderProgram_RayCast, "uZoomLevel"), uZoomLevel);
		gl.uniform1f(gl.getUniformLocation(this.shaderProgram_RayCast, "steps"), uNumSteps);
		
		setColors(gl);
		//amoreno
		
		//gl.activeTexture(gl.TEXTURE2);
		//gl.bindTexture(gl.TEXTURE_2D, this.tfTex.tex);

		//gl.uniform1i(gl.getUniformLocation(this.shaderProgram_RayCast, "uTransferFunction"), 2);

		//gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		this.drawCube(this.shaderProgram_RayCast, pMatrix, mvMatrix);
		gl.useProgram(null);
	};
	
	
	this.zoom=2.0;
	this.objectRotationMatrix = createRotationMatrix(0, [0, 1, 0]).x(createRotationMatrix(0, [0, 0, 1]));
	this.mouseDown = false;
	this.lastMouseX = null;
	this.lastMouseY = null;
	this.mouseZoom = null;
	/*
	MouseDown callback
	*/
	
	canvas.onmousedown = (function(me){
		return function (event) {
			if (event.altKey){
				me.mouseZoom = true;
			}else {
				me.mouseDown = true;
				me.lastMouseX = event.clientX;
				me.lastMouseY = event.clientY;
			}
		};
	})(this);

	/*
	MouseUp callback
	*/
	canvas.onmouseup =(function(me){
	return function (event)
	{
		me.mouseDown = false;
		me.mouseZoom = false;
	};})(this);

	
	
	/*
	MouseMove callback
	*/
	canvas.onmousemove = (function(me){ 
	return function (event)
	{
		if (me.mouseDown) {
			var newX = event.clientX;
			var newY = event.clientY;

			var deltaX = newX - me.lastMouseX
			var newRotationMatrix = createRotationMatrix(deltaX / 10, [0, 1, 0]);

			var deltaY = newY - me.lastMouseY;
			newRotationMatrix = newRotationMatrix.x(createRotationMatrix(deltaY / 10, [1, 0, 0]));

			me.objectRotationMatrix = newRotationMatrix.x(me.objectRotationMatrix);

			me.lastMouseX = newX
			me.lastMouseY = newY;
			//me.render();

		} else if (me.mouseZoom) {
			var newX = event.clientX;
			var newY = event.clientY;

			var deltaX = newX - lastMouseX;
			var deltaY = newY - lastMouseY;

			me.zoom -= (deltaX+deltaY)/100,0;

			me.lastMouseX = newX;
			me.lastMouseY = newY;
			//me.render();
		}
	}
	
	})(this);

	//canvas.onmousedown = this.handleMouseDown;
	//canvas.onmouseup = this.handleMouseUp;
	//canvas.onmousemove = this.handleMouseMove;
	
	console.log('[VRC] Initializing volume render...');
	this.shaderProgram_BackCoord = this.initShaders(srcSimpleVert,srcSimplFrag);
	console.log('[VRC] simple shader loaded');
	this.shaderProgram_RayCast = this.initShaders(srcRaycastVert,srcRaycastFrag);
	console.log('[VRC] raycast shader loaded');
	
	this.fboBackCoord = this.initFBO(canvas.width, canvas.height);
	console.log('[VRC] frame buffer objects created with size :'+canvas.width+'-'+canvas.height);

	console.log('[VRC] Generating Volume geometry (cube)');
	this.cube = this.cubeBuffer(sx,sy,sz);
	
	console.log('[VRC] Reading volume texture');
	this.volTex = this.initTexture(imgData);
	
	gl.clearColor(1.0, 1.0, 1.0, 0.0);
	gl.enable(gl.DEPTH_TEST);

	this.render;
	
	(function (_gl,_canvas,me){
			var tick = function(){
				window.requestAnimationFrame(tick, _canvas);
				
				_gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);
				perspective(45.0, 1.0, 0.1, 100.0);
				loadIdentity();
				mvTranslate([0.0, 0.0, -me.zoom]);
				mvPushMatrix();
				multMatrix(me.objectRotationMatrix);
				//mvTranslate([-0.5, -0.5, -0.5]);
				me.drawVolume(pMatrix, mvMatrix);
				mvPopMatrix();
			}
			window.requestAnimationFrame(tick, _canvas);
			me.render = tick;
			return tick;
	})(gl,canvas,this);
}

/**
 * Provides requestAnimationFrame in a cross browser
 * way.
 */
if (!window.requestAnimationFrame) {
	window.requestAnimationFrame = (function() {
	  return window.requestAnimationFrame ||
			 window.webkitRequestAnimationFrame ||
			 window.mozRequestAnimationFrame ||
			 window.oRequestAnimationFrame ||
			 window.msRequestAnimationFrame ||
			 function(/* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
			   window.setTimeout(callback, 1000/60);
			 };
	})();
}
