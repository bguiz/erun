#!/usr/bin/env node
/**
 * Usage:
 *
 * erun scriptName environmentName [args...]
 *
 **/

'use strict';

const path = require('path');
const childProcess = require('child_process');

const errors = [];

// Find package.json
const cwd = process.cwd();
const processEnv = process.env;
let packageJson;
let packageJsonPath;
packageJsonPath = processEnv.ERUN_PACKAGEJSON_PATH ||
	// relative to CWD because we don't want erun's package.json,
	// rather the project it is used in
	path.join(cwd, 'package.json');
try {
	packageJson = require(packageJsonPath);
} catch (ex) {
	errors.push(`Failed to read package.json from ${packageJsonPath}`);
	packageJson = {};
}

let script = process.argv[2];
let environment = process.argv[3];
let erunArgs = process.argv.splice(4);

// Compulsory, but using default because will get caught when looking for command
let erunObject = (packageJson.erun && packageJson.erun[script]) || {};

if (!script) {
	errors.push('No script');
}

if (!environment) {
	errors.push('No environment');
}

// Use environment variables that the original process had, plus ones defined in "packageJson.erun[script].env",
// and subtitute them in using the `${VARNAME}` convention
const erunEnv = erunObject.env || {}; // Optional
erunEnv.ERUN_SCRIPT = script;
erunEnv.ERUN_ENVIRONMENT = erunEnv.NODE_ENV || environment || 'default';
erunEnv.NODE_ENV = erunEnv.ERUN_ENVIRONMENT;
const envVarSubtitutionRegex = /\$\{([^\}]+)\}/g ;
//TODO currently relies on key orders in object hash, which is not technically correct,
// so devise a way to detect when this happens and substitute them later
Object.keys(erunEnv).forEach((key) => {
	const substitutedValue = erunEnv[key].replace(envVarSubtitutionRegex, (match, varName) => {
		let value = erunEnv[varName] || processEnv[varName];
		return value;
	});
	erunEnv[key] = substitutedValue;
});
const envVars = Object.assign({}, processEnv, erunEnv);

// Substitute environment variables into main command as well,
// and if they are mising, it will be an error
let command = erunObject.cmd;
if (!command) {
	errors.push(`No command found for ${script}`);
} else {
	command.replace(envVarSubtitutionRegex, (match, varName) => {
		let value = envVars[varName];
		if (typeof value !== 'string') {
			errors.push(`Environment variable not defined for ${varName}`);
			value = '';
		}
		return value;
	});
	command = `${command} ${erunArgs.join(' ')}`;
}
envVars.ERUN_COMMAND = command;

if (errors.length > 0) {
	// Print errors and exit
	console.error(`Failed erun with script='${script}' environment='${environment}'`);
	errors.forEach((err) => {
		console.error(`  - ${err}`);
	});
	process.exit(1);
} else {
	// Now we can finally run the command!
	//TODO support non-unix shell as well
	childProcess.spawn('sh', ['-c', command], {
		env: envVars,
		stdio: 'inherit',
	}).on('close', (childProcessExitCode) => {
		process.exit(childProcessExitCode);
	});
}
