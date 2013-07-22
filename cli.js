#!/usr/bin/env node
/* jshint laxcomma: true */
var argv = require('optimist').argv
	, exlude = []
;

//	Exclude
manageNamedArgs(exlude, argv.x);
manageNamedArgs(exlude, argv.exclude);

//	



function manageNamedArgs (arrayToAddTo, arg) {
	if (typeof arg === 'string' || typeof arg === 'number') {
		arrayToAddTo.push(arg);
	}	else if (Array.isArray(arg)) {
		arrayToAddTo.concat(arg);
	}
	return arrayToAddTo;
}