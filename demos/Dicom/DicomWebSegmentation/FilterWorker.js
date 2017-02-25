var FilterWorker = FilterWorker || {};

importScripts('EmscriptenDebug.js', 'CTThresholdSegmentationAll.js');

// Where to put the raw input and output images.
FS.mkdir('/raw');

self.addEventListener('message', function (e) {
    switch (e.data.cmd) {
        case 'install_input':
            for(var idx=0;idx<e.data.input_filepath.length;idx++) {
                FS.writeFile(e.data.input_filepath[idx], e.data.data[idx], {encoding: 'binary'});
            }
            self.postMessage({'cmd': 'execute'});
            break;
        case 'run_filter':
            var parameters = e.data.parameters;
            var args = [parameters.input_filenames.toString(),parameters.output_filenames.toString()];
            Module.callMain(args);
            var output_data = [];
            var output_data_buffers = [];
            for(var idx=0;idx<parameters.output_filenames.length;idx++) {
                var f = FS.readFile(parameters.output_filenames[idx], {encoding: 'binary'});
                output_data.push(f);
                output_data_buffers.push(f.buffer);
            }
            self.postMessage({'cmd':'return_output','output_data': output_data});
            break;
        default:
            console.error('Unknown worker command.');
    }
}, false);
