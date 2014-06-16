#ifdef GL_ES
precision highp float;
#endif

varying vec4 backColor;

void main(void)
{
	gl_FragColor = backColor;
}

