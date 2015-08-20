/**
 * @file
 * Git deployment for Aquifer.
 */

/* globals require, Aquifer, AquiferGitConfig, module */

module.exports = function(Aquifer, AquiferGitConfig) {

  'use strict';

  var AquiferGit  = function() {},
      Q           = require('q'),
      spawn       = require('child_process').spawn,
      Git         = require('nodegit'),
      mktemp      = require('mktemp'),
      del         = require('del'),
      fs          = require('fs-extra'),
      path        = require('path'),
      jsonFile    = require('jsonfile');

  /**
   * Informs Aquifer of what this deployment script does.
   *
   * @return object
   * Details about this deployment script.
   */
  AquiferGit.commands = function () {
    return {
      'deploy-git': {
        description: 'Deploys Drupal site to a Git repository.',
        options: {
          remote: {
            name: 'remote',
            description: 'The Git remote to deploy to.',
          }
        }
      }
    };
  };

  /**
   * Run when user runs commands within this extension.
   *
   * @param string command string representing the name of the command defined in AquiferGit.commands that should run.
   * @param function callback function that is called when there is a message to send.
   */
  AquiferGit.run = function (command, callback) {
    if (command !== 'deploy-git') {
      callback('Invalid command');
      return;
    }

    var jsonPath  = path.join(Aquifer.projectDir, 'aquifer.json'),
        json      = jsonFile.readFileSync(jsonPath),
        srcPath   = path.join(Aquifer.projectDir, json.paths.builds, 'work'),
        destPath  = null,
        repo      = null,
        runBuild  = function() {
          return Q(new Promise(function (resolve, reject) {
            spawn('aquifer', ['build'])
              .on('close', function (code) {
                if (code !== 0) {
                  reject('Something went wrong with the build. Error code: ' + code);
                }
                resolve();
              });
          }));
        };

    runBuild()
      // Make temporary directory.
      .then(function () {
        console.log('creating temp directory.');
        return mktemp.createDir('tmp/XXXXXXX');
      })
      // Clone the repository.
      .then(function (res) {
        console.log('cloning the repository.');
        destPath = res;
        console.log(destPath);
        return Git.Clone.clone(AquiferGitConfig.repository, destPath, {
          remoteCallbacks: {
            certificateCheck: function() { return 1; },
            credentials: function(url, userName) {
              return Git.Cred.sshKeyFromAgent(userName);
            }
          }
        });
      })
      // Checkout or create the deployment branch.
      .then(function (res) {
        console.log('checkout the deployment branch.');
        repo = res;
        return repo.checkoutBranch(AquiferGitConfig.branch)
          .then(function (branch) {
            console.log('branch exists.');
            // The branch exists.
            return;
          })
          .catch(function (err) {
            console.log('branch does not exist.');
            // Create the branch if it didn't exist.
            return repo.createBranch(AquiferGitConfig.branch, repo.getHeadCommit())
              .then(function (branch) {
                return;
              });
          });
      })
      // Remove everything except the .git directory.
      .then(function () {
        return new Promise(function (resolve, reject) {
          console.log('remove everything.');
          del([destPath + '/*', '!' + destPath + '/.git'], function (err, paths) {
            if (err) {
              reject(err);
            }
            resolve(paths);
          });
        });
      })
      // Copy the built site to the repository.
      .then(function () {
        return new Promise(function (resolve, reject) {
          console.log('copy over the build.');
          fs.copy(srcPath, destPath, function (err) {
            if (err) {
              reject(err);
            }
            resolve();
          });
        });
      })
      // Add all files.
      .then(function() {
        console.log('add all files.');
        return repo.index()
          .then(function(index) {
            return index.removeAll()
              .then(function() {
                index.write();
              })
              .then(function() {
                return index.addAll();
              })
              .then(function() {
                index.write();
              });
          });
      })
      // Commit changes.
      .then(function () {
        console.log('commit changes.');
        var signature = Git.Signature['default'](repo);

        return repo.createCommitOnHead(['.'], signature, signature, 'Automated deployment.');
      })
      // Push changes.
      .then(function () {
        // @TODO: actually push changes.
        console.log('it worked.');
      })
      .catch(function (err) {
        callback(err);
      });
  };

  return AquiferGit;
};
