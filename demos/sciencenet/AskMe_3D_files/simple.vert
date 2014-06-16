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

