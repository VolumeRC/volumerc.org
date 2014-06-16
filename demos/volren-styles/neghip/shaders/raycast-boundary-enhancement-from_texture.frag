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

//Boundary enhancement style uniform variables
uniform float uBoundaryRetainedOpacity;
uniform float uBoundaryOpacity;
uniform float uBoundaryFactor;

//Defined constants
const float steps = 80.0;
const float numberOfSlices = 64.0;
const float slicesOverX = 8.0;
const float slicesOverY = 8.0;

/**
* Boundary Enhancement Opacity.
* The computed opacity will change on function to the gradient magnitude. Faster-channging gradient (surface normals),
* are darker than slower-changing gradients. Thus, regions with more change on density are made more visible relative to parts that
* of relative constant density.
*
* @param original_opacity is the original opacity of the voxel
* @param gradientMagnitude The vector gradient on the current position (not the magnitude)
* @param kc is the amount of initial opacity to mix into the output (retainedOpacity) [0,1]
* @param ks is the factored amount of the gradient enhancement to use (boundaryOpacity) [0,1]
* @param ke is the power function to control the slope of the opacity curve to highlight the set of data (opacityFactor) [0,inf)
* @return the computed enhanced opacity value
*/
float getBoundaryEnhancement(float original_opacity, float gradientMagnitude, float kc, float ks, float ke){
	return original_opacity * (kc + (ks*pow(abs(gradientMagnitude), ke)));
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

float getGradientValue(vec3 volpos)
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

	return mix( texture2D(uGradient,texpos1).x, texture2D(uGradient,texpos2).x, (volpos.z*numberOfSlices)-s1);
}

void main(void)
{
	vec2 texC = pos.xy/pos.w;
	texC.x = 0.5*texC.x + 0.5;
	texC.y = 0.5*texC.y + 0.5;

	vec4 backColor = texture2D(uBackCoord,texC);

	vec3 dir = backColor.rgb - frontColor.rgb;
	vec4 vpos = frontColor;
  
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
		//aarbelaiz
		//Obtain the gradient magnitude from texture
		float grad = getGradientValue(vpos.xyz);
		//Obtain the opacity
		float opacity = getBoundaryEnhancement(value.a, grad, uBoundaryRetainedOpacity, uBoundaryOpacity, uBoundaryFactor);

		// Process the volume sample with the enhancement opacity
		sample.a = opacityFactor * opacity * (1.0/steps);
		//~aarbelaiz
		sample.rgb = value.rgb * sample.a * lightFactor;
						
		accum.rgb += (1.0 - accum.a) * sample.rgb;
		accum.a += sample.a;

		//advance the current position
		vpos.xyz += Step;

		//break if the position is greater than <1, 1, 1>
		if(vpos.x > 1.0 || vpos.y > 1.0 || vpos.z > 1.0 || accum.a>=1.0)
		    break;


	}

	gl_FragColor = accum;
}
