# aquifer-git
This extension enables Aquifer to deploy builds of an Aquifer project to a git repository. This makes it easy to deploy Drupal websites to Pantheon, Acquia, or any repository host.

## Installation
To install aquifer-git, run the below command from within your Aquifer project:

```bash
aquifer extension-add aquifer-git
```

This extension also requires that you have [Git](https://git-scm.com) installed on your development environment and are able to access and push to the remote repository you are deploying to.

## Use
This extension adds a `deploy-git` command to your Aquifer project. When run, it will checkout a git repository, build the current project into the repository, commit the changes, and push to the origin.

There are a few flags and configuration options which allow you to specify the repository, branch, commit message, and build root folder:

* `-r --remote` - Repository that this command should deploy to.
* `-b --branch` - Branch within the remote that this command should deploy to.
* `-m --message` - Message that will be applied to the deployment commit.
* `-f --folder` - Folder within the remote repository in which the project should build. (For instance, this should be `docroot` when deploying to an Acquia repository).
* `-n --name` - Name to use for the deployment commit signature. If name is specified, email is also required.
* `-e --email` - Email to use for the deployment commit signature. If email is specified, name is also required.

All of these options can be set within `aquifer.json` so you do not have to specify the flags/values every time you would like to run `deploy-git`. To learn more about setting these options, read the [Configuration](#configuration) section of this document.

### Example useage
```bash
aquifer deploy-git -r "user@agitrepositoryhost.com:repositoryname.git" -b "master" -m "Version 2.0" -f "docroot"
```

## Configuration
The options for `deploy-git` can be set in your project's `aquifer.json` file so you do not have to specify them every time you run `deploy-git`.

### Available options

#### remote

The remote repository to deploy to.

#### branch

The branch on the remote repository to deploy to.

#### folder

A subfolder within the repository to build into.

#### name

The name to include in the commit signature.

#### email

The email to include in the commit signature.

#### deploymentFiles

_This is deprecated in favor of the [addLinks](#addlinks) option._

An array of objects containing a `src` and `dest` property. These files will be copied from `src` to `dest` after the build and before deploying.

#### excludeLinks

An array of destination directories to exclude when copying linked project directories to build targets. The default is `["sites/default/files"]` to ensure the files directory (which is sometimes quite large) is excluded when building for deployment.

#### addLinks

An array of objects containing `src`, `dest`, and `type` properties. These files or directories will be copied from `src` to `dest` during the build.

#### delPatterns

An array of patterns indicating what should be deleted when clearing the cloned repository in preparation for the new build. The default is `["*", "!.git"]` which deletes everything except the `.git` directory.

### Example configuration:

_in your `aquifer.json` file:_
```json
...
"extensions": {
  "aquifer-git": {
    "source": "aquifer-git",
    "remote": "user@agitrepositoryhost.com:repositoryname.git",
    "branch": "master",
    "folder": "docroot",
    "name": "Deploy Bot",
    "email": "deploybot@aquifer.io",
    "deploymentFiles": [
      {
        "src": "deploy/.gitignore",
        "dest": ".gitignore"
      },
      {
        "src": "deploy/.htaccess",
        "dest": ".htaccess"
      }
    ],
    "excludeLinks": ["sites/default/files"],
    "addlinks": [
      {
        "src": "path/to/dir/in/project",
        "dest": "path/to/dir/in/build",
        "type": "dir"
      }
    ],
    "delPatterns": ["*", "!.git"]
  }
}
...
```
