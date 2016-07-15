/**
 * Created by lkabongo on 05/07/2016.
 * Requires jQuery, dat.GUI and X3DOM.
 */
var X3DOMControls = function () {
    this.colorMin = "#000000";
    this.opacityMin = 0.1;
    this.colorMax = "#ffffff";
    this.opacityMax = 1.0;

    this.windowCenter = 0;
    this.windowWidth = 0;
};
var x3domcontrols = new X3DOMControls();

// Store the DICOM images Window Center and Window With for all series (last one kept) for TF adjustments
var CURRENT_IMAGE_WINDOWCENTER = 0, CURRENT_IMAGE_WINDOWWIDTH = 0;

// Store the DICOM images spacing (last one kept) for all series for transform adjustments
var CURRENT_IMAGE_SPACING = [1.0, 1.0, 1.0];

// Store the global javascript timeouts used for triggering X3DOM refresh
var CURRENT_TIMEOUT_ATLAS, CURRENT_TIMEOUT_TF;

// Store the series minimum and maximum values
// NOTE: we store the value after applying slope/intercept that could change in different slices of the same series
var CURRENT_SERIES_MIN, CURRENT_SERIES_MAX;

// Histogram bins of current series
var CURRENT_SERIES_HISTOGRAM;

// Converts DICOM pixel data to image gray pixels and puts then into an HTML Image Canvas
function fillImageDataWithCornerstoneImage(image) {
    var dicomPixels = image.getPixelData();
    var rgbaPixels = new Uint8ClampedArray(4 * dicomPixels.length);

    CURRENT_SERIES_MIN = Math.min(CURRENT_SERIES_MIN, image.slope * image.minPixelValue + image.intercept);
    CURRENT_SERIES_MAX = Math.max(CURRENT_SERIES_MAX, image.slope * image.maxPixelValue + image.intercept);

    // For each pixel in current image
    for (var i = 0; i < dicomPixels.length; i++) {
        // To Hounsfield Units (for CT)
        var HU = image.slope * dicomPixels[i] + image.intercept;
        if(CURRENT_SERIES_HISTOGRAM[HU] === undefined)
            CURRENT_SERIES_HISTOGRAM[HU]=1;
        else CURRENT_SERIES_HISTOGRAM[HU]+=1;

        // Apply Window/Level
        var wlHU = (((HU - (CURRENT_IMAGE_WINDOWCENTER - 0.5)) / (CURRENT_IMAGE_WINDOWWIDTH - 1.0)) + 0.5) * 255.0;

        // Store in new array
        rgbaPixels[4 * i + 0] = wlHU;
        rgbaPixels[4 * i + 1] = wlHU;
        rgbaPixels[4 * i + 2] = wlHU;
        rgbaPixels[4 * i + 3] = 255;
    }

    // Create a new image data with new array contents
    var voxelImageData = new ImageData(image.width, image.height);
    voxelImageData.data.set(rgbaPixels);

    // Create a new temporary canvas and fill it with image data
    var tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = image.width;
    tmpCanvas.height = image.height;
    var tmpCtx = tmpCanvas.getContext("2d");
    tmpCtx.putImageData(voxelImageData, 0, 0);
    return tmpCanvas;
}

// Refreshes X3DOM to take into account new atlas contents and dimensions
function doRefresh() {
    document.getElementById("voxelAtlas")._x3domNode.invalidateGLObject();
    // Normalize spacing to fit in a 1.0^3 box
    var maxCurrentImageSpacing = Math.max.apply(null, CURRENT_IMAGE_SPACING);
    CURRENT_IMAGE_SPACING = CURRENT_IMAGE_SPACING.map(function (x) { return x / maxCurrentImageSpacing; });
    document.getElementById("volumeTransform").setAttribute("scale", CURRENT_IMAGE_SPACING[0] + "," + CURRENT_IMAGE_SPACING[1] + "," + CURRENT_IMAGE_SPACING[2]);
}

function updateLinearTF(value) {
    USE_TF_FROMFILE = false;
    var tfCanvas = document.getElementById("tfCanvas");
    var ctxTfCanvas = tfCanvas.getContext("2d");

    ctxTfCanvas.clearRect(0, 0, tfCanvas.width, tfCanvas.height);
    var gradient = ctxTfCanvas.createLinearGradient(0, 0, tfCanvas.width, 0);
    gradient.addColorStop(0, tinycolor(x3domcontrols.colorMin).setAlpha(x3domcontrols.opacityMin).toRgbString());
    gradient.addColorStop(1, tinycolor(x3domcontrols.colorMax).setAlpha(x3domcontrols.opacityMax).toRgbString());
    ctxTfCanvas.fillStyle = gradient;
    ctxTfCanvas.fillRect(0, 0, tfCanvas.width, tfCanvas.height);

    // Refreshes X3DOM to take into account new TF contents
    document.getElementById("voxelAtlas")._x3domNode.invalidateGLObject();
}

// Applies the corresponding portion of the TF depending on current WW/WC values
function applyColor() {
    if(USE_TF_FROMFILE) {
        var tfCanvas = document.getElementById("tfCanvas");
        var ctxTfCanvas = tfCanvas.getContext("2d");

        ctxTfCanvas.clearRect(0,0,tfCanvas.width,tfCanvas.height);
        ctxTfCanvas.drawImage(document.getElementById("tfTmpCanvas"),
            (CURRENT_IMAGE_WINDOWCENTER - (CURRENT_IMAGE_WINDOWWIDTH / 2.0)) - CURRENT_TF_MIN,  0,
            (CURRENT_IMAGE_WINDOWCENTER + (CURRENT_IMAGE_WINDOWWIDTH / 2.0)) - CURRENT_TF_MIN, 10,
            Math.min(255.0,Math.max(0.0,(((CURRENT_TF_MIN - (CURRENT_IMAGE_WINDOWCENTER - 0.5)) / (CURRENT_IMAGE_WINDOWWIDTH - 1.0)) + 0.5) * 255.0)),               0,
            Math.min(255.0,Math.max(0.0,(((CURRENT_TF_MAX - (CURRENT_IMAGE_WINDOWCENTER - 0.5)) / (CURRENT_IMAGE_WINDOWWIDTH - 1.0)) + 0.5) * 255.0)), tfCanvas.height
        );

        // Refreshes X3DOM to take into account new TF contents
        document.getElementById("voxelAtlas")._x3domNode.invalidateGLObject();

        // WORKAROUND: Not sure why, first pixels never appear transparent.
        ctxTfCanvas.fillStyle="rgba(0,0,0,0)";
        ctxTfCanvas.fillRect(0,0,10,10);
        ctxTfCanvas.fillStyle="rgba(255,255,255,255)";
        ctxTfCanvas.fillRect(tfCanvas.width-10,0,tfCanvas.width,10);
    }
    else if(USE_TF_FROMEDITOR){
        var tfCanvas = document.getElementById("tfCanvas");
        var ctxTfCanvas = tfCanvas.getContext("2d");
        var tfTmpCanvas = document.getElementById("tfTmpCanvas")

        ctxTfCanvas.clearRect(0,0,tfCanvas.width,tfCanvas.height);

        // tfTmpCanvas should fit exactly within tfCanvas dimensions or otherwise the contents will be truncated.
        ctxTfCanvas.drawImage(document.getElementById("tfTmpCanvas"), 0, 0, tfTmpCanvas.width, tfTmpCanvas.height,
            0,0,tfTmpCanvas.width, tfTmpCanvas.height);

        // Refreshes X3DOM to take into account new TF contents
        document.getElementById("voxelAtlas")._x3domNode.invalidateGLObject();
    }
    else if(updateLinearTF !== undefined) updateLinearTF(0);

    drawHistogram();

    if(x3domcontrols !== undefined) { //TODO: should be defined in this file
        x3domcontrols.windowCenter = CURRENT_IMAGE_WINDOWCENTER;
        x3domcontrols.windowWidth = CURRENT_IMAGE_WINDOWWIDTH;
    }
}

function drawHistogram() {
    if ($("#histcanvas")[0] === undefined)return;
    var ctx = $("#histcanvas")[0].getContext("2d");

    var binMax = 0;
    for (bin in CURRENT_SERIES_HISTOGRAM) {
        binMax = Math.max(binMax, CURRENT_SERIES_HISTOGRAM[bin]);
    }
    $("#histcanvas")[0].width = CURRENT_SERIES_MAX - CURRENT_SERIES_MIN;
    ctx.fillStyle = "#dddddd";
    ctx.fillRect(0, 0, $("#histcanvas")[0].width, $("#histcanvas")[0].height);
    ctx.fillStyle = "#000000";
    for (bin in CURRENT_SERIES_HISTOGRAM) {
        var pct = (CURRENT_SERIES_HISTOGRAM[bin] / binMax) * 100;
        ctx.fillRect(bin - CURRENT_SERIES_MIN, $("#histcanvas")[0].height, 1, -Math.round(pct));
    }
    //ctx.strokeText(binMax, 20, 20);
    //ctx.strokeText(CURRENT_SERIES_MIN, $("#histcanvas")[0].height - 20, 20);
    //ctx.strokeText(CURRENT_SERIES_MAX, $("#histcanvas")[0].height - 20, $("#histcanvas")[0].width - 20);
    $("#histcanvas")[0].style = "width: inherit; height:inherit";
    if(r !== undefined) {
        var bars = r.set();
        var lowerBound = (CURRENT_IMAGE_WINDOWCENTER - (CURRENT_IMAGE_WINDOWWIDTH / 2.0));
        var upperBound = (CURRENT_IMAGE_WINDOWCENTER + (CURRENT_IMAGE_WINDOWWIDTH / 2.0));
        var w = r.width/(upperBound-lowerBound);
        for (bin in CURRENT_SERIES_HISTOGRAM) {
            if(bin>lowerBound && bin<upperBound){
                var h = (CURRENT_SERIES_HISTOGRAM[bin] / binMax) * r.height;
                bars.push(r.rect((bin-lowerBound)*w,r.height-h,w,h));
            }
        }
        bars.attr({stroke: "none",fill: "blue"});
    }
    //$("#histogramHolder")[0].style['display'] = "block";

    //if (Raphael === undefined) return;
    //var paper = Raphael("canvas", 255, 100);/
}

// Triggers delayed refresh of TF and ATLAS
function launchRefresh() {
    clearTimeout(CURRENT_TIMEOUT_ATLAS);
    clearTimeout(CURRENT_TIMEOUT_TF);
    CURRENT_TIMEOUT_ATLAS = setTimeout(doRefresh, 300);
    CURRENT_TIMEOUT_TF = setTimeout(applyColor,1000);
}

// Draws a list of files into an 2D context with given width/height
function filesToAtlas(files, atlas2DContext, atlas_width, atlas_height, invisibleDiv, desiredWindowCenter, desiredWindowWidth) {
    // Compute how many slices fit along X and Y axis
    var slicesOverX = Math.ceil(Math.sqrt(files.length));
    var slicesOverY = Math.ceil(Math.sqrt(files.length));

    // Resulting slice width/height within atlas
    var newSliceWidth = atlas_width / slicesOverX, newSliceHeight = atlas_height / slicesOverY;

    // Stores the used image IDs
    var imageIds = [];
    for (var i = 0; i < files.length; i++) {
        // Creates an ID for drop file
        var imageId = cornerstoneWADOImageLoader.fileManager.add(files[i]);
        imageIds.push(imageId);

        // Load image (promise) with cornerstone
        cornerstone.loadAndCacheImage(imageId).then(function (image) {
            // Get current slice number and compute its corresponding position in the atlas
            var nSlice = imageIds.indexOf(image.imageId);
            var posX = nSlice % slicesOverX;
            var posY = Math.floor(nSlice / slicesOverX);

            // Take current image WW/WC
            if(desiredWindowCenter === undefined)
                CURRENT_IMAGE_WINDOWCENTER = image.windowCenter;
            else CURRENT_IMAGE_WINDOWCENTER = desiredWindowCenter;
            if(desiredWindowWidth === undefined)
                CURRENT_IMAGE_WINDOWWIDTH = image.windowWidth;
            else CURRENT_IMAGE_WINDOWWIDTH = desiredWindowWidth;

            // Initialize current series histogram, min and max values
            CURRENT_SERIES_HISTOGRAM = {};
            CURRENT_SERIES_MIN = Number.MAX_SAFE_INTEGER;
            CURRENT_SERIES_MAX = Number.MIN_SAFE_INTEGER;

            // Fills a temporary canvas with DICOM pixels converted to gray image
            var tmpCanvas = fillImageDataWithCornerstoneImage(image);
            //invisibleDiv.appendChild(tmpCanvas);
            atlas2DContext.drawImage(tmpCanvas, 0, 0, image.width, image.height, posX * newSliceWidth, posY * newSliceHeight, newSliceWidth, newSliceHeight);
            //invisibleDiv.removeChild(tmpCanvas);
            cornerstone.imageCache.removeImagePromise(image.imageId);// Save memory by removing image from cache

            // Adjusts spacing for volume's 3D aspect ratio (according to current image only)
            CURRENT_IMAGE_SPACING[0] = image.columns * image.columnPixelSpacing;
            CURRENT_IMAGE_SPACING[1] = image.rows * image.rowPixelSpacing;
            CURRENT_IMAGE_SPACING[2] = files.length * Number(image.data.string('x00180050'));

            // Trigger delayed refresh
            launchRefresh();
        });
    }
}

/** TF FILE READING FUNCTIONS **/
// TF files are in the following format:
// Line start with a value descriptor or contain a value (only file containing TF points = TH are taken into account in
// this application.
// Lines starting with TH contain 5 values for a point in the TF:
// - a Hounsfield Unit Value (typically between -1000 to 5000)
// - Red value (0-255)
// - Green value (0-255)
// - Blue value (0-255)
// - Opacity (0.0-1.0)


// Tells if a line of the TF file starts with TH ()
function isTHLine(value) {
    return value.startsWith("TH: ");
}

// Parses a TF file
var CURRENT_TF_MIN = 0, CURRENT_TF_MAX = 0;
var USE_TF_FROMFILE = false;
var USE_TF_FROMEDITOR = false;
function readTF(url) {
    function drawTF(tfPoints) {
        var tfTmpCanvas = document.getElementById("tfTmpCanvas");
        CURRENT_TF_MIN = Math.min(CURRENT_TF_MIN, tfPoints[0][0]);
        CURRENT_TF_MAX = Math.max(CURRENT_TF_MAX, tfPoints[tfPoints.length - 1][0]);

        tfTmpCanvas.width = CURRENT_TF_MAX - CURRENT_TF_MIN;
        tfTmpCanvas.height = 10;
        var ctx = tfTmpCanvas.getContext("2d");
        for (var i = 1; i < tfPoints.length; i++) {
            var grd = ctx.createLinearGradient(tfPoints[i - 1][0] - CURRENT_TF_MIN, 0, tfPoints[i][0] - CURRENT_TF_MIN, 0);
            grd.addColorStop(0, "rgba(" + tfPoints[i - 1][1] + "," + tfPoints[i - 1][2] + "," + tfPoints[i - 1][3] + "," + eval(tfPoints[i - 1][4]) * 255.0 + ")");
            grd.addColorStop(1, "rgba(" + tfPoints[i][1] + "," + tfPoints[i][2] + "," + tfPoints[i][3] + "," + eval(tfPoints[i][4]) * 255.0 + ")");
            ctx.fillStyle = grd;
            ctx.fillRect(tfPoints[i - 1][0] - CURRENT_TF_MIN, 0, tfPoints[i][0] - CURRENT_TF_MIN, 10);
        }
    }

    $.get(url, function (data) {
        var tfPoints = data.split('\n').filter(isTHLine).map(function (val) {
            return val.split(/[\s]+/);
        }).map(function (val) {
            val.splice(0, 1);
            if (val.length > 5)val.splice(5, val.length - 5);
            return val.map(eval);
        });
        tfPoints.sort(function (a, b) {
            return a[0] - b[0];
        });
        drawTF(tfPoints);
    });
    USE_TF_FROMFILE = true;
}