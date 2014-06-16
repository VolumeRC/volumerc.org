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

//Shilouette enhacement options
uniform float uSilhouetteRetainedOpacity;
uniform float uSilhouetteBoundaryOpacity;
uniform float uSilhouetteSharpness;

//Defined constants
const float steps = 80.0;
const float numberOfSlices = 41.0;
const float slicesOverX = 7.0;
const float slicesOverY = 7.0;


/**
* Silhouette Enhancement Style.
* Enhancement by darkening of the voxels is made based on the relative orientation to the view direction. This orientation is determined from the 
* surface normal of each voxel. Perpendicular voxels are darked while parallel voxels to the view direction are not changed.
*
* @param originalOpacity The original opacity for the sampled point
* @param surfNormal The surface normal for the given sampled point
* @param Ksc Controls the scalling of non-silhouette regions (silhouetteRetainedRegion) [0,1]
* @param Kss The amount of silhouette enhancement to use (silhouetteBoundaryOpacity) [0,1]
* @param Kse A power function to control the sharpness of the silhouette (silhouetteSharpness) [0, infinite)
* @return The enhanced opacity value
*/
void getSilhouetteEnhancement(inout float originalOpacity, vec3 surfNormal, float Ksc, float Kss, float Kse, vec3 V)
{
	originalOpacity = originalOpacity * (Ksc + Kss * pow((1.0-abs(dot(surfNormal, V))), Kse));
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
  if( length(n.xyz) > 0.0001 )
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

  	float cont = 0.0;

	vec3 Step = dir/steps;

	vec4 accum = vec4(0, 0, 0, 0);
	vec4 sample = vec4(0.0, 0.0, 0.0, 0.0);
 	vec4 value = vec4(0, 0, 0, 0);

	float opacityFactor = 4.0;
	float lightFactor = 1.3;

	for(float i = 0.0; i < steps; i+=1.0)
	{
		vec2 tf_pos;

		tf_pos.x = getVolumeValue(vpos.xyz);		
		tf_pos.y = 0.5;
		
		value = texture2D(uTransferFunction,tf_pos);

		//aarbelaiz
		vec4 grad = normalizedNormalFromTexture(uGradient, vpos);
		//Enhance the original opacity
		getSilhouetteEnhancement(value.a, grad.xyz, uSilhouetteRetainedOpacity, uSilhouetteBoundaryOpacity, uSilhouetteSharpness, normalize(dir));
		// Process the volume sample
		sample.a = value.a * opacityFactor * (1.0/steps);
		sample.rgb = value.rgb * sample.a * lightFactor;
		//~aarbelaiz;
						
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
