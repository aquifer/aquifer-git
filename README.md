#aquifer-git
This extension enable Aquifer to deploy builds of an Aquifer project to a git repo. This makes it easy to deploy Drupal websites to Pantheon or Acquia using Aquifer.

## Installation
To install this extension, in your Aquifer project, run:

```bash
aquifer extension-add aquifer-git
```

## Use
This extension adds a `deploy-git` command to your Aquifer project. When run, this command will checkout a git repository, build the current project into the repository, commit the changes, and push to the origin. This command has a few flags and configuration options that allow you to specify the repository, branch, commit message, and build root.

* `-r --remote` - Repository that this command should deploy to.
* `-b --branch` - Branch within the remote that this command should deploy to.
* `-m --message` - Message that will be applied to the deployment commit.
* `-f --folder` - Folder within the remote repository in which the project should build. (For instance, this should be `docroot` when deploying to an Acquia repository).

All of these options can be set within the `aquifer.json` so that you do not have to specify the flags/values every time you would like to run `deploy-git`. To learn more about setting these options, read the "Configuration" section of this document.

### Example useage
```bash
aquifer deploy-git -r "user@agitrepositoryhost.com:repositoryname.git" -b "master" -m "Version 2.0" -f "docroot"
```

## Configuration
The options for this command can be set in your project's `aquifer.json` file so that you do not have to specify them every time you run `deploy-git`.

_in your `aquifer.json` file:_
```javascript
...
"extensions": {
  "aquifer-git": {
    "source": "aquifer-git",
    "remote": "user@agitrepositoryhost.com:repositoryname.git",
    "branch": "master",
    "folder": "docroot"
  }
}
...
```
