window.onload = function() 
{
	
}

function inicializa_xhr() 
{
	if (window.XMLHttpRequest) 
	{
		return new XMLHttpRequest();
	} 
	else if (window.ActiveXObject) 
	{
		return new ActiveXObject("Microsoft.XMLHTTP");
	}
}

function MM_openBrWindow(theURL,winName,features) {
  window.open(theURL,winName,features);
}

function MM_openBrWindow(theURL,winName,features) {
  window.open(theURL,winName,features);
}


function mostrarImagen(image,UrlDemo,titleDemo)
{
document.getElementById("main_image_wrapper").innerHTML="<font id='copyright'><strong>"+titleDemo+"</strong><br></font><a href='"+UrlDemo+"' target='_blank'><img src='"+image+"' class='BigImg'/></a>"	
}



