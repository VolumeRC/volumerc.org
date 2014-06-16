#ifdef GL_ES
precision highp float;
#endif

attribute vec3 aVertexPosition;
attribute vec4 aVertexColor;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

varying vec4 frontColor;
varying vec4 pos;

void main(void)
{
	pos = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
	gl_Position = pos;
	frontColor = aVertexColor;
}

