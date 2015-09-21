/**
 * @file
 * Git deployment for Aquifer.
 */

/* globals require, Aquifer, AquiferGitConfig, module */

module.exports = function(Aquifer, AquiferGitConfig) {

  'use strict';

  var AquiferGit  = function () {},
      _           = require('lodash'),
      git         = require('nodegit'),
      mktemp      = require('mktemp'),
      path        = require('path'),
      fs          = require('fs-extra'),
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
        description: 'Deploys the site to a remote Git repository.',
        options: {
          remote: {
            name: '-r, --remote <remote>',
            description: 'The repository to deploy to.'
          },
          branch: {
            name: '-b, --branch <branch>',
            description: 'The branch to deploy to.'
          },
          message: {
            name: '-m, --message <message>',
            default: 'Deployment from source repository.',
            description: 'The message to use with the deployment commit.'
          }
        }
      }
    };
  };

  /**
   * Run when user runs commands within this extension.
   *
   * @param string command string representing the name of the command defined in AquiferGit.commands that should run.
   * @param object commandOptions options passed from the command.
   * @param function callback function that is called when there is an error message to send.
   */
  AquiferGit.run = function (command, commandOptions, callback) {
    if (command !== 'deploy-git') {
      callback('Invalid command.');
      return;
    }

    var jsonPath        = path.join(Aquifer.projectDir, 'aquifer.json'),
        json            = jsonFile.readFileSync(jsonPath),
        make            = path.join(Aquifer.projectDir, json.paths.make),
        requiredOptions = ['remote', 'branch', 'message'],
        optionsMissing  = false,
        options         = {},
        build, destPath, repo, index;

    // Parse options and make sure they all exist.
    _.assign(options, AquiferGitConfig, commandOptions, function (lastValue, nextValue, name) {
      return nextValue ? nextValue : lastValue;
    });
    requiredOptions.forEach(function (name) {
      if (!options[name]) {
        callback('"' + name + '" option is missing. Cannot deploy.');
        optionsMissing = true;
      }
    });
    if (optionsMissing) {
      return;
    }

    // Create the destination directory and initiate the promise chain.
    mktemp.createDir('aquifer-git-XXXXXXX')

      // Clone the repository.
      .then(function (destPath_) {
        Aquifer.console.log('Cloning the repository into ' + destPath_ + '.', 'status');

        destPath = destPath_;

        var cloneOptions = {
          remoteCallbacks: {
            certificateCheck: function () { return 1; },
            credentials: function(url, userName) {
              return git.Cred.sshKeyFromAgent(userName);
            }
          }
        };

        return git.Clone.clone(options.remote, destPath, cloneOptions);
      })

      // Prepare the repository for the build.
      .then(function (repo_) {
        repo = repo_;

        return repo.getCurrentBranch()
          .then(function (ref) {
            var currentBranch = ref.toString();

            if (currentBranch === 'refs/heads/' + options.branch) {
              // Nothing to do since we are deploying to the current branch.
              return;
            }

            // Checkout the deployment target branch.
            return repo.getBranchCommit('origin/' + options.branch)
              // Pass the commit along if the remote exists.
              .then(function (commit) {
                Aquifer.console.log('Checking out the ' + options.branch + ' branch...', 'status');

                return commit;
              })

              // If no remote exists with the given name pass along the current HEAD commit.
              .catch(function (err) {
                Aquifer.console.log('Creating the ' + options.branch + ' branch...', 'status');

                return repo.getHeadCommit();
              })

              // Create the local branch at the commit.
              .then(function(commit) {
                return repo.createBranch(options.branch, commit);
              })

              // Checkout the local branch.
              .then(function () {
                return repo.checkoutBranch(options.branch);
              });
          });
      })

      // Build the site.
      .then(function () {
        Aquifer.console.log('Building the site...', 'status');

        var buildOptions = {
          symlink: false,
          delPatters: ['*', '!.git']
        };

        build = new Aquifer.api.build(destPath, buildOptions);

        return new Promise(function (resolve, reject) {
          build.create(make, false, path.join(Aquifer.projectDir, Aquifer.project.config.paths.make), false, function (error) {
            if (error) {
              reject();
            }
            else {
              resolve();
            }
          });
        });
      })

      // Copy over additional deployment files.
      .then(function () {
        Aquifer.console.log('Copying deployment files...', 'status');
        options.deploymentFiles.forEach(function (link) {
          var src   = path.join(Aquifer.projectDir, link.src),
              dest  = path.join(destPath, link.dest);
          fs.copySync(src, dest, {clobber: true});
        });
      })

      // Add all files to the index.
      .then(function () {
        Aquifer.console.log('Adding all files to the index...', 'status');
        return repo.index();
      })
      .then(function (index_) {
        index = index_;
        return index.removeAll();
      })
      .then(function () {
        index.write();
      })
      .then(function () {
        return index.addAll();
      })
      .then(function () {
        index.write();
      })

      // Commit changes.
      .then(function () {
        Aquifer.console.log('Commit changes...', 'status');
        var signature = git.Signature['default'](repo);

        return repo.createCommitOnHead(['.'], signature, signature, options.message);
      })

      // Push changes.
      .then(function () {
        Aquifer.console.log('Pushing changes to origin/' + options.branch + '...', 'status');
        return repo.getRemote('origin');
      })
      .then(function (remote) {
        var ref   = 'refs/heads/' + options.branch,
            refs  = [ref + ':' + ref];

        remote.setCallbacks({
          certificateCheck: function () { return 1; },
          credentials: function (url, userName) {
            return git.Cred.sshKeyFromAgent(userName);
          }
        });

        return remote.push(refs);
      })

      // Remove the destination path.
      .then(function () {
        Aquifer.console.log('Removing the ' + destPath + ' directory...', 'status');
        fs.removeSync(destPath);
      })

      // Success!
      .then(function () {
        Aquifer.console.log('The site has been successfully deployed!', 'success');
      })

      // Catch any errors.
      .catch(function (err) {
        callback(err);
      });
  };

  return AquiferGit;
};
