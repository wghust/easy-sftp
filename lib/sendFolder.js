module.exports = function(config, configFile, sendLog, logOne) {
  // 加载模块
  var Client = require('ssh2').Client;
  var exec = require('child_process').exec;
  var ora = require('ora');
  var path = require('path');

  // 初始化
  var spinner = ora({
    text: ''
  });
  var timeStamp = +new Date();
  var baseConfig = {
    host: '',
    port: 22,
    username: 'root',
    password: '',
    pathMap: []
  };
  var conn = new Client();
  var rarList = [];

  var addOneLog = (state, msg) => {
    sendLog.addLog({
      status: state,
      statusDesc: msg,
      host: baseConfig.host,
      configFile: configFile,
      projectPath: path.join(process.cwd(), './')
    });
  };

  var getFolderName = (config, type) => {
    var tempArr = [];
    var folderName = '';
    if (type) {
      tempArr = config.localPath.split('/');
    } else {
      tempArr = config.remotePath.split('/');
    }
    folderName = tempArr[tempArr.length - 1];
    return folderName;
  };

  var compressFolder = (index, fn) => {
    if (index === rarList.length) {
      fn && fn(true);
    } else {
      spinner.start();
      var localPath = path.join(process.cwd(), baseConfig.pathMap[index].localPath);
      var localDir = localPath.substring(0, localPath.lastIndexOf('/'));
      var localFolder = getFolderName(baseConfig.pathMap[index], true);
      var curFolder = rarList[index].substring(0, rarList[index].length - 7);
      exec('cd ' + localDir + ' && cp -rf ./' + localFolder + ' ./' + curFolder + ' && tar -cvzf ' + process.cwd() + '/' + rarList[index] + ' ./' + curFolder + ' && rm -rf ./' + curFolder, (err, stdout, stderr) => {
        if (err) {
          spinner.text = 'Compression failure';
          spinner.fail();
          fn && fn(false);
        } else {
          index++;
          spinner.text = 'Compress No.' + index + ' folder succeed';
          spinner.succeed();
          compressFolder(index, fn);
        }
      });
    }
  };

  var sendFolderOne = (sftp, index, fn) => {
    if (index === rarList.length) {
      fn && fn(true);
    } else {
      var remoteDir = baseConfig.pathMap[index].remotePath.substring(0, baseConfig.pathMap[index].remotePath.lastIndexOf('/'));
      spinner.start();
      spinner.text = 'Begin upload No.' + (index + 1) + 'folder\n （Local address: ' + baseConfig.pathMap[index].localPath + '）\n （Remote Address：' + baseConfig.pathMap[index].remotePath + ')\n';
      sftp.fastPut(process.cwd() + '/' + rarList[index], remoteDir + '/' + rarList[index], {
        step (totalTx, chunk, total) {
          spinner.text = 'Uploading：' + parseInt(totalTx * 100 / total) + '%（Remote Address：' + baseConfig.pathMap[index].remotePath + ')';
        }
      }, (err) => {
        if (err) {
          spinner.text = 'Upload No.' + (index + 1) + ' compression Packet to Server Failed\n （Local address: ' + baseConfig.pathMap[index].localPath + '）\n （Remote Address：' + baseConfig.pathMap[index].remotePath + ')';
          spinner.fail();
          fn && fn(false);
          throw err;
        } else {
          spinner.text = 'Upload No' + (index + 1) + ' compressed Packet to Server Successful\n （Local address: ' + baseConfig.pathMap[index].localPath + '）\n （Remote Address：' + baseConfig.pathMap[index].remotePath + ')';
          spinner.succeed();
          index++;
          sendFolderOne(sftp, index, fn);
        }
      })
    }
  };

  var decompressFolder = (index, fn) => {
    if (index === rarList.length) {
      fn && fn(true);
    } else {
      conn.shell((err, stream) => {
        if (err) {
          throw err;
        }
        spinner.start();
        spinner.text = 'Unzip file';
        stream.on('close', () => {
          spinner.text = 'Successful decompression of files';
          index++;
          decompressFolder(index, fn);
        }).on('data', (data) => {

        }).stderr.on('data', (data) => {
          logOne(data);
        });
        var remoteFolder = getFolderName(baseConfig.pathMap[index], false);
        // var localFolder = getFolderName(baseConfig.pathMap[index], true);
        var curFolder = rarList[index].substring(0, rarList[index].length - 7);
        var remoteDir = baseConfig.pathMap[index].remotePath.substring(0, baseConfig.pathMap[index].remotePath.lastIndexOf('/'));
        stream.end('cd ' + remoteDir +
          ' && rm -rf ./' + remoteFolder +
          ' && tar -xvzf ' + rarList[index] +
          ' && rm -rf ./' + rarList[index] +
          ' && mv ./' + curFolder + ' ./' + remoteFolder +
          ' \nexit\n');
      });
    }
  };

  var removeLocalCache = () => {
    for (var i = 0; i < rarList.length; i++) {
      exec('rm -rf ' + process.cwd() + '/' + rarList[i]);
    }
  };

  var sendFolder = () => {
    logOne('--Upload local files--');
    spinner.start();
    spinner.text = 'Connect to the server...';
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          throw err;
        }
        spinner.text = 'Successful connection';
        spinner.succeed();
        spinner.start();
        spinner.text = 'Start uploading files to the server';
        spinner.succeed();
        sendFolderOne(sftp, 0, (state) => {
          spinner.start();
          if (state) {
            spinner.text = 'Successful upload to server\n';
            spinner.succeed();
            logOne('--Unzip remote files--');
            spinner.start();
            spinner.text = 'Start unzipping folders';
            spinner.succeed();
            decompressFolder(0, (code) => {
              conn.end();
              removeLocalCache();
              spinner.start();
              if (code) {
                spinner.text = 'Successful upload to server';
                spinner.succeed();
                logOne('\n***************\n');
                addOneLog(0, 'Upload Success');
              } else {
                spinner.text = 'Failed to upload to server';
                spinner.fail();
                logOne('\n***************\n');
                addOneLog(1, 'Failed to upload to server');
              }
            });
          } else {
            spinner.text = 'Failed to upload to server\n';
            spinner.fail();
            conn.end();
            removeLocalCache();
            addOneLog(1, 'Failed to upload to server');
          }
        });
      });
    }).connect({
      host: baseConfig.host,
      port: baseConfig.port,
      username: baseConfig.username,
      password: baseConfig.password
    });
    conn.on('error', (err) => {
      if (err) {
        spinner.text = 'Connection server failed';
        spinner.fail();
        addOneLog(1, 'Connection server failed');
        removeLocalCache();
      }
    });
  };

  var beginSendFolder = () => {
    rarList = [];
    for (let i = 0; i < baseConfig.pathMap.length; i++) {
      rarList.push(timeStamp + '_' + i + '.rar.gz');
    }
    exec('cd ' + process.cwd());
    logOne('--Compression of local files--');
    compressFolder(0, (state) => {
      if (state) {
        spinner.start();
        spinner.text = 'Compressed\n';
        spinner.succeed();
        sendFolder();
      } else {
        spinner.start();
        spinner.text = 'Compression failure\n';
        spinner.fail();
        addOneLog(1, 'Compressed file failed');
      }
    });
  };

  var init = () => {
    logOne('\n***************\n');
    try {
      // eslint-disable-next-line no-unused-vars
      var temp = JSON.parse(JSON.stringify(config));
      baseConfig = config;
      logOne('Upload to server：' + baseConfig.host + '\n');
      if (Object.prototype.toString.call(baseConfig.pathMap) === '[object Object]') {
        baseConfig.pathMap = [baseConfig.pathMap];
        beginSendFolder();
      } else if (Object.prototype.toString.call(baseConfig.pathMap) === '[object Array]') {
        beginSendFolder();
      } else {
        spinner.start();
        spinner.text = 'The path format is incorrect. Please check and continue.';
        spinner.fail();
      }
    } catch (e) {
      if (e) {
        spinner.start();
        spinner.text = 'Temporarily support JSON format configuration files';
        spinner.fail();
      }
    }
  };

  init();
};