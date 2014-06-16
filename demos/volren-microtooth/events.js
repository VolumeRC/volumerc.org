/* Mouse Hanndlers and bindings */

/*global variables*/
var mouseDown = false;
var lastMouseX = null;
var lastMouseY = null;
var mouseZoom = false;

function handleMouseDown(event) {
	if (event.altKey){
		mouseZoom = true;
	}else {
		mouseDown = true;
		lastMouseX = event.clientX;
		lastMouseY = event.clientY;
	}
}
function handleMouseUp(event)
{
	mouseDown = false;
	mouseZoom = false;
}
function handleMouseMove(event)
{
	if (mouseDown) {
		var newX = event.clientX;
		var newY = event.clientY;

		var deltaX = newX - lastMouseX
		var newRotationMatrix = createRotationMatrix(deltaX / 10, [0, 1, 0]);

		var deltaY = newY - lastMouseY;
		newRotationMatrix = newRotationMatrix.x(createRotationMatrix(deltaY / 10, [1, 0, 0]));

		objectRotationMatrix = newRotationMatrix.x(objectRotationMatrix);

		lastMouseX = newX
		lastMouseY = newY;
		setTimeout(tick, 1);

	} else if (mouseZoom) {
		var newX = event.clientX;
		var newY = event.clientY;

		var deltaX = newX - lastMouseX;
		var deltaY = newY - lastMouseY;

		zoom -= (deltaX+deltaY)/100,0;

		lastMouseX = newX;
		lastMouseY = newY;
		setTimeout(tick, 1);

	}
	return;
}

/* mouse binding */
$(document).ready(function(){
	$("canvas").bind({
		mousemove: handleMouseMove,
		mousedown: handleMouseDown,
		mouseup: handleMouseUp
	});
});
