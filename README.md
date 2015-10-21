# aquifer-git
This extension enables Aquifer to deploy builds of an Aquifer project to a git repository. This makes it easy to deploy Drupal websites to Pantheon, Acquia, or any repository host.

## Installation
To install aquifer-git, run the below command from within your Aquifer project:

```bash
aquifer extension-add aquifer-git
```

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
    "email": "deploybot@aquifer.io"
  }
}
...
```
