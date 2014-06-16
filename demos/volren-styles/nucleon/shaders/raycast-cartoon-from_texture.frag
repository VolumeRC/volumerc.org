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

//Cartoon style options 
uniform int uColorSteps; //[1,64]
uniform vec4 uParallelColor; //[[0,1],..]
uniform vec4 uOrthogonalColor; //[[0,1],..]

//Defined constants
const float steps = 80.0;
const float numberOfSlices = 41.0;
const float slicesOverX = 7.0;
const float slicesOverY = 7.0;
const float pi_half = 3.1415/2.0;

/**
* Convert RGBA color to HSVA
*/
vec4 rgba2hsva(vec4 rgba){
	float zat, izen;
	float R = rgba.r, G = rgba.g, B = rgba.b;
	float minim = min(R, min(G, B)), maxim = max(R, max(G, B));
	float delta = maxim-minim;
	if(minim == maxim){
		return vec4(0.0, 0.0, maxim, rgba.a);
	}else{
		zat = (R == maxim) ? G - B : ((G == maxim) ? B - R : R - G); 
		izen = (R == maxim) ? ((G<B) ? 6.0 : 0.0) : ((G == maxim) ? 2.0 : 4.0); 
		return vec4((zat/delta + izen)/6.0, delta/maxim, maxim, rgba.a); 
	}
}

/**
* Convert RGB color to HSV
*/
vec3 rgb2hsv(vec3 rgb){
	return rgba2hsva(vec4(rgb, 1.0)).rgb;
}

/**
* Convert HSVA color to RGBA
*/
vec4 hsva2rgba(vec4 hsva){
    float r, g, b;
    float h=hsva.x, s=hsva.y, v=hsva.z;

    float i = floor(h * 6.0);
    float f = h * 6.0 - i;
    float p = v * (1.0 - s);
    float q = v * (1.0 - f * s);
    float t = v * (1.0 - (1.0 - f) * s);

    i = mod(i,6.0);
    if( i == 6.0 || i == 0.0 ) r = v, g = t, b = p;
    else if( i == 1.0) r = q, g = v, b = p;
    else if( i == 2.0) r = p, g = v, b = t;
    else if( i == 3.0) r = p, g = q, b = v;
    else if( i == 4.0) r = t, g = p, b = v;
    else if( i == 5.0) r = v, g = p, b = q;

    return vec4(r,g,b,hsva.w);
}

/**
* Convert HSV color to RGB
*/
vec3 hsv2rgb(vec3 hsv){
	return hsva2rgba(vec4(hsv, 1.0)).rgb;
}

/**
* Cartoon Volume Style
* The cartoon style generates a non-photorealistic rendering associated to the volume data. 
*
* @param [inout] outputcolor The color to use for the edge enhancement
* @param othogonalColor The color in HSV format
* @param parallelColor The color in HSV format
* @param surfNormal Normalized gradient vector or surface normal for the current sample
* @param V Normalized view direction
* @param vpos The current sample/voxel position inside the cube
*/
void getCartoonStyle(inout vec4 outputColor, vec3 orthogonalColor, vec3 parallelColor, int colorSteps, vec3 surfNormal, vec3 V)
{	
	if(colorSteps > 0 && colorSteps <= 64){
		float cos_angle = abs(dot(surfNormal, V));
		if(cos_angle == 0.0){
			outputColor.rgb = parallelColor.rgb;
		}else{
			if(cos_angle <= 1.0){
				float range_size = pi_half / float(colorSteps);
				float interval = floor(cos_angle / range_size);
				float ang = interval * range_size;
				outputColor.rgb = hsv2rgb(mix(orthogonalColor, parallelColor, ang));
			}else if(cos_angle == 1.0){
				outputColor.rgb = orthogonalColor.rgb;
			}else{
				//Out of range
				outputColor.rgb = vec3(1.0, 1.0, 1.0);
			}
		}
	}else{
		outputColor.a = 0.0; //No color steps as input parameter
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
  if( length(n.xyz) > 0.01 )
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
  	
  	//The offset on 3d space

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
		//aarbelaiz

		//Cartoon style color
		getCartoonStyle(value, rgba2hsva(uOrthogonalColor).rgb, rgba2hsva(uParallelColor).rgb, uColorSteps, grad.xyz, normalize(dir));

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
