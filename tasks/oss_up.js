/*
 * grunt-oss-up
 * https://github.com/marshalYuan/grun-oss-up
 *
 * Copyright (c) 2014 marshalYuan
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

	// Please see the Grunt documentation for more information regarding task
	// creation: http://gruntjs.com/creating-tasks
	var OSS = require('oss-client'),
		async = require('async'),
		path = require('path'),
		fs = require('fs'),
		chalk = require('chalk');
		
	grunt.registerMultiTask('oss', 'A grunt tool for uploading static file to aliyun oss.', function() {
		var done = this.async(); 
		// Merge task-specific and/or target-specific options with these defaults.
		var options = this.options({
			/**
             * @name objectGen --return a aliyun oss object name 
			 *					  default return grunt task files' dest + files' name
             * @param dest  --grunt task files' dest
             * @param src  --grunt task files' src
             */
			objectGen: function(dest, src){
				// return [dest, path.basename(src)].join('\/');
				return [dest, src].join('\/');
			}
		});
		
		if(!options.accessKeyId || !options.accessKeySecret || !options.bucket){
			grunt.fail.fatal('accessKeyId, accessKeySecret and bucket are all required!');
		}
		var option = {
				accessKeyId: options.accessKeyId,
				accessKeySecret: options.accessKeySecret
			};
		//creat a new oss-client
		var	oss = new OSS.OssClient(option),
			uploadQue = [];
		// Iterate over all specified file groups.
		this.files.forEach(function(f) {
			// Concat specified files.
			var objects = f.src.filter(function(filepath) {
				// Warn on and remove invalid source files (if nonull was set).
				if (!grunt.file.exists(filepath)) {
					grunt.log.warn('Source file "' + filepath + '" not found.');
					return false;
				} else {
					return true;
				}
			}).map(function(filepath) {
				// return an oss object.
				return {
					bucket: options.bucket,
					object: options.objectGen(f.dest, filepath),
					srcFile: filepath
				};

			});
			objects.forEach(function(o) {
				uploadQue.push(o);	
			});	
		});
		var uploadTasks = [];
		uploadQue.forEach(function(o) {
			uploadTasks.push(makeUploadTask(o));	
		});
		grunt.log.ok('Start uploading files.')
		async.series(uploadTasks, function(error, results) {
			if (error) {
				grunt.fail.fatal("uploadError:"+ JSON.stringify(error));
			} else {
				grunt.log.ok('All files has uploaded yet!');
			}
			done(error, results);
		});
		/**
		 * @name makeUploadTask  -- make task for async
		 * @param object  --aliyun oss object
		 */
		function makeUploadTask(o) {
			return function(callback) {
				//skip object when object's path is a directory;
				if( fs.lstatSync(o.srcFile).isDirectory() ){
					grunt.log.error(chalk.cyan(o.srcFile) + chalk.red(' is a directory, skip it!'));
					callback();
				}else {
					grunt.log.ok('Start uploading file '+ chalk.cyan(o.srcFile));
					oss.putObject(o, function (error, result) {
						callback(error, result);
					});
				}	
			}
		}
	});
};
