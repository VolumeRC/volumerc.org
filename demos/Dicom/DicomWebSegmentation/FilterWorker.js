var FilterWorker = FilterWorker || {};

//importScripts('EmscriptenDebug.js', 'CoherenceEnhancingDiffusion.js');
//importScripts('EmscriptenDebug.js', 'CoherenceEnhancingDiffusion.1.js');
//importScripts('EmscriptenDebug.js', 'CoherenceEnhancingDiffusion.1.pretty.js');
importScripts('EmscriptenDebug.js', 'CoherenceEnhancingDiffusion.2.js');
importScripts('EmscriptenDebug.js', 'ConvertAndResample.js');
importScripts('EmscriptenDebug.js', 'CTThresholdSegmentation.js');

// Where to put the raw input and output images.
FS.mkdir('/raw');

self.addEventListener('message', function (e) {
    switch (e.data.cmd) {
        case 'install_input':
            FS.writeFile(e.data.input_filepath, e.data.data, {encoding: 'binary'});
            self.postMessage({'cmd': 'execute'});
            break;
        case 'run_filter':
            var parameters = e.data.parameters;
            var output_filename = '/raw/' + parameters.output_filename;
            var args = [parameters.input_filenames.map(function (a) {
                return '/raw/' + a;
            }).toString(),//'/raw/' + parameters.input_filename,
                output_filename,
                parameters.diffusion_time.toString(),
                parameters.lambda.toString(),
                parameters.diffusion_type,
                parameters.noise_scale.toString(),
                parameters.feature_scale.toString(),
                parameters.exponent.toString()];
            FS.lookupPath("/raw").node;
            Module.callMain(args);

            var output_data = FS.readFile(output_filename, {encoding: 'binary'});
            self.postMessage({'output_data': output_data}, [output_data.buffer]);
            break;
        default:
            console.error('Unknown worker command.');
    }
}, false);