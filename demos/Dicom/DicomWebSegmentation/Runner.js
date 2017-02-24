// Emscripten namespace
var Module = Module || {};
//var ModuleCE = ModuleCE || {};
//var ModuleCR = ModuleCR || {};
//var ModuleCT = ModuleCT || {};

// Our namespace
var Runner = Runner || {};


/** Convert binary PNG image data to a PNG that can be displayed on the page.
 * */
Runner.binaryToPng = function (binary_data) {
    try {
        var blob = new Blob([binary_data], {"type": "image\/png"});
        window.URL = window.URL || window.webkitURL;
        return window.URL.createObjectURL(blob);
    } catch (err) { // in case blob / URL missing, fallback to data-uri
        var rawString = '';
        for (var i = 0; i < binary_data.length; ++i) {
            rawString += String.fromCharCode(binary_data[i]);
        }
        return 'data:image\/png;base64,' + btoa(rawString);
    }
};


Runner.Filter = function () {
    this.parameters = {
        input_filenames: [],
        output_filenames: [],
    };

    // Where to put the raw input and output images.
    FS.mkdir('/raw');

    // Where to put the images for display on the webpage
    FS.mkdir('/display');

    if (typeof window.Worker === "function") {
        this.worker = new Worker("FilterWorker.js");
    } else {
        this.worker = null;
    }
};


Runner.Filter.prototype.setProgress = function (progress) {
    var progress_element = $('#execution-progress');
    var progress_str = progress.toString();
    progress_element.css('width', progress_str + '%');
    progress_element.attr('aria-valuenow', progress_str);
    progress_element.html(progress_str + '%');
};

function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

Runner.Filter.prototype.postExecute = function () {
    var output_filenames = [];
    for (var idx = 0; idx < this.parameters.output_filenames.length; idx++) {
        var output_display_filename = '/display/' + this.parameters.output_filenames[idx].substr(5) + '.png';
        var output_filename = this.parameters.output_filenames[idx];
        //output_filenames.push('/raw/' + output_filename);
        //console.log(output_filenames);

        Module.ccall('ConvertAndResample', 'number',
            ['string', 'string'],
            [output_filename, output_display_filename]);
        this.displayOutput(output_display_filename);
    }

    var progress_element = $('#execution-progress');
    this.setProgress(0);
    progress_element.removeClass('progress-bar-striped active');
    progress_element.html('Done.');

            // Resulting canvas containing atlas
            var segmentCanvas = document.getElementById("segmentCanvas");
            var segmentContext = segmentCanvas.getContext("2d");

            //Now process the dropped files with dicomParser
            filesToAtlas(this.getOutputFiles(), segmentContext, segmentCanvas.width, segmentCanvas.height, document.getElementById("InvisibleDiv"));
};


Runner.Filter.prototype.execute = function () {
    var progress_element = $('#execution-progress');
    this.setProgress(0);
    progress_element.addClass('progress-bar-striped active');
    progress_element.html('Starting...');

    var input_filenames = [];
    var output_filenames = [];
    for (var idx = 0; idx < this.parameters.input_filenames.length; idx++) {
        var input_filename = this.parameters.input_filenames[idx];
        input_filenames.push('/raw/' + input_filename);
        var output_filename = 'OUTPUT' + pad(idx + 1, 3) + ".dcm";
	output_filenames.push('/raw/' + output_filename);
    }
    this.parameters.input_filenames = input_filenames;
    this.parameters.output_filenames = output_filenames;
    var args = [input_filenames, output_filenames];
    if (this.worker) {
        this.worker.postMessage({'cmd': 'run_filter', 'parameters': this.parameters});
    }
    else {
        Module.callMain(args);
        this.postExecute();
    }
};

Runner.Filter.prototype.displayOutput = function (filepath) {
    var output_data = FS.readFile(filepath, {encoding: 'binary'});
    var output_img = document.createElement("img");
    output_img.className = "img-responsive center-block";
    output_img.alt = filepath;
    output_img.src = Runner.binaryToPng(output_data);
    output_img.style.visibility = 'visible';

    var output_previews = document.getElementById("output-previews");
    output_previews.appendChild(output_img);
};

Runner.Filter.prototype.displayInput = function (filepath) {
    var input_data = FS.readFile(filepath, {encoding: 'binary'});
    var input_img = document.createElement("img");
    input_img.className = "img-responsive center-block";
    input_img.alt = filepath;
    input_img.src = Runner.binaryToPng(input_data);
    input_img.style.visibility = 'visible';

    var input_previews = document.getElementById("input-previews");
    input_previews.appendChild(input_img);
};


Runner.Filter.prototype.setInputFile = function (input_files) {
    this.parameters.input_filenames = [];
    var PARSED_FILES=0;
    var input_filepaths=[];
    var datas=[];
    for (var idx = 0; idx < input_files.length; idx++) {
        var input_filename = input_files[idx];
        if (typeof input_files[idx] === 'object') {
            input_filename = input_files[idx].name;
        }
        this.parameters.input_filenames.push(input_filename);

        var input_filepath = '/raw/' + input_filename;
        var input_display_filepath = '/display/' + input_filename + '.png';
        // Re-use the file it has already been downloaded.
        // A File object
        var reader = new FileReader();
        var that = this;
        input_filepaths.push(input_filepath);
        reader.input_filepath = input_filepath;
        reader.input_display_filepath = input_display_filepath;
        reader.total_files = input_files.length;
        reader.onload = (function (file) {
            return function (e) {
                var data = new Uint8Array(e.target.result);
                FS.writeFile(this.input_filepath, data, {encoding: 'binary'});
                Module.ccall('ConvertAndResample', 'number',
                    ['string', 'string'],
                    [this.input_filepath, this.input_display_filepath]);
                that.displayInput(this.input_display_filepath);
                datas.push(data);
                PARSED_FILES += 1;
            }
        })(input_files[idx]);
        reader.readAsArrayBuffer(input_files[idx]);
    }
    //while(datas.length < input_files.length){setTimeout(function(){},200);}
    //var myVar = setInterval(function(){ if(datas.length >= input_files.length){clearInterval(myVar);} }, 200);

	/*var check = function() {
	    if (PARSED_FILES >= input_files.length) {
		    if (this.worker) {
			this.worker.postMessage({
			    'cmd': 'install_input',
			    'input_filepath': input_filepaths,
			    'data': datas
			});
		    }
		    else {
			Runner.filter.execute();
		    }
		 return;
	    }
	    setTimeout(check, 500);
	}
check();*/
    if (this.worker) {
        this.worker.postMessage({
            'cmd': 'install_input',
            'input_filepath': input_filepaths,
            'data': datas
        });
    }
    else {
        Runner.filter.execute();
    }
};

Runner.Filter.prototype.getOutputFiles = function () {
    var output_files = [];
    //this.parameters.input_filenames = [];
    for (var idx = 0; idx < Runner.filter.parameters.output_filenames.length; idx++) {
        var data = FS.readFile(Runner.filter.parameters.output_filenames[idx], {encoding: 'binary'});
        var output_file = new Blob([data], {"type": "image\/png"});
        output_files.push(output_file);
    }
    return output_files;
};

Runner.Filter.prototype.downloadOutput = function () {
    //var output_path = '/raw/' + this.parameters.output_filename;
    //var data = FS.readFile(output_path, {encoding: 'binary'});
    //var blob = new Blob([data], {"type": "image\/png"});
    //// From FileSaver
    //saveAs(blob, this.parameters.output_filename);
};


Runner.Filter.prototype.setUpFilterControls = function () { 
    /*$(document).keypress(function (press) {
        if (press.which === 13) {
            Runner.filter.execute();
        }
    });*/

    if (Runner.filter.worker) {
        Runner.filter.worker.addEventListener('message', function (e) {
            if (e.data.cmd !== undefined) {
                switch (e.data.cmd) {
                    case 'execute':
                        Runner.filter.execute();
                        break;
                    case 'set_progress':
                        Runner.filter.setProgress(e.data.progress);
                        break;
                    case 'return_output':
                        for (var idx = 0; idx < e.data.output_data.length; idx++) {
                          FS.writeFile(Runner.filter.parameters.output_filenames[idx], e.data.output_data[idx], {encoding: 'binary'});
                        }
                        Runner.filter.postExecute();                        
                        break;
                    default:
                        console.error('Unknown message received from worker');
                }
            }
            else { // Returning processed output image data
                //for (var idx = 0; idx < e.data.output_data.length; idx++) {
                //    FS.writeFile(Runner.filter.parameters.output_filenames[idx], e.data.output_data[idx], {encoding: 'binary'});
                //}
                //Runner.filter.postExecute();
            }
        }, false);
    }
};


Runner.initialize = function () {
    Runner.filter = new Runner.Filter();
    Runner.filter.setUpFilterControls();
};


$(window).load(Runner.initialize);
