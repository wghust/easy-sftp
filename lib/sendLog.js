module.exports = function(logOne) {
  // 基本库
  var path = require('path');
  var os = require('os');
  var Datastore = require('nedb');
  var moment = require('moment');
  var colors = require('colors');
  var exec = require('child_process').exec;
  // 赋值
  var db = {};
  var filePath = path.join(__dirname, '../db/logs.json');
  db.logs = new Datastore(filePath);
  db.logs.loadDatabase();

  var getLocalIp = () => {
    const platform = os.platform();
    let IPv4;
    let network;
    if (platform === 'darwin') {
      network = os.networkInterfaces().en0;
    } else {
      network = os.networkInterfaces().eth0;
    }
    for (let i = 0; i < network.length; i++) {
      if (network[i].family === 'IPv4') {
        IPv4 = network[i].address;
        break;
      }
    }
    return IPv4;
  };

  var getBranch = (fn) => {
    exec('git rev-parse --abbrev-ref HEAD', (err, result) => {
      if (err) {
        fn(false, 'No branch at present');
      } else {
        fn(true, result.toString().replace(/\s+/, ''));
      }
    });
  };

  // 超出数据删除日志
  var clearLog = () => {
    const date = moment(new Date()).subtract(3, 'day').format('YYYY-MM-DD');
    db.logs.remove({
      createTime: {
        $lte: new Date(date + ' 23:59:59')
      }
    }, function(err) {
      if (err) {
        logOne(err);
      }
    });
  };

  // 新增日志
  var addLog = (params) => {
    const doc = {
      createTime: new Date(),
      ip: getLocalIp(),
      ...params
    };
    getBranch((state, result) => {
      doc.branch = result;
      db.logs.insert(doc, function(err) {
        if (err) {
          logOne(err);
        }
      });
      clearLog();
    });
  };

  // 删除所有日志
  var clearLogAll = () => {
    db.logs.remove({}, {
      multi: true
    }, function(err) {
      if (err) {
        logOne(err);
      } else {
        logOne('Delete all logs successfully');
      }
    });
  };

  var getDayLog = (date, fn) => {
    var params = {
      createTime: {
        $gte: new Date(date + ' 00:00:00'),
        $lte: new Date(date + ' 23:59:59')
      }
    };
    logOne(colors.red('\n-----    ' + date + '    -----'));
    db.logs.find(params).sort({
      createTime: -1
    }).exec(function(err, docs) {
      if (err) {
        logOne('Failure to retrieve logs');
      } else {
        if (docs.length === 0) {
          logOne(colors.yellow('\n  >>  No upload operation on that day'));
        }
        for (let i = docs.length - 1; i >= 0; i--) {
          var temp = moment(docs[i].createTime).format('hh:mm:ss');
          var branch = docs[i].branch === undefined ? 'No branch at present' : docs[i].branch;
          logOne(colors.yellow('\n  >>  ' + temp + '  ' + docs[i].statusDesc));
          logOne(colors.cyan('  ||  Local IP：' + docs[i].ip + '  Publishing server：' + docs[i].host));
          logOne(colors.cyan('  ||  Address：' + docs[i].projectPath));
          logOne(colors.cyan('  ||  Branch：' + branch));
          logOne(colors.cyan('  ||  Configuration file：' + docs[i].configFile));
        }
      }
      fn && fn();
    });
  };

  var getTodayLog = () => {
    getDayLog(moment(new Date()).format('YYYY-MM-DD'), () => {
      logOne('\n');
    });
  };

  var getLog = (index) => {
    var date = moment(new Date());
    if (index === 0) {
      date = date.format('YYYY-MM-DD');
    } else {
      date = date.subtract(index, 'day').format('YYYY-MM-DD');
    }
    getDayLog(date, () => {
      index--;
      if (index >= 0) {
        getLog(index);
      } else {
        logOne('\n');
      }
    });
  }

  return {
    addLog: addLog,
    clearLogAll: clearLogAll,
    getLog: getLog,
    getTodayLog: getTodayLog
  }
};