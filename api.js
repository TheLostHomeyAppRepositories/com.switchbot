/*jslint node: true */
module.exports = {
    async getLog({ homey, query })
    {
        return homey.app.diagLog;
    },
    async getDetect({ homey, query })
    {
        return homey.app.detectedDevices;
    },
    async clearLog({ homey, query })
    {
        homey.app.diagLog = "";
        return 'OK';
    },
    async SendDeviceLog({ homey, query })
    {
        return homey.app.sendLog('deviceLog');
    },
    async SendInfoLog({ homey, query })
    {
        return homey.app.sendLog('infoLog');
    },
    async newData({ homey, body })
    {
        homey.app.newBLEData(body);
        return 'OK';
    },
    async requestDeviceStatus({ homey, query  })
    {
        let retval = await homey.app.getDeviceStatus(query);
        return JSON.stringify( retval, null, 2 );
    },
};