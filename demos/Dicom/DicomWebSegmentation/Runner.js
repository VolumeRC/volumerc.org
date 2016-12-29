// Emscripten namespace
var Module = Module || {};

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
        input_filename: 'InputImage.png',
        output_filename: 'OutputFiltered.png',
        diffusion_time: 20.0,
        lambda: 0.05,
        diffusion_type: 'cEED',
        noise_scale: 3.0,
        feature_scale: 2.0,
        exponent: 2.0
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


Runner.Filter.prototype.postExecute = function () {
    var output_display_filename = '/display/Output.png';
    var output_filename = '/raw/' + this.parameters.output_filename;
    Module.ccall('ConvertAndResample', 'number',
        ['string', 'string'],
        [output_filename, output_display_filename]);
    var output_data = FS.readFile(output_display_filename, {encoding: 'binary'});
    var output_img = document.getElementById("output-image");
    output_img.src = Runner.binaryToPng(output_data);
    output_img.style.visibility = 'visible';

    var progress_element = $('#execution-progress');
    this.setProgress(0);
    progress_element.removeClass('progress-bar-striped active');
    progress_element.html('Done.');
};


Runner.Filter.prototype.execute = function () {
    var progress_element = $('#execution-progress');
    this.setProgress(0);
    progress_element.addClass('progress-bar-striped active');
    progress_element.html('Starting...');

    this.parameters.output_filename = [];
    var input_filenames = [];
    for (var idx = 0; idx < this.parameters.input_filenames.length; idx++) {
        var input_filename = this.parameters.input_filenames[idx];
        var basename = input_filename.substr(0, input_filename.lastIndexOf('.'));
        var extension = input_filename.substr(input_filename.lastIndexOf('.'));
        input_filenames.push('/raw/' + input_filename);
    }
    this.parameters.output_filename = "output.mha";////basename + 'Filtered' + extension;
    $('#output-filename').html(this.parameters.output_filename);
    var output_filename = '/raw/' + this.parameters.output_filename;

    var args = [input_filenames,//'/raw/' + this.parameters.input_filename,
        output_filename,
        this.parameters.diffusion_time.toString(),
        this.parameters.lambda.toString(),
        this.parameters.diffusion_type,
        this.parameters.noise_scale.toString(),
        this.parameters.feature_scale.toString(),
        this.parameters.exponent.toString()];
    if (this.worker) {
        this.worker.postMessage({'cmd': 'run_filter', 'parameters': this.parameters});
    }
    else {
        Module.callMain(args);
        this.postExecute();
    }
};


Runner.Filter.prototype.displayInput = function (filepath) {
    var input_data = FS.readFile(filepath, {encoding: 'binary'});
    var input_img = document.createElement("img"); //document.getElementById("input-image");
    input_img.className = "img-responsive center-block";
    input_img.alt = filepath;
    input_img.src = Runner.binaryToPng(input_data);
    input_img.style.visibility = 'visible';

    var input_previews = document.getElementById("input-previews");
    input_previews.appendChild(input_img);
};


Runner.Filter.prototype.setInputFile = function (input_files) {
    this.parameters.input_filenames = [];
    for (var idx = 0; idx < input_files.length; idx++) {
        var input_filename = input_files[idx];
        if (typeof input_files[idx] === 'object') {
            input_filename = input_files[idx].name;
        }
        this.parameters.input_filenames.push(input_filename);
        //$('#input-filename').html(input_filename);

        var input_filepath = '/raw/' + input_filename;
        var input_display_filepath = '/display/' + input_filename + '.png';
        // Re-use the file it has already been downloaded.
        /*try {
         FS.stat(input_filepath);
         this.displayInput(input_display_filepath);
         if(this.worker) {
         this.worker.postMessage({'cmd': 'run_filter', 'parameters': this.parameters});
         }
         else {
         Runner.filter.execute();
         }
         }
         catch(err)*/
        {
            /*if(typeof input_files[0] === 'string') {
             console.log('Downloading ' + input_filename);
             xhr = new XMLHttpRequest();
             xhr.open('GET', '../../../imagenes/siggraph.png');////xhr.open('GET', 'images/' + input_filename);
             xhr.responseType = 'arraybuffer';
             xhr.overrideMimeType('application/octet-stream');
             var that = this;
             xhr.onload = function() {
             console.log('Installing ' + input_filename);
             var data = new Uint8Array(xhr.response);
             FS.writeFile(input_filepath, data, { encoding: 'binary' });
             Module.ccall('ConvertAndResample', 'number',
             ['string', 'string'],
             [input_filepath, input_display_filepath]);
             that.displayInput(input_display_filepath);
             if(that.worker) {
             that.worker.postMessage({'cmd': 'install_input',
             'input_filepath': input_filepath,
             'data': data});
             }
             else {
             Runner.filter.execute();
             }
             };
             xhr.send();
             }
             else*/
            { // A File object
                var reader = new FileReader();
                var that = this;
                reader.input_filepath = input_filepath;
                reader.input_display_filepath = input_display_filepath;
                reader.onload = (function (file) {
                    return function (e) {
                        var data = new Uint8Array(e.target.result);
                        FS.writeFile(this.input_filepath, data, {encoding: 'binary'});
                        Module.ccall('ConvertAndResample', 'number',
                            ['string', 'string'],
                            [this.input_filepath, this.input_display_filepath]);
                        that.displayInput(this.input_display_filepath);
                        if(that.worker) {
                         that.worker.postMessage({'cmd': 'install_input',
                         'input_filepath': this.input_filepath,
                         'data': data});
                         }
                         else {
                         Runner.filter.execute();
                         }
                    }
                })(input_files[idx]);
                reader.readAsArrayBuffer(input_files[idx]);
            }
        }
    }
};


Runner.Filter.prototype.downloadOutput = function () {
    var output_path = '/raw/' + this.parameters.output_filename;
    var data = FS.readFile(output_path, {encoding: 'binary'});
    var blob = new Blob([data], {"type": "image\/png"});
    // From FileSaver
    saveAs(blob, this.parameters.output_filename);
};


Runner.Filter.prototype.setUpFilterControls = function () {
    /*$('#diffusion-time-slider').slider({
     value: (Runner.filter.parameters.diffusion_time != undefined) ? Runner.filter.parameters.diffusion_time : 20 ,
     scale: 'logarithmic',
     precision: 2
     })
     .on('slide', function(ee) {
     Runner.filter.parameters.diffusion_time = ee.value;
     });*/
    Runner.filter.parameters.diffusion_time = 20;

    /*$('#lambda-slider').slider({
     scale: 'logarithmic',
     precision: 4,
     reversed: true
     })
     .on('slide', function(ee) {
     Runner.filter.parameters.lambda = ee.value;
     });*/

    /*$('#diffusion-type').change(function(ee) {
     Runner.filter.parameters.diffusion_type = ee.target.value;
     });*/

    /*$('#noise-scale-slider').slider({
     precision: 1
     })
     .on('slide', function(ee) {
     Runner.filter.parameters.noise_scale = ee.value;
     });*/

    /*$('#feature-scale-slider').slider({
     precision: 1
     })
     .on('slide', function(ee) {
     Runner.filter.parameters.feature_scale = ee.value;
     });*/

    /*$('#exponent-slider').slider({
     precision: 1
     })
     .on('slide', function(ee) {
     Runner.filter.parameters.exponent = ee.value;
     });*/

    /*if(window.File && window.FileReader && window.FileList && window.Blob) {
     file_input = $('#file-input');
     file_input[0].disabled = "";
     }*/

    /*$('#download').submit(function(e) {
     e.preventDefault();
     Runner.filter.downloadOutput();
     return false;
     });*/

    /*$('#execute-button').on('click', function() {
     Runner.filter.execute();
     });*/
    $(document).keypress(function (press) {
        if (press.which === 13) {
            Runner.filter.execute();
        }
    });


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
                    default:
                        console.error('Unknown message received from worker');
                }
            }
            else { // Returning processed output image data
                var output_filename = '/raw/' + Runner.filter.parameters.output_filename;
                FS.writeFile(output_filename, e.data.output_data, {encoding: 'binary'});
                Runner.filter.postExecute();
            }
        }, false);
    }
};


Runner.initialize = function () {
    Runner.filter = new Runner.Filter();
    Runner.filter.setUpFilterControls();
    //Runner.filter.setInputFile('InputImage.png');
};


$(window).load(Runner.initialize);