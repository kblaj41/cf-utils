'use strict';
let config = require('./config');



/**
 * List the log groups that match the specified filter
 * @param filter string pattern to match
 * @param continuationToken continue listing from this marker
 * @returns {Promise}
 */
function listLogGroups(filter, continuationToken) {
  return new Promise((resolve, reject) => {
    let cw = new config.AWS.CloudWatchLogs();
    let params = {
      logGroupNamePrefix: filter,
      nextToken: continuationToken
    };

    cw.describeLogGroups(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

/**
 * Delete the specified log group
 * @param name the name of the log group
 * @return {Promise}
 */
function deleteLogGroup(name) {
  return new Promise((resolve, reject) => {
    let params = {
      logGroupName: name
    };
    let cw = new config.AWS.CloudWatchLogs();
    cw.deleteLogGroup(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

/**
 * Delete all the log groups that match the specified filter
 * @param filter string pattern to match
 * @returns {Promise}
 */
function deleteLogGroups(filter) {
  return new Promise((resolve, reject) => {

    let listAndDelete = function (continuationToken) {
      return new Promise((resolve, reject) => {
        listLogGroups(filter, continuationToken)
          .then(data => {
            if (data && data.logGroups && data.logGroups.length > 0) {
              Promise.all(
                data.logGroups.map((log) =>
                  new Promise((resolve) => resolve(deleteLogGroup(log.logGroupName)))
                ))
                .then(() => resolve(data.nextToken))
                .catch(err => reject(err));
            } else {
              resolve(data ? data.nextToken : null);
            }
          }).catch(err => reject(err));
      })
      .then(continuationToken => {
        if (continuationToken) {
          return (listAndDelete(continuationToken))
        }
      });
    };

    listAndDelete()
      .then(() => resolve())
      .catch(err => reject(err));
  });
}


module.exports = {
  listLogGroups,
  deleteLogGroup,
  deleteLogGroups
};
