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
//  volumerc.js
//
//  Description:
//      Provides an object for rendering Volume data 
//      in JavaScript.
//
//  Author:
//      John Congote (jcongote@vicomtech.org)
//      Vicomtech
//

function VolumeRC(gl, canvas, imgData, imgWidth, imgHeight, sx, sy, sz)
{
	this.gl = gl;
	this.canvas = canvas;
	this.imgData = imgData;
	this.imgWidth = imgWidth;
	this.imgHeight = imgHeight;
	this.nSlices = imgData.length;
	this.matrixsize = 1;
	this.opacityFactor = 15.0;
	this.lightFactor = 10.0;

	this.srcSimpleVert = '#ifdef GL_ES\n'+
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

	this.srcSimplFrag =   '#ifdef GL_ES\n'+
		'precision highp float;\n'+
		'#endif\n'+
		'\n'+
		'varying vec4 backColor;\n'+
		'\n'+
		'void main(void)\n'+
		'{\n'+
		'	gl_FragColor = backColor;\n'+
		'}\n';

	this.srcRaycastVert = '#ifdef GL_ES\n'+
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

	this.srcRaycastFrag = '#ifdef GL_ES\n'+
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
		'const float steps = 50.0;\n'+
		'uniform float numberOfSlices;\n'+
		'uniform float slicesOverX;\n'+
		'uniform float slicesOverY;\n'+
		'uniform float opacityFactor;\n'+
		'uniform float lightFactor;\n'+
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
		'\n'+
		'	for(float i = 0.0; i < steps; i+=1.0)\n'+
		'	{\n'+
		'\n'+
		'		vec4 color = getVolumeValue(vpos.xyz);\n'+
		'		value = vec4(color.rgb,(color.r+color.g+color.b)/3.0);\n'+
		'\n'+
		'		// Process the volume sample\n'+
		'		sample.a = value.a * opacityFactor * (1.0/steps);\n'+
		'		sample.rgb = value.rgb * sample.a * lightFactor;\n'+
		'\n'+
		'		accum.rgb += (1.0 - accum.a) * sample.rgb;\n'+
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
		'	gl_FragColor = vec4(accum.rgb,1.0);\n'+
		'}\n';
	

	//function to get the shaders from an url and compile them
	this.initShaders = function (vertex_src, fragment_src)
	{
		var fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
		var vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);

		this.gl.shaderSource(vertexShader, vertex_src);
		this.gl.compileShader(vertexShader);

		if (!this.gl.getShaderParameter(vertexShader, this.gl.COMPILE_STATUS))
		{
			return null;
		}

		this.gl.shaderSource(fragmentShader, fragment_src);
		this.gl.compileShader(fragmentShader);

		if (!this.gl.getShaderParameter(fragmentShader, this.gl.COMPILE_STATUS))
		{
			return null;
		}

		var shaderProgram = this.gl.createProgram();

		this.gl.attachShader(shaderProgram, vertexShader);
		this.gl.attachShader(shaderProgram, fragmentShader);
		this.gl.linkProgram(shaderProgram);

		if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
			alert("Linking " + vertex_url + "+"+ fragment_url + "\n ------------ \n" + this.gl.getProgramInfoLog(shaderProgram));
		}

		this.gl.useProgram(shaderProgram);

		shaderProgram.vertexPositionAttribute = this.gl.getAttribLocation(shaderProgram, "aVertexPosition");
		this.gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

		shaderProgram.vertexColorAttribute = this.gl.getAttribLocation(shaderProgram, "aVertexColor");
		this.gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

		//shaderProgram.pMatrixUniform = this.gl.getUniformLocation(shaderProgram, "uPMatrix");
		//shaderProgram.mvMatrixUniform = this.gl.getUniformLocation(shaderProgram, "uMVMatrix");

		return shaderProgram
	};

	//initializes the Frame Buffer Objects
	this.initFBO = function (width, height)
	{
		var fbo = this.gl.createFramebuffer();
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,fbo);

		fbo.depthbuffer = this.gl.createRenderbuffer();
		this.gl.bindRenderbuffer(this.gl.RENDERBUFFER,fbo.depthbuffer);

		this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, width, height);

		this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, fbo.depthbuffer);

		fbo.tex = this.gl.createTexture();
		this.gl.bindTexture(this.gl.TEXTURE_2D, fbo.tex);
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, new Uint8Array(width*height*4));

		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);

		this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, fbo.tex, 0);
		
		switch(this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER))
		{
			case this.gl.FRAMEBUFFER_COMPLETE:
				//alert("Framebuffer OK");
			break;
			case this.gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
				alert("Framebuffer incomplete attachment");
			break;
			case this.gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
				alert("Framebuffer incomplete missing attachment");
			break;
			case this.gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
				alert("Framebuffer incomplete dimensions");
			break;
			case this.gl.FRAMEBUFFER_UNSUPPORTED:
				alert("Framebuffer unsuported");
			break;
		}
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
		return fbo
	};

	//Create a cube in webgl with color vertex for each axis
	this.cubeBuffer = function(sx, sy, sz)
	{
		var cube = new Object();
		cube.VertexPositionBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, cube.VertexPositionBuffer);
		var vertices = [
			// Front face
			sx*0.0, sy*0.0, sz*1.0,
			sx*1.0, sy*0.0, sz*1.0,
			sx*1.0, sy*1.0, sz*1.0,
			sx*0.0, sy*1.0, sz*1.0,

			// Back face
			sx*0.0, sy*0.0, sz*0.0,
			sx*0.0, sy*1.0, sz*0.0,
			sx*1.0, sy*1.0, sz*0.0,
			sx*1.0, sy*0.0, sz*0.0,

			// Top face
			sx*0.0, sy*1.0, sz*0.0,
			sx*0.0, sy*1.0, sz*1.0,
			sx*1.0, sy*1.0, sz*1.0,
			sx*1.0, sy*1.0, sz*0.0,

			// Bottom face
			sx*0.0, sy*0.0, sz*0.0,
			sx*1.0, sy*0.0, sz*0.0,
			sx*1.0, sy*0.0, sz*1.0,
			sx*0.0, sy*0.0, sz*1.0,

			// Right face
			sx*1.0, sy*0.0, sz*0.0,
			sx*1.0, sy*1.0, sz*0.0,
			sx*1.0, sy*1.0, sz*1.0,
			sx*1.0, sy*0.0, sz*1.0,

			// Left face
			sx*0.0, sy*0.0, sz*0.0,
			sx*0.0, sy*0.0, sz*1.0,
			sx*0.0, sy*1.0, sz*1.0,
			sx*0.0, sy*1.0, sz*0.0,
		];
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
		cube.VertexPositionBuffer.itemSize = 3;
		cube.VertexPositionBuffer.numItems = 24;

		cube.VertexColorBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, cube.VertexColorBuffer);

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

		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);
		cube.VertexColorBuffer.itemSize = 4;
		cube.VertexColorBuffer.numItems = 24;

		cube.VertexIndexBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, cube.VertexIndexBuffer);
		var VertexIndices = [
		0, 1, 2,      0, 2, 3,    // Front face
		4, 5, 6,      4, 6, 7,    // Back face
		8, 9, 10,     8, 10, 11,  // Top face
		12, 13, 14,   12, 14, 15, // Bottom face
		16, 17, 18,   16, 18, 19, // Right face
		20, 21, 22,   20, 22, 23  // Left face
		]
		this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(VertexIndices), this.gl.STATIC_DRAW);
		cube.VertexIndexBuffer.itemSize = 1;
		cube.VertexIndexBuffer.numItems = 36;

		return cube;
	};

	//render the cube
	this.drawCube = function (shader, pMatrix, mvMatrix)
	{
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cube.VertexPositionBuffer);
		this.gl.vertexAttribPointer(shader.vertexPositionAttribute, this.cube.VertexPositionBuffer.itemSize, this.gl.FLOAT, false, 0, 0);
		this.gl.enableVertexAttribArray(shader.vertexPositionAttribute);
		
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cube.VertexColorBuffer);
		this.gl.vertexAttribPointer(shader.vertexColorAttribute, this.cube.VertexColorBuffer.itemSize, this.gl.FLOAT, false, 0, 0);
		this.gl.enableVertexAttribArray(shader.vertexColorAttribute);
		
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.cube.VertexIndexBuffer);

		this.gl.uniformMatrix4fv(this.gl.getUniformLocation(shader, "uPMatrix"), false, new Float32Array(pMatrix.flatten()));
		this.gl.uniformMatrix4fv(this.gl.getUniformLocation(shader, "uMVMatrix"), false, new Float32Array(mvMatrix.flatten()));

		this.gl.drawElements(this.gl.TRIANGLES, this.cube.VertexIndexBuffer.numItems, this.gl.UNSIGNED_SHORT, 0);
	};

	//read the textures from internet and set the callbacks for the texture creation
	this.initTexture = function (imgs)
	{
		var texture = new Object();
		texture.tex = this.gl.createTexture();
		texture.imgs = new Array();
		
		//var texturesize = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE);
		var texturesize=4096;
		this.matrixsize = Math.ceil(Math.sqrt(imgs.length));
		
		patchsize = Math.floor(texturesize/this.matrixsize);
		
		var i,j,k;
		var sliceCanvas = document.createElement('canvas');
		sliceCanvas.width = texturesize;
		sliceCanvas.height = texturesize;

		var sliceContext = sliceCanvas.getContext('2d');
		sliceContext.rect(0, 0, texturesize, texturesize);
		sliceContext.fillStyle = 'black';
		sliceContext.fill();
		var slicesLoaded = 0;
		for (i=0,k=0;i<this.matrixsize && k<imgs.length;i++)
		{
			for (j=0;j<this.matrixsize && k<imgs.length;j++,k++)
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
					
				}})(this.gl,i,j,k,patchsize,texture.imgs[k],texture.tex,sliceContext,sliceCanvas,imgs.length);
				texture.imgs[k].src = imgs[k];
			}			
		}
		
		return texture;
	};

	//draws the volume in the screen
	this.drawVolume = function(pMatrix, mvMatrix)
	{
		this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
		this.gl.enable(this.gl.DEPTH_TEST);

		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fboBackCoord);
		this.gl.useProgram(this.shaderProgram_BackCoord);
		this.gl.clearDepth(-50.0);		
		this.gl.depthFunc(this.gl.GEQUAL);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

		this.drawCube(this.shaderProgram_BackCoord, pMatrix, mvMatrix);

		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
		this.gl.useProgram(this.shaderProgram_RayCast);
		this.gl.clearDepth(50.0);
		this.gl.depthFunc(this.gl.LEQUAL);
				
		this.gl.activeTexture(this.gl.TEXTURE0);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.fboBackCoord.tex);
		this.gl.uniform1i(this.gl.getUniformLocation(this.shaderProgram_RayCast, "uBackCoord"), 0);
		
		this.gl.activeTexture(this.gl.TEXTURE1);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.volTex.tex);
		this.gl.uniform1i(this.gl.getUniformLocation(this.shaderProgram_RayCast, "uVolData"), 1);

		this.gl.uniform1f(this.gl.getUniformLocation(this.shaderProgram_RayCast, "numberOfSlices"), this.nSlices);
		this.gl.uniform1f(this.gl.getUniformLocation(this.shaderProgram_RayCast, "slicesOverX"), this.matrixsize);
		this.gl.uniform1f(this.gl.getUniformLocation(this.shaderProgram_RayCast, "slicesOverY"), this.matrixsize);
		this.gl.uniform1f(this.gl.getUniformLocation(this.shaderProgram_RayCast, "opacityFactor"), this.opacityFactor);
		this.gl.uniform1f(this.gl.getUniformLocation(this.shaderProgram_RayCast, "lightFactor"), this.lightFactor);
		
		//this.gl.activeTexture(this.gl.TEXTURE2);
		//this.gl.bindTexture(this.gl.TEXTURE_2D, this.tfTex.tex);

		//this.gl.uniform1i(this.gl.getUniformLocation(this.shaderProgram_RayCast, "uTransferFunction"), 2);

		//this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
		this.drawCube(this.shaderProgram_RayCast, pMatrix, mvMatrix);
		this.gl.useProgram(null);
	};
	
	console.log('[VRC] Initializing volume render...');
	this.shaderProgram_BackCoord = this.initShaders(this.srcSimpleVert,this.srcSimplFrag);
	console.log('[VRC] simple shader loaded');
	this.shaderProgram_RayCast = this.initShaders(this.srcRaycastVert,this.srcRaycastFrag);
	console.log('[VRC] raycast shader loaded');
	
	this.fboBackCoord = this.initFBO(this.canvas.width, this.canvas.height);
	console.log('[VRC] frame buffer objects created with size :'+this.canvas.width+'-'+this.canvas.height);

	console.log('[VRC] Generating Volume geometry (cube)');
	this.cube = this.cubeBuffer(sx,sy,sz);
	
	console.log('[VRC] Reading volume texture');
	this.volTex = this.initTexture(imgData);
}