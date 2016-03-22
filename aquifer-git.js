/**
 * @file
 * Git deployment for Aquifer.
 */

/* globals require, Aquifer, AquiferGitConfig, module */

module.exports = (Aquifer, AquiferGitConfig) => {

  'use strict';

  const AquiferGit = () => {};
  const _ = require('lodash');
  const git = require('nodegit');
  const mktemp = require('mktemp');
  const path = require('path');
  const fs = require('fs-extra');

  /**
   * Informs Aquifer of what this deployment script does.
   * @returns {object} details about this deployment script.
   */
  AquiferGit.commands = () => {
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
          },
          folder: {
            name: '-f, --folder <folder_name>',
            default: false,
            description: 'Subfolder in remote repository that should hold the build.'
          },
          name: {
            name: '-n, --name <name>',
            default: false,
            description: 'Name to use for the deployment commit signature.'
          },
          email: {
            name: '-m, --email <email>',
            default: false,
            description: 'Email to use for the deployment commit signature.'
          }
        }
      }
    };
  };

  /**
   * Run when user runs commands within this extension.
   * @param {string} command string representing the name of the command defined in AquiferGit.commands that should run.
   * @param {object} commandOptions options passed from the command.
   * @param {function} callback function that is called when there is an error message to send.
   * @returns {undefined} null.
   */
  AquiferGit.run = (command, commandOptions, callback) => {
    if (command !== 'deploy-git') {
      callback('Invalid command.');
      return;
    }

    let options = {
      deploymentFiles: [],
      excludeLinks: ['sites/default/files'],
      addLinks: [],
      delPatterns: ['*', '!.git']
    };
    let requiredOptions = ['remote', 'branch', 'message'];
    let optionsMissing  = false;
    let build;
    let destPath;
    let repo;
    let index;

    // Parse options and make sure they all exist.
    _.assign(options, AquiferGitConfig, commandOptions, (lastValue, nextValue, name) => {
      return nextValue ? nextValue : lastValue;
    });

    requiredOptions.forEach((name) => {
      if (!options[name]) {
        callback('"' + name + '" option is missing. Cannot deploy.');
        optionsMissing = true;
      }
    });

    if (optionsMissing) {
      return;
    }

    // If we have a name without an email, or an email with no name (like XOR),
    // then we cannot create a custom signature and need to bail out.
    if (!options.name !== !options.email) {
      callback('Both name and email options are required for a custom commit signature.');
      return;
    }

    // Create the destination directory and initiate the promise chain.
    mktemp.createDir('aquifer-git-XXXXXXX')

      // Clone the repository.
      .then((destPath_) => {
        Aquifer.console.log('Cloning the repository into ' + destPath_ + '.', 'status');

        destPath = destPath_;

        let cloneOptions = {
          fetchOpts: {
            callbacks: {
              certificateCheck: () => { return 1; },
              credentials: (url, userName) => {
                return git.Cred.sshKeyFromAgent(userName);
              }
            }
          }
        };

        return git.Clone.clone(options.remote, destPath, cloneOptions);
      })

      // Prepare the repository for the build.
      .then((repo_) => {
        repo = repo_;

        return repo.getCurrentBranch()
          .then((ref) => {
            let currentBranch = ref.toString();

            if (currentBranch === 'refs/heads/' + options.branch) {
              // Nothing to do since we are deploying to the current branch.
              return;
            }

            // Checkout the deployment target branch.
            return repo.getBranchCommit('origin/' + options.branch)
              // Pass the commit along if the remote exists.
              .then((commit) => {
                Aquifer.console.log('Checking out the ' + options.branch + ' branch...', 'status');

                return commit;
              })

              // If no remote exists with the given name pass along the current HEAD commit.
              .catch((err) => {
                Aquifer.console.log('Creating the ' + options.branch + ' branch...', 'status');

                return repo.getHeadCommit();
              })

              // Create the local branch at the commit.
              .then((commit) => {
                return repo.createBranch(options.branch, commit);
              })

              // Checkout the local branch.
              .then(() => {
                return repo.checkoutBranch(options.branch);
              });
          });
      })

      // Build the site.
      .then(() => {
        Aquifer.console.log('Building the site...', 'status');

        let buildOptions = {
          symlink: false,
          delPatterns: options.delPatterns,
          excludeLinks: options.excludeLinks,
          addLinks: options.addLinks
        };

        // Calculate build path.
        let buildPath = destPath;

        // If a folder is specified, add it to the build path.
        if (options.folder) {
          buildPath = path.join(buildPath, options.folder);
        }

        // Create instance of build object.
        build = new Aquifer.api.build(Aquifer);

        return build.create(buildPath, buildOptions);
      })

      // Copy over additional deployment files.
      .then(() => {
        Aquifer.console.log('Copying deployment files...', 'status');
        options.deploymentFiles.forEach(function (link) {
          let src = path.join(Aquifer.projectDir, link.src);
          let dest = path.join(destPath, link.dest);
          fs.copySync(src, dest, {clobber: true});
        });
      })

      // Add all files to the index.
      .then(() => {
        Aquifer.console.log('Adding all files to the index...', 'status');
        return repo.index();
      })
      .then((index_) => {
        index = index_;
        return index.removeAll();
      })
      .then(() => {
        index.write();
      })
      .then(() => {
        return index.addAll();
      })
      .then(() => {
        index.write();
      })

      // Commit changes.
      .then(() => {
        let signature;

        Aquifer.console.log('Commit changes...', 'status');

        if (options.name && options.email) {
          // Use custom signature.
          signature = git.Signature.now(options.name, options.email);
        }
        else {
          // Use default signature.
          signature = git.Signature['default'](repo);
        }

        return repo.createCommitOnHead(['.'], signature, signature, options.message);
      })

      // Push changes.
      .then(() => {
        Aquifer.console.log('Pushing changes to origin/' + options.branch + '...', 'status');
        return repo.getRemote('origin');
      })
      .then((remote) => {
        let ref   = 'refs/heads/' + options.branch;
        let refs  = [ref + ':' + ref];
        let pushOptions = {
          callbacks: {
            certificateCheck: () => { return 1; },
            credentials: (url, userName) => {
              return git.Cred.sshKeyFromAgent(userName);
            }
          }
        };

        return remote.push(refs, pushOptions);
      })

      // Remove the destination path.
      .then(() => {
        Aquifer.console.log('Removing the ' + destPath + ' directory...', 'status');
        fs.removeSync(destPath);
      })

      // Success!
      .then(() => {
        Aquifer.console.log('The site has been successfully deployed!', 'success');
      })

      // Catch any errors.
      .catch((err) => {
        callback(err);
      });
  };

  return AquiferGit;
};
