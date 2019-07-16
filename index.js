#!/usr/bin/env node

var program = require('commander');
var packageifm = require('./package.json');
var createFolder = require('./lib/createFolder');
var sendFolder = require('./lib/sendFolder');
var isCmd = false;
var logOne = (msg) => {
  // eslint-disable-next-line no-console
  console.log(msg);
};
var sendLog = require('./lib/sendLog')(logOne);

// 基础参数配置
program
  .command('create <file>')
  .action((file, cmd) => {
    isCmd = true;
    logOne('\n***************\n');
    createFolder(file, logOne);
  });

program
  .command('send')
  .option('-c, --config', 'config file path')
  .action((cmd) => {
    isCmd = true;
    var configPath = process.cwd() + '/' + cmd;
    try {
      var config = require(configPath);
      sendFolder(config, cmd, sendLog, logOne);
    } catch (e) {
      logOne('\n**The configuration file does not exist. Please execute the following code to create the configuration file**\n');
      logOne('********************************\n');
      logOne(' chaos create ' + cmd);
      logOne('\n********************************\n')
    }
  });

program
  .command('log')
  .option('-t, --today', 'today\'s logs')
  .option('-r, --remove', 'clear all logs')
  .action((cmd) => {
    isCmd = true;
    if (cmd.remove) {
      sendLog.clearLogAll();
      return;
    }
    if (cmd.today) {
      sendLog.getTodayLog();
      return;
    }
    sendLog.getLog(2);
  });

program
  .version(packageifm.version)
  .usage('[options]')
  .parse(process.argv);

if (!isCmd) {
  logOne('\n*************************************\n');
  logOne('* author: zhishui\n');
  logOne('* email: zhishui@tongbanjie.com\n');
  logOne('* website: http://newblog.tecclass.cn');
  logOne('\n*************************************\n');
}