#ifdef GL_ES
precision highp float;
#endif

attribute vec3 aVertexPosition;
attribute vec4 aVertexColor;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

varying vec4 backColor;

void main(void)
{
	vec4 pos = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
	gl_Position = pos;
	backColor = aVertexColor;
}

