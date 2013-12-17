/**
 * phantomas CommonJS module
 */
var debug = require('debug')('phantomas'),
	emitter = require('events').EventEmitter,
	spawn = require('child_process').spawn,
	phantomjs = require('phantomjs'),
	VERSION = require('./package').version;

function phantomas(url, options, callback) {
	var args = [],
		events = new emitter(),
		path = '',
		process,
		results = '';

	// options can be omitted
	if (typeof options === 'function') {
		callback = options;
		options = {};
	}

	debug('URL: <%s>', url);
	debug('Options: %s', JSON.stringify(options));

	// options handling
	options = options || {};

	options.url = url;
	options.format = options.format || 'json';

	// build path to PhantomJS
	path = phantomjs.path;
	args.push(__dirname + '/phantomjs/phantomas.js');

	// build args
	Object.keys(options).forEach(function(key) {
		var val = options[key];

		if (val === false) {
			return;
		}

		args.push('--' + key);

		if (val !== true) {
			args.push(val);
		}
	});

	debug('Running %s %s', path, args.join(' '));

	// spawn the process
	process = spawn(path, args);

	debug('Spawned with pid #%d', process.pid);

	process.on('error', function(err) {
		debug('Error: %s', err);
	});

	// gather data from stdout
	process.stdout.on('data', function(buf) {
		results += buf;
	});

	// process results
	process.on('close', function(code) {
		var json = false;

		debug('Process returned code #%d', code);
		debug('%s', results);

		if (code === 0) {
			// emit RAW data (in format requested as --format)
			events.emit('results', results);

			// (try to) parse to JSON
			if (options.format === 'json') {
				try {
					json = JSON.parse(results);
					events.emit('data', json);
				}
				catch(ex) {
					debug('Error when parsing JSON (%s): %s', ex, results);
				};
			}
		}
		else {
			if (events.listeners('error').length > 0) {
				events.emit('error', code);
			}
		}

		if (typeof callback === 'function') {
			callback(code == 0 ? null : code, json || results);
		}
	});

	return {
		pid: process.pid,
		stdout: process.stdout,
		stderr: process.stderr,
		on: events.on.bind(events)
	};
}

phantomas.version = VERSION;

module.exports = phantomas;