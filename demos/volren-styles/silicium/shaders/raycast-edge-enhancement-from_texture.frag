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

varying vec4 frontColor;
varying vec4 pos;

uniform sampler2D uBackCoord;
uniform sampler2D uVolData;
uniform sampler2D uTransferFunction;
uniform sampler2D uGradient; 

//Edge enhacement options 
//To calculate the camera position
uniform mat4 uInvMVMatrix;
uniform float uGradientThreshold; //[0,pi]
uniform vec3 uEdgeColor; //[[0,1],..]

//Defined constants
const float steps = 80.0;
const float numberOfSlices = 98.0;
const float slicesOverX = 10.0;
const float slicesOverY = 10.0;

/**
* Edge Enhancement Style
* The opacity stays unmodified after the edge enhacenment.
* @param edgeColor The color to use for the edge enhancement
* @param gradientThreshold 
* @param originalColor The base color that will be enhancement
* @param gradient The gradient vector or surface normals
* @param V The camera direction, (normalized)
*/
void EdgeEnhacement(inout vec3 originalColor, vec3 edgeColor, float gradientThreshold, vec3 gradient, vec3 V)
{	
	float angle_dif = abs(dot(gradient,V));
	if (angle_dif<=cos(gradientThreshold)){ //Note: Lookup for why is proudece the '>' change
		originalColor = mix(edgeColor, originalColor, angle_dif);
	}
}

/**
* Gets a voxel's scalar value, given a position on the volume
*
* @param volpos The position inside the volume
* @return An scalar value for the given voxel
*/
float getVolumeValue(vec3 volpos)
{
	float s1,s2;
	float dx1,dy1;
	float dx2,dy2;

	vec2 texpos1,texpos2;

	s1 = floor(volpos.z*numberOfSlices);
	s2 = s1+1.0;

	dx1 = fract(s1/slicesOverX);
	dy1 = floor(s1/slicesOverY)/slicesOverY;

	dx2 = fract(s2/slicesOverX);
	dy2 = floor(s2/slicesOverY)/slicesOverY;
	
	texpos1.x = dx1+(volpos.x/slicesOverX);
	texpos1.y = dy1+(volpos.y/slicesOverY);

	texpos2.x = dx2+(volpos.x/slicesOverX);
	texpos2.y = dy2+(volpos.y/slicesOverY);

	return mix( texture2D(uVolData,texpos1).x, texture2D(uVolData,texpos2).x, (volpos.z*numberOfSlices)-s1);
}

vec4 getTexture3DValue(sampler2D texture, vec3 volpos)
{
	float s1,s2;
	float dx1,dy1;
	float dx2,dy2;

	vec2 texpos1,texpos2;

	s1 = floor(volpos.z*numberOfSlices);
	s2 = s1+1.0;

	dx1 = fract(s1/slicesOverX);
	dy1 = floor(s1/slicesOverY)/slicesOverY;

	dx2 = fract(s2/slicesOverX);
	dy2 = floor(s2/slicesOverY)/slicesOverY;
	
	texpos1.x = dx1+(volpos.x/slicesOverX);
	texpos1.y = dy1+(volpos.y/slicesOverY);

	texpos2.x = dx2+(volpos.x/slicesOverX);
	texpos2.y = dy2+(volpos.y/slicesOverY);

	return mix( texture2D(texture,texpos1), texture2D(texture,texpos2), (volpos.z*numberOfSlices)-s1);
}

vec4 normalizedNormalFromTexture(sampler2D normals, vec4 pos) {
  vec4 n = getTexture3DValue(normals, pos.xyz);
  n.xyz = (2.0*n.xyz)-1.0;
  n.a = length(n.xyz);
  if( length(n.xyz) > 0.0001)
    n.xyz = normalize(n.xyz);
  return n;
}

void main(void)
{
	vec2 texC = pos.xy/pos.w;
	texC.x = 0.5*texC.x + 0.5;
	texC.y = 0.5*texC.y + 0.5;

	vec4 backColor = texture2D(uBackCoord,texC);

	vec3 dir = backColor.rgb - frontColor.rgb;
	vec4 vpos = frontColor;

	 //Obtain the camera position from the inversed modelview matrix
  	vec3 cam_pos = vec3(uInvMVMatrix[3][0], uInvMVMatrix[3][1], uInvMVMatrix[3][2]);
  
  	float cont = 0.0;

	vec3 Step = dir/steps;

	vec4 accum = vec4(0, 0, 0, 0);
	vec4 sample = vec4(0.0, 0.0, 0.0, 0.0);
 	vec4 value = vec4(0, 0, 0, 0);

	float opacityFactor = 8.0;
	float lightFactor = 1.3;

	for(float i = 0.0; i < steps; i+=1.0)
	{
		vec2 tf_pos;

		tf_pos.x = getVolumeValue(vpos.xyz);		
		tf_pos.y = 0.5;
		
		value = texture2D(uTransferFunction,tf_pos);
		vec4 grad = normalizedNormalFromTexture(uGradient, vpos);

		// Process the volume sample
		sample.a = value.a * opacityFactor * (1.0/steps);
		//Enhance the color value obtained from the transfer function with the gradient
		EdgeEnhacement( value.rgb, uEdgeColor, uGradientThreshold, grad.xyz, normalize(vpos.xyz-cam_pos));
		sample.rgb = value.rgb * sample.a * lightFactor;

		accum.rgb += (1.0 - accum.a) * sample.rgb;
		accum.a += sample.a;

		//advance the current position
		vpos.xyz += Step;

		//break if the position is greater than <1, 1, 1>
		if(vpos.x > 1.0 || vpos.x < 0.0 || vpos.y > 1.0 || vpos.y < 0.0 || vpos.z > 1.0 ||  vpos.z < 0.0|| accum.a>=1.0)
		    break;


	}

	gl_FragColor = accum;
}
