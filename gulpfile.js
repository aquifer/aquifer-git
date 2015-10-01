/**
 * @file
 * Gulp tasks for this project.
 */

'use strict';

var gulp = require('gulp'),
    eslint = require('gulp-eslint'),
    jscs = require('gulp-jscs'),
    bump = require('gulp-bump'),
    gulpHelp = require('gulp-help')(gulp),
    jsFilePatterns = [
      'gulpfile.js',
      '*.js',
      'bin/*.js'
    ];

/**
 * @task lint
 *   Runs JSCS and ESLint on code files.
 */
gulp.task('lint', 'Runs JSCS and ESLint on code files.', function() {
  return gulp.src(jsFilePatterns)
  .pipe(eslint())
  .pipe(eslint.format())
  .pipe(jscs());
});

/**
 * @task watch
 * Runs lint tasks when files are changed.
 */
gulp.task('watch', 'Runs lint tasks when files are changed.', function() {
  gulp.watch(jsFilePatterns, ['lint']);
});

/**
 * @task bump-prerelease
 *   Increment prerelease version by 1.
 */
gulp.task('bump-prerelease', 'Increment prerelease version by 1.', function () {
  gulp.src('./package.json')
  .pipe(bump({type: 'prerelease'}))
  .pipe(gulp.dest('./'));
});

/**
 * @task bump-patch
 *   Increment patch version by 1.
 */
gulp.task('bump-patch', 'Increment patch version by 1.', function () {
  gulp.src('./package.json')
  .pipe(bump({type: 'patch'}))
  .pipe(gulp.dest('./'));
});

/**
 * @task bump-minor
 *   Increment minor version by 1.
 */
gulp.task('bump-minor', 'Increment minor version by 1.', function () {
  gulp.src('./package.json')
  .pipe(bump({type: 'minor'}))
  .pipe(gulp.dest('./'));
});

/**
 * @task bump-major
 *   Increment major version by 1.
 */
gulp.task('bump-major', 'Increment major version by 1.', function () {
  gulp.src('./package.json')
  .pipe(bump({type: 'major'}))
  .pipe(gulp.dest('./'));
});
