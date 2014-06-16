#ifdef GL_ES
precision highp float;
#endif

varying vec4 frontColor;
varying vec4 pos;

uniform sampler2D uBackCoord;
uniform sampler2D uVolData;
uniform sampler2D utransferFunction;

const float Steps = 40.0;
const float slides = 96.0;
const float mslides_x =10.0;
const float mslides_y =10.0;

float getVolumeValue(vec3 volpos)
{
	float s1,s2;
	float dx1,dy1;
	float dx2,dy2;

	vec2 texpos1,texpos2;

	s1 = floor(volpos.z*slides);
	s2 = s1+1.0;

	dx1 = fract(s1/mslides_x);
	dy1 = floor(s1/mslides_y)/mslides_y;

	dx2 = fract(s2/mslides_x);
	dy2 = floor(s2/mslides_y)/mslides_y;
	
	texpos1.x = dx1+(volpos.x/mslides_x);
	texpos1.y = dy1+(volpos.y/mslides_y);

	texpos2.x = dx2+(volpos.x/mslides_x);
	texpos2.y = dy2+(volpos.y/mslides_y);

	return mix( texture2D(uVolData,texpos1).x, texture2D(uVolData,texpos2).x, (volpos.z*slides)-s1);
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

	vec3 Step = dir/Steps;

	vec4 accum = vec4(0, 0, 0, 0);
	vec4 sample = vec4(0.0, 0.0, 0.0, 0.0);
 	vec4 value = vec4(0, 0, 0, 0);

	float opacityFactor = 8.0;
	float lightFactor = 1.3;

	for(float i = 0.0; i < Steps; i+=1.0)
	{
		vec2 tf_pos;

		tf_pos.x = getVolumeValue(vpos.xyz);		
		tf_pos.y = 0.5;
		
		//value = texture2D(utransferFunction,tf_pos);
		value = vec4(tf_pos.x,tf_pos.x,tf_pos.x,tf_pos.x);

		// Process the volume sample
		sample.a = value.a * opacityFactor * (1.0/Steps);
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

