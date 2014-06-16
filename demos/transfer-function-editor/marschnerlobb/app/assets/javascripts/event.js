//all the listeners are here
//MOUSE EVENTS-----------------------------------------------------------------------------------------------------------------------------
function wheel(event){
        var delta =wheelDelta;
        if (!event) /* For IE. */
                event = window.event;
        if (event.wheelDelta) { /* IE/Opera. */
                delta =delta+event.wheelDelta/120;
                /** In Opera 9, delta differs in sign as compared to IE.
                 */
        } else if (event.detail) { /** Mozilla case. */
                /** In Mozilla, sign of delta is different than in IE.
                 * Also, delta is multiple of 3.
                 */
                delta = delta + event.detail/3;
        }
        /** If delta is nonzero, handle it.
         * Basically, delta is now positive if wheel was scrolled up,
         * and negative, if wheel was scrolled down.
         */

        wheelDelta=delta;		
        /** Prevent default actions caused by mouse wheel.
         * That might be ugly, but we handle scrolls somehow
         * anyway, so don't bother here..
         */
        if (event.preventDefault)
                event.preventDefault();
	event.returnValue = false;
}
/*------------SLIDER-EVENTS---------------------------------------------*/
$(function() {
		// change defaults for range, animate and orientation
		$.extend($.ui.slider.defaults, {
			range: "min",
			animate: true,
			orientation: "vertical",
			min: 0,
			max: 255
			
		});
		// setup graphic EQ
		$("#eq > span").each(function() {
			// read initial values from markup and remove that
			var value = parseInt($(this).text());
			$(this).empty();
			$(this).slider({
				value: value,
				slide: function(event, ui) {
					$("#amount").val(ui.value);
					//detectarColor();
					selector=$(this).context.className;
					cambiarTransparencia(selector,ui.value);								
				}
			})
		});
	});
	function hexFromRGB (r, g, b) {
		var hex = [
			r.toString(16),
			g.toString(16),
			b.toString(16)
		];
		$.each(hex, function (nr, val) {
			if (val.length == 1) {
				hex[nr] = '0' + val;
			}
		});
		return hex.join('').toUpperCase();
	}
	function refreshSwatch() {
	
		var red = $("#red").slider("value")
			,green = $("#green").slider("value")
			,blue = $("#blue").slider("value")
			,hex = hexFromRGB(red, green, blue);
		$("#swatch").css("background-color", "#" + hex);
		initColor.colors.components[globalIndexColors].R=red;
		initColor.colors.components[globalIndexColors].G=green;
		initColor.colors.components[globalIndexColors].B=blue;
		$("#colorPixel"+ globalIndexColors).css("background-color", "#" + hex);
		//aarbelaiz
		updateTransferFunction();
		//~aarbelaiz
		
	}
	$(function() {
		$("#red, #green, #blue").slider({
			orientation: 'horizontal',
			range: "min",
			max: 255,
			value: 127,
			slide: refreshSwatch,
			change: refreshSwatch
		});
	//	$("#red").slider("value", 0);
//
	//	$("#green").slider("value", 0);
		//$("#blue").slider("value", 0);
	});
	//$("#eq.span.rango0").bind('slide',function(event, ui) {
	//											  alert(ui.value);
	//											  });
	//$("#eq.span.rango0").slider({start:function(event, ui) {alert(ui.value);}});
	function detectarColor(R,G,B)
	{
		$("#red").slider("value", parseInt(R));
		$("#green").slider("value",parseInt(G));
		$("#blue").slider("value", parseInt(B));
		refreshSwatch();
		
		//alert($("span.rango0").slider("value"));honek ondo inteit
	}
	function cambiarTransparencia(selector,value)
	{	
		var sliderIndex;
		var intIndex;
		//aqui hago la comparación de cual es el slider y le meto los valores al webgl
		 comp=selector.substring(0,8);
		 comp=comp.split('#');
		 sliderIndex=comp[1];
		 globalIndexColors=parseInt(sliderIndex);
		 detectarColor(initColor.colors.components[globalIndexColors].R,initColor.colors.components[globalIndexColors].G,initColor.colors.components[globalIndexColors].B);
		 initColor.colors.components[globalIndexColors].A=value;
		 //aarbelaiz
		 updateTransferFunction();
		//~aarbelaiz
	}

	function updateTransferFunction()
	{
		drawTF(initColor.colors.components);
	}
