module.exports = function(fileName, logOne) {
  var fs = require('fs');
  var ora = require('ora');
  var formatJson = require('format-json');

  var filePath = process.cwd() + '/' + fileName;
  var spinner = ora({
    text: ''
  });
  var configTpl = {
    host: '',
    port: 22,
    username: 'root',
    password: '',
    pathMap: [{
      localPath: '',
      remotePath: ''
    }]
  };

  var createFile = function() {
    spinner.start();
    spinner.text = 'Start creating configuration files...';
    fs.exists(filePath, (isExist) => {
      if (isExist) {
        spinner.text = 'Configuration file already exists, please confirm and continue';
        spinner.fail();
        logOne('\n***************\n');
      } else {
        fs.writeFile(filePath, formatJson.plain(configTpl), (err) => {
          if (err) {
            spinner.text = 'Failed to create configuration file';
            spinner.fail();
            logOne('\n***************\n');
          } else {
            spinner.text = 'Successful creation of configuration file';
            spinner.succeed();
            logOne('\n***************\n');
          }
        });
      }
    });
  };

  createFile();
};