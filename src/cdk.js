'use strict';
let config = require('./config');
let { spawn } = require('child_process');
let { describeStack } = require('./cloudFormation');

/**
 * Initialize the CDK
 * @param {*} language
 * @return {Promise}
 */
function init(language) {
  return Promise((resolve,reject) =>
    _runCdk(
      ['init', '--language', language],
      (code, err) => {
        if (code !== 0) {
          reject({message: 'CDK init failed', err: err});
        } else {
          resolve();
        }
      }
    )
  );
}

/**
 * Delete a stack using the CDK.
 * @param name fully qualified stack name
 * @param parameters complete listing of stack inputs
 * @return {Promise}
 */
function destroy(name, parameters) {
  return new Promise((resolve, reject) =>
    _runCdk(
      ['destroy', name, '--force'].concat(_buildParams(name, parameters)),
      (code, err) => {
        if (code !== 0) {
          reject({message: 'Stack undeploy failed', err: err});
        } else {
          resolve(name);
        }
      }
    )
  );
}

/**
 * Deploy stack using the CDK.
 * @param name fully qualified stack name
 * @param script full path to stack template
 * @param parameters complete listing of stack inputs
 * @return {Promise}
 */
function deploy(name, script, parameters) {
  return new Promise((resolve, reject) =>
    _runCdk(
      ['deploy', name].concat(_buildParams(name, script, parameters)),
      (code, err) => {
        if (err) {
          if (err.indexOf(`${name} (no changes)`) >= 0) {
            config.logger.info('There are no changes to apply, continuing....');
          } else if (code != 0) {
            reject({message: 'Stack deploy failed', err: err});
            return;
          }
        }
        resolve(describeStack(name));
      }
    )
  );
}

/**
 * Diff stack using the CDK.
 * @param name fully qualified stack name
 * @param script full path to stack template
 * @param parameters complete listing of stack inputs
 * @return {Promise}
 */
function diff(name, script, parameters) {
  console.log('diff: ', name, script, parameters);
  return new Promise((resolve, reject) =>
    _runCdk(
      ['diff', name].concat(_buildParams(name, script, parameters)),
      (code, err) => {
        if (err) {
          reject({message: 'Stack diff failed', err: err});
        } else {
          resolve();
        }
      }
    )
  );
}

/**
 * Synth stack using the CDK.
 * @param name fully qualified stack name
 * @param script full path to stack template
 * @param parameters complete listing of stack inputs
 * @return {Promise}
 */
function synth(name, script, parameters) {
  return new Promise((resolve, reject) =>
    _runCdk(
      ['synth', name].concat(_buildParams(name, script, parameters)),
      (code, err) => {
        if (err) {
          reject({message: 'Stack synth failed', err: err});
        } else {
          resolve(describeStack(name));
        }
      }
    )
  );
}

function _buildParams(name, script, parameters) {
  if (script && !parameters && Array.isArray(script)) {
    parameters = script;
    script = undefined;
  }
  let params = [
    '--profile', config.AWS_PROFILE,
    '--region',  config.AWS_REGION,
    '--require-approval', 'never',
  ];
  if (parameters && parameters.length > 0) {
    for (let i = 0; i < parameters.length; i++) {
      params.push('--parameters')
      params.push(`"${name}:${parameters[i].ParameterKey}=${parameters[i].ParameterValue}"`);
      if (parameters[i].ParameterKey == 'EnvironmentStage' || parameters[i].ParameterKey == 'ResourcePrefix') {
        params.push('--context');
        params.push(`"${parameters[i].ParameterKey}=${parameters[i].ParameterValue}"`);
      }
    }
  }
  params.push('--context');
  params.push(`StackName=${name}`);
  if (script) {
    params.push('--context');
    params.push(`ScriptPath=${script}`);
  }
  return params;
}

function _runCdk(params, onclose) {
  const cli = spawn(
    'cdk',
    params,
    { shell: true, cwd: 'cdk' }
  );

  let err = '';
  cli.stdout.setEncoding('utf8');
  cli.stderr.setEncoding('utf8');
  cli.stdout.on('data', (data) => {
    console.log(data);
  });
  cli.stderr.on('data', (data) => {
    console.log(data);
    err += data;
  });
  cli.on('close', (code) => onclose(code, err));
}

module.exports = {
  diff,
  deploy,
  destroy,
  init,
  synth
};
