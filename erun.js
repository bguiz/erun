#!/usr/bin/env node

/**
 * Usage:
 *
 * erun scriptId [environmentId] [args...]
 *
 * - scriptId (compulsory) The name of the script
 * - environmentId (optional) The name of the environment
 *   - but when unspecfied, NODE_ENV environement variable must be set
 * - args (optional) Any additional arguments
 *
 * Expected to find the following in package.json:
 *
 * - Either
 *   - `packageJson.erun[scriptId]`, or
 *   - `packageJson.erun[scriptId+' '+environmentId]`
 * - Each of these should specify
 *   - cmd (compulsory) A CLI string
 *     - may use `${VAR}` type substitution of environment variables
 *   - env (optional) A string-to-string hash of environment variables
 *     - may use `${VAR}` type substitution of environment variables
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

let scriptId = process.argv[2];
let environmentId = process.argv[3];
let erunArgs;
if (environmentId) {
	erunArgs = process.argv.splice(4);
} else {
	// If environment name is unspecified in CLI, attempt to get it from environment variable (if it is set)
	erunArgs = process.argv.splice(3);
	environmentId = process.env.NODE_ENV;
}

let erunObject;
let erunAll = packageJson.erun || {};
let erunConfig = packageJson.erunConfig || {};
if (process.env.ERUN_SCRIPT === scriptId && process.env.ERUN_ENVIRONMENT === environmentId) {
	// Prevent infinite recursion from occurring
	erunObject =
		erunAll[scriptId] || {};
} else {
	const fullEnvId = environmentId;
	let mainEnvId;
	if (erunConfig.envSplitOn) {
		mainEnvId = fullEnvId.split(erunConfig.envSplitOn)[0];
	} else {
		mainEnvId = fullEnvId;
	}
	// First look for a script with both script name and environment name specified
	let mainEnvErunObject = erunAll[scriptId] || {};
	erunObject =
		erunAll[`${scriptId} ${fullEnvId}`] ||
		erunAll[`${scriptId} ${mainEnvId}`];
	if (erunObject) {
		// We found one with both script and environment name specifeid
		// In this special case, when the command is unspecified,
		// we attempt to get it from the erun object without the script specified
		erunObject.cmd = erunObject.cmd || mainEnvErunObject.cmd;
	} else {
		erunObject = mainEnvErunObject;
	}
}

if (!scriptId) {
	errors.push('No script');
}

if (!environmentId) {
	errors.push('No environment');
}

// Use environment variables that the original process had, plus ones defined in "packageJson.erun[scriptId].env",
// and subtitute them in using the `${VARNAME}` convention
const erunEnv = erunObject.env || {}; // Optional
erunEnv.ERUN_SCRIPT = scriptId;
erunEnv.ERUN_ENVIRONMENT = erunEnv.NODE_ENV || environmentId || 'default';
if (erunConfig.envSplitOn) {
	const splitEnv = erunEnv.ERUN_ENVIRONMENT.split(erunConfig.envSplitOn);
	splitEnv.forEach((splitEnvPart, splitEnvIndex) => {
		erunEnv[`NODE_SUB_ENV_${splitEnvIndex}`] = splitEnvPart;
	});
	erunEnv.NODE_ENV = splitEnv[0];
	if (splitEnv[1]){
		erunEnv.NODE_SUB_ENV = splitEnv[1];
	}
} else {
	erunEnv.NODE_ENV = erunEnv.ERUN_ENVIRONMENT;
}
const envVarSubtitutionRegex = /\$\{([^\}]+)\}/g;
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
	errors.push(`No command found for ${scriptId}`);
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
	// eslint-disable-next-line no-console
	console.error(`Failed erun with script='${scriptId}' environment='${environmentId}'`);
	errors.forEach((err) => {
		// eslint-disable-next-line no-console
		console.error(`  - ${err}`);
	});
	process.exit(1);
} else {
	// Finally run the command (via child_process)!
	const [shellName, shellSwitch] =
		(process.platform !== 'win32') ?
		['sh', '-c'] :
		['cmd', '/c'];
	childProcess.spawn(shellName, [shellSwitch, command], {
		env: envVars,
		stdio: 'inherit',
	}).on('close', (childProcessExitCode) => {
		// Ensure that we exit with the same code as the child process -
		// don't swallow error codes, so as to avoid silent failures
		process.exit(childProcessExitCode);
	});
}
