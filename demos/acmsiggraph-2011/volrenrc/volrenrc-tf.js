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
//  Authors:
//      John Congote (jcongote@vicomtech.org)
//      Luis Kabongo (lkabongo@vicomtech.org)
//


function VolRenRC( _canvas, sx, sy, sz)
{
	var gl = null;
	try {
		gl = _canvas.getContext("webgl", {premultipliedAlpha: false}) || canvas.getContext("experimental-webgl",{premultipliedAlpha: false});
		gl.viewportWidth = _canvas.width;
		gl.viewportHeight = _canvas.height;
	} catch (e) {
	}
	
	if (!gl) {
		alert("Could not initialise WebGL, sorry :-(");
	} else {
		
		var canvas = _canvas;
		//var imgData = null;
		var imgWidth = null;
		var imgHeight = null;
		var nSlices = null;
		var matrixsize = 1;
		this.opacityFactor = 0.05;
		this.lightFactor = 1.0;

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
			'uniform sampler2D uTransferFunction;\n'+
			'\n'+
			'const float steps = 80.0;\n'+
			'uniform float numberOfSlices;\n'+
			'uniform float slicesOverX;\n'+
			'uniform float slicesOverY;\n'+
			'uniform float opacityFactor;\n'+
			'uniform float lightFactor;\n'+
			'uniform bool tfActive;\n'+
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
			'	vec4 accum  = vec4(1.0, 1.0, 1.0, 1.0);\n'+
			'	vec4 sample = vec4(0.0, 0.0, 0.0, 0.0);\n'+
			'	vec4 value  = vec4(0.0, 0.0, 0.0, 0.0);\n'+
			'	vec4 color  = vec4(0.0, 0.0, 0.0, 0.0);\n'+
			'\n'+
			'	for(float i = 0.0; i < steps; i+=1.0)\n'+
			'	{\n'+
			'\n'+
			'		color = getVolumeValue(vpos.xyz);\n'+
			//'		value = vec4(color.rgb,(color.r+color.g+color.b)/3.0);\n'+
			//'		value = vec4(color.rgb,0.9);;\n'+
			//'		if (tfActive){\n'+
			'			value = texture2D(uTransferFunction,vec2(color.r,0.5));\n'+
			//'		} else {\n'+
			//'			value = color;\n'+					
			//'		}\n'+
			'\n'+
			'		// Process the volume sample\n'+
			'		sample.a = value.a * opacityFactor * (1.0/steps);\n'+
			//'		sample.a = value.a * opacityFactor;\n'+
			//'		sample.rgb = value.rgb * sample.a * lightFactor;\n'+
			'		sample.rgb = value.rgb * lightFactor;\n'+
			'\n'+
			'		accum.rgb -= (1.0 - accum.a) * sample.rgb;\n'+
			//'		accum.rgb += sample.rgb;\n'+
			'		accum.a -= sample.a;\n'+
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
		

		//function to get the shaders from an url and compile them
		this.initShaders = function (vertex_src, fragment_src)
		{
			var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
			var vertexShader = gl.createShader(gl.VERTEX_SHADER);

			gl.shaderSource(vertexShader, vertex_src);
			gl.compileShader(vertexShader);

			if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
			{
				console.log("Compiling Vertex Shader\n ------------ \n" + gl.getShaderInfoLog(shader));
				return null;
			}

			gl.shaderSource(fragmentShader, fragment_src);
			gl.compileShader(fragmentShader);

			if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))
			{
				console.log("Compiling Fragment Shader\n ------------ \n" + gl.getShaderInfoLog(shader));
				return null;
			}

			var shaderProgram = gl.createProgram();

			gl.attachShader(shaderProgram, vertexShader);
			gl.attachShader(shaderProgram, fragmentShader);
			gl.linkProgram(shaderProgram);

			if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
				console.log("Linking " + vertex_src + "+"+ fragment_src + "\n ------------ \n" + gl.getProgramInfoLog(shaderProgram));
			}

			gl.useProgram(shaderProgram);

			shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
			gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

			shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
			gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

			//shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
			//shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");

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
				sx*(-1.0), sy*(-1.0), sz*1.0,
				sx*1.0, sy*(-1.0), sz*1.0,
				sx*1.0, sy*1.0, sz*1.0,
				sx*(-1.0), sy*1.0, sz*1.0,

				// Back face
				sx*(-1.0), sy*(-1.0), sz*(-1.0),
				sx*(-1.0), sy*1.0, sz*(-1.0),
				sx*1.0, sy*1.0, sz*(-1.0),
				sx*1.0, sy*(-1.0), sz*(-1.0),

				// Top face
				sx*(-1.0), sy*1.0, sz*(-1.0),
				sx*(-1.0), sy*1.0, sz*1.0,
				sx*1.0, sy*1.0, sz*1.0,
				sx*1.0, sy*1.0, sz*(-1.0),

				// Bottom face
				sx*(-1.0), sy*(-1.0), sz*(-1.0),
				sx*1.0, sy*(-1.0), sz*(-1.0),
				sx*1.0, sy*(-1.0), sz*1.0,
				sx*(-1.0), sy*(-1.0), sz*1.0,

				// Right face
				sx*1.0, sy*(-1.0), sz*(-1.0),
				sx*1.0, sy*1.0, sz*(-1.0),
				sx*1.0, sy*1.0, sz*1.0,
				sx*1.0, sy*(-1.0), sz*1.0,

				// Left face
				sx*(-1.0), sy*(-1.0), sz*(-1.0),
				sx*(-1.0), sy*(-1.0), sz*1.0,
				sx*(-1.0), sy*1.0, sz*1.0,
				sx*(-1.0), sy*1.0, sz*(-1.0),
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

		//init the textures from internet and set the callbacks for the texture creation
		this.initTexture = function ()
		{
			var texture = new Object();
			texture.tex = gl.createTexture();
			texture.imgs = new Array();
			
			return texture;
		};
		
		//reade textures from internet and set the callbacks for the texture creation
		this.readTextureSlices = function (imgs,texturesize,_imgWidth,_imgHeight)
		{
			//var texturesize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
			//var texturesize=4096;
			
			matrixsize = Math.ceil(Math.sqrt(imgs.length));
			var patchsize = Math.floor(texturesize/matrixsize);

			nSlices = imgs.length;
			imgWidth = _imgWidth;
			imgHeight = _imgHeight;

			
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
					this.volTex.imgs[k] = new Image();								
					this.volTex.imgs[k].onload = (function(gll,ii,jj,kk,ps,img,tex,sContext,sCanvas,maxSlices) { return function()
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
							console.log('[VRC] Image texture Slices Finished');
						}
						
					}})(gl,i,j,k,patchsize,this.volTex.imgs[k],this.volTex.tex,sliceContext,sliceCanvas,imgs.length);
					this.volTex.imgs[k].src = imgs[k];
				}			
			}
		}
		
		this.readTextureMosaic = function(imgs, _matrixsize,_nSlices,_imgWidth,_imgHeight)
		{
			matrixsize = _matrixsize;
			//patchsize = 256;
			nSlices = _nSlices;
			imgWidth = _imgWidth;
			imgHeight = _imgHeight;
		
			this.volTex.imgs[0] = new Image();
			this.volTex.imgs[0].onload = (function(gll,img,tex){ return function()
			{
				gll.bindTexture(gll.TEXTURE_2D, tex);
				gll.texImage2D(gll.TEXTURE_2D, 0, gll.RGBA, gll.RGBA, gll.UNSIGNED_BYTE, img);
				gll.texParameteri(gll.TEXTURE_2D, gll.TEXTURE_WRAP_S, gll.CLAMP_TO_EDGE);
				gll.texParameteri(gll.TEXTURE_2D, gll.TEXTURE_WRAP_T, gll.CLAMP_TO_EDGE);
				gll.texParameteri(gll.TEXTURE_2D, gll.TEXTURE_MAG_FILTER, gll.LINEAR);
				gll.texParameteri(gll.TEXTURE_2D, gll.TEXTURE_MIN_FILTER, gll.LINEAR);
				gll.bindTexture(gll.TEXTURE_2D, null);
				console.log('[VRC] Image texture Mosaic Finished');				
			}})(gl, this.volTex.imgs[0], this.volTex.tex);
			this.volTex.imgs[0].src = imgs[0];
		}
		
		this.read1DTransferFunction = function(imgs)
		{
			this.tf.img = new Image();
			this.tf.img.onload = (function(gll,img,tex){ return function()
			{
				gll.bindTexture(gll.TEXTURE_2D, tex);
				gll.texImage2D(gll.TEXTURE_2D, 0, gll.RGBA, gll.RGBA, gll.UNSIGNED_BYTE, img);
				gll.texParameteri(gll.TEXTURE_2D, gll.TEXTURE_WRAP_S, gll.CLAMP_TO_EDGE);
				gll.texParameteri(gll.TEXTURE_2D, gll.TEXTURE_WRAP_T, gll.CLAMP_TO_EDGE);
				gll.texParameteri(gll.TEXTURE_2D, gll.TEXTURE_MAG_FILTER, gll.LINEAR);
				gll.texParameteri(gll.TEXTURE_2D, gll.TEXTURE_MIN_FILTER, gll.LINEAR);
				gll.bindTexture(gll.TEXTURE_2D, null);
				
				console.log('[VRC] Image texture Mosaic Finished');				
			}})(gl, this.tf.img, this.tf.tex);
			this.tf.img.src = imgs;	
			this.tf.active = true;			
		}

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
			gl.uniform1f(gl.getUniformLocation(this.shaderProgram_RayCast, "opacityFactor"), this.opacityFactor);
			gl.uniform1f(gl.getUniformLocation(this.shaderProgram_RayCast, "lightFactor"), this.lightFactor);
			gl.uniform1f(gl.getUniformLocation(this.shaderProgram_RayCast, "tfActive"), this.tf.active);
			
			if (this.tf.active)
			{
				gl.activeTexture(gl.TEXTURE2);
				gl.bindTexture(gl.TEXTURE_2D, this.tf.tex);
				gl.uniform1i(gl.getUniformLocation(this.shaderProgram_RayCast, "uTransferFunction"), 2);
			}
			//gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			this.drawCube(this.shaderProgram_RayCast, pMatrix, mvMatrix);
			gl.useProgram(null);
		};
		
		
		this.zoom=4.0;
		//this.objectRotationMatrix = createRotationMatrix(-90, [0, 1, 0]).x(createRotationMatrix(180, [0, 0, 1])).x(createRotationMatrix(0, [1, 0, 0]));
		
		this.objectRotationMatrix = createRotationMatrix(0, [0, 1, 0]).x(createRotationMatrix(0, [0, 0, 1])).x(createRotationMatrix(90, [1, 0, 0]));

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
		
		console.log('[VRC] Creating volume texture');
		this.volTex = this.initTexture();

		console.log('[VRC] Creating Transfer Function texture');
		this.tf = this.initTexture();
		this.tf.active = false;

		
		//console.log('[VRC] Reading volume texture');
		//if (imgData)
		//this.readTexture(imgData);
		
		gl.clearColor(1.0, 1.0, 1.0, 0.0);
		gl.enable(gl.DEPTH_TEST);

		this.render;
		this.animLoopRot = 0.47;
		this.animLoop = 	(function(me){var loop = function(){
				var newRotationMatrix = createRotationMatrix(me.animLoopRot, [0, 1, 0]);
				me.objectRotationMatrix = newRotationMatrix.x(me.objectRotationMatrix);
			}
			setInterval(loop,1000/60);
			return loop;
		})(this);
		
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
