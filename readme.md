### Description

Send folders to Servers by Sftp.

### Installation Guide

```
(sudo) npm install easy-sftp -g
```

### Command List

```
chaos create <file.json>
chaos send -c <file.json>
chaos log  // View logs for three days
chaos log -t // Check the Daily Log
chaos log -r // Clear all logs
```

### Configuration Guide

Go to the current folder:

```
chaos create server.json
```

That will create a config file:

```
{
  "host": "",
  "port": 22,
  "username": "root",
  "password": "",
  "pathMap": [
    {
      "localPath": "",
      "remotePath": ""
    }
  ]
}
```

Then configure the local address, the local address is the relative address, and the online address is the absolute address. Support multiple folder transfers.

Once configured, upload commands can be configured. Create new commands in ``package.json``'s script.

```
"scripts": {
  "upload": "chaos send -c server.json"
}
```

Then when you need to upload, execute ``npm run upload``.

### View Log

```
chaos log  // All Logs
chaos log -t // Today's Logs
```