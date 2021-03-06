'use strict'

// Load dependencies
;
Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.filename = undefined;
exports.scan = scan;
exports.load = load;
exports.check = check;
exports.help = help;

var _path = require('path');

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _windowSize = require('window-size');

var _wrapAnsi = require('wrap-ansi');

var _wrapAnsi2 = _interopRequireDefault(_wrapAnsi);

var _chalk = require('chalk');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }

// Cached config object
var config;

// Filename is configurable
var filename = exports.filename = 'env.json';

// Debugger
var debug = function debug() {};
if ('NODE_DEBUG' in process.env && /\bcheckenv\b/i.test(process.env.NODE_DEBUG)) {
	debug = function (message) {
		return console.log((0, _chalk.yellow)('DEBUG: ' + message));
	};
}

// Backwards-compat file exists checker
function access(path) {
	try {
		debug('Looking for ' + path);
		if ('accessSync' in _fs2.default) {
			_fs2.default.accessSync(path, _fs2.default.R_OK);
		} else {
			_fs2.default.closeSync(_fs2.default.openSync(path, 'r'));
		}
		debug('Found ' + path);
		return true;
	} catch (e) {
		debug(e.message);
		return false;
	}
}

// Scans directory tree for env.json
function scan() {
	var current;
	var next = (0, _path.dirname)((0, _path.resolve)(module.parent.filename));
	while (next !== current) {
		current = next;
		var path = (0, _path.resolve)(current, filename);
		if (access(path)) {
			return path;
		}
		next = (0, _path.resolve)(current, '..');
	}

	throw new Error(filename + ' not found anywhere in the current directory tree');
}

// Loads config from found env.json
function load() {
	if (!config) {
		var path = scan();
		config = require(path);
	}
	return config;
}

// Run checks
function check() {
	var pretty = arguments.length <= 0 || arguments[0] === undefined ? true : arguments[0];

	try {
		load();
	} catch (e) {
		if (false === pretty) {
			throw e;
		}

		var pkg = require('../package.json');
		console.error("\n" + (0, _wrapAnsi2.default)(_chalk.bgRed.white('ERROR:') + ' ' + (0, _chalk.blue)(filename) + ' is missing; see ' + (0, _chalk.underline)(pkg.homepage), _windowSize.width) + "\n");
		process.exit(1);
	}

	var required = [];
	var optional = [];

	for (var name in config) {
		debug('Checking for variable ' + name);

		// Check if variable is set
		if (name in process.env) {
			debug('Found variable ' + name);
			return;
		}

		var opts = config[name];

		// Check if variable is set as optional
		var alternateOptional = 'object' !== (typeof opts === 'undefined' ? 'undefined' : _typeof(opts)) && !opts;
		var formalOptional = !alternateOptional && 'object' === (typeof opts === 'undefined' ? 'undefined' : _typeof(opts)) && 'required' in opts && false === opts.required;
		if (alternateOptional || formalOptional) {
			debug(name + ' is optional');
			optional.push(name);
			continue;
		}

		debug(name + ' is required and missing');
		required.push(name);
		if (false === pretty) {
			throw new Error('Environmental variable "' + name + '" must be set');
		}
	}

	if (true === pretty && (required.length || optional.length)) {
		console.error('');
		if (required.length) {
			header(required.length, true);
			required.forEach(function (name) {
				console.error(help(name));
			});
		}
		if (optional.length) {
			if (required.length) {
				console.error('');
			}
			header(optional.length, false);
			optional.forEach(function (name) {
				console.error(help(name));
			});
		}
		console.error('');
	}

	if (required.length) {
		process.exit(1);
	}
}

// Print header
function header(count) {
	var required = arguments.length <= 1 || arguments[1] === undefined ? true : arguments[1];

	var s = 1 === count ? '' : 's';
	var is = 1 === count ? 'is' : 'are';
	var adv = required ? 'required' : 'missing (but optional)';
	var message = ' The following ' + count + ' environmental variable' + s + ' ' + is + ' ' + adv + ': ';
	console.error((0, _wrapAnsi2.default)(required ? _chalk.bgRed.white(message) : _chalk.bgYellow.black(message), _windowSize.width));
}

// Get formatted help for variable
function help(name) {
	load();
	if (!name in config) {
		throw new Error('No configuration for "' + name + '"');
	}

	var help = (0, _chalk.blue)(name);

	if ('object' === _typeof(config[name]) && 'description' in config[name]) {
		help += " " + (0, _wrapAnsi2.default)(config[name].description, _windowSize.width);
	}

	return help;
}