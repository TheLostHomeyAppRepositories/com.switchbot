/* jslint node: true */

'use strict';

const Homey = require('homey');

class BLEDriver extends Homey.Driver
{

    /**
     * onInit is called when the driver is initialized.
     */
    async onInit()
    {
        this.getBLEDevices = this.getBLEDevices.bind(this);
    }

    checkExist(devices, device)
    {
        return devices.findIndex(device1 => device1.data.address === device.data.address);
    }

    async getBLEDevices(type)
    {
        this.homey.app.bleDiscovery = true;
        this.homey.app.updateLog('BLE Discovery started');
        this.homey.app.detectedDevices = '';
        try
        {
            const devices = [];

            if (this.homey.app.BLEHub)
            {
                const searchData = await this.homey.app.BLEHub.getBLEHubDevices();
                this.homey.app.updateLog(`BLE HUB Discovery: ${this.homey.app.varToString(searchData, 3)}`);

                // Create an array of devices
                for (const deviceData of searchData)
                {
                    try
                    {
                        if (deviceData.serviceData.model === type)
                        {
                            const id = deviceData.address.replace(/:/g, '');

                            const data = {
                                id,
                                pid: id,
                                address: deviceData.address,
                                model: deviceData.serviceData.model,
                                modelName: deviceData.serviceData.modelName,
                            };

                            const device = {
                                name: deviceData.address,
                                data,
                            };

                            this.homey.app.detectedDevices += '\r\nBLE Hub Found device:\r\n';
                            this.homey.app.detectedDevices += this.homey.app.varToString(device);
                            this.homey.api.realtime('com.switchbot.detectedDevicesUpdated', { devices: this.homey.app.detectedDevices });

                            // Add this device to the table
                            devices.push(device);
                        }
                    }
                    catch (err)
                    {
                        this.homey.app.updateLog(`BLE Discovery: ${this.homey.app.varToString(err)}`, 0);
                    }
                }
            }

            let retries = 10;
            while (this.homey.app.blePolling && (retries-- > 0))
            {
                await this.homey.app.Delay(500);
            }

            const bleAdvertisements = await this.homey.ble.discover([], 5000);
            this.homey.app.updateLog(`BLE Discovery: ${this.homey.app.varToString(bleAdvertisements)}`, 3);

            for (const bleAdvertisement of bleAdvertisements)
            {
                try
                {
                    const deviceData = this.parse(bleAdvertisement);
                    if (deviceData)
                    {
                        if (deviceData.serviceData.model === type)
                        {
                            const device = {
                                name: bleAdvertisement.address,
                                data:
                                {
                                    id: deviceData.id,
                                    pid: deviceData.pid,
                                    address: deviceData.address,
                                    model: deviceData.serviceData.model,
                                    modelName: deviceData.serviceData.modelName,
                                },
                            };

                            this.homey.app.detectedDevices += '\r\nBLE Homey Found device:\r\n';
                            this.homey.app.detectedDevices += this.homey.app.varToString(device);
                            if (this.homey.app.BLEHub)
                            {
                                this.homey.api.realtime('com.switchbot.detectedDevicesUpdated', { devices: this.homey.app.detectedDevices });
                            }

                            if (this.checkExist(devices, device) < 0)
                            {
                                devices.push(device);
                            }
                        }
                    }
                }
                catch (err)
                {
                    this.homey.app.updateLog(`BLE Discovery: ${this.homey.app.varToString(err)}`, 0);
                }
            }

            this.homey.app.updateLog('BLE Discovery finished');
            this.homey.app.bleDiscovery = false;
            return devices;
        }
        catch (err)
        {
            this.homey.app.updateLog(`BLE Discovery: ${this.homey.app.varToString(err)}`, 0);
            this.homey.app.bleDiscovery = false;
            throw new Error(err.msg);
        }
    }

    /* ------------------------------------------------------------------
     * parse(device)
     * - Parse advertising packets coming from switchbot devices
     *
     * [Arguments]
     * - device | Object  | Required | A `device` object of noble
     *
     * [Return value]
     * - An object as follows:
     *
     * WoHand
     * {
     *   id: 'c12e453e2008',
     *   address: 'c1:2e:45:3e:20:08',
     *   rssi: -43,
     *   serviceData: {
     *     model: 'H',
     *     modelName: 'WoHand',
     *     mode: false,
     *     state: false,
     *     battery: 95
     *   }
     * }
     *
     * WoSensorTH
     * {
     *   id: 'cb4eb903c96d',
     *   address: 'cb:4e:b9:03:c9:6d',
     *   rssi: -54,
     *   serviceData: {
     *     model: 'T',
     *     modelName: 'WoSensorTH',
     *     temperature: { c: 26.2, f: 79.2 },
     *     fahrenheit: false,
     *     humidity: 45,
     *     battery: 100
     *   }
     * }
     *
     * WoCurtain
     * {
     *   id: 'ec58c5d00111',
     *   address: 'ec:58:c5:d0:01:11',
     *   rssi: -39,
     *   serviceData: {
     *     model: 'c',
     *     modelName: 'WoCurtain',
     *     calibration: true,
     *     battery: 91,
     *     position: 1,
     *     lightLevel: 1
     *   }
     * }
     *
     * If the specified `device` does not represent any switchbot
     * device, this method will return `null`.
     * ---------------------------------------------------------------- */
    parse(device)
    {
        if (!device)
        {
            return null;
        }
        if (!device.serviceData || device.serviceData.length === 0)
        {
            if (device.localName === 'WoHand')
            {
                // looks like a bot device with no service data so make it up
                const data = {
                    id: device.uuid,
                    pid: device.id,
                    address: device.address,
                    rssi: device.rssi,
                    serviceData:
                    {
                        model: 'H',
                        modelName: 'WoHand',
                        mode: false,
                        state: false,
                        battery: 0,
                    },
                };
                return data;
            }
            return null;
        }

        if ((device.serviceData[0].uuid !== '0d00') && (device.serviceData[0].uuid !== 'fd3d'))
        {
            return null;
        }
        const buf = device.serviceData[0].data;
        if (!buf || !Buffer.isBuffer(buf) || buf.length < 3)
        {
            return null;
        }

        const model = buf.slice(0, 1).toString('utf8');
        let sd = null;

        if (model === 'H')
        { // WoHand
            sd = this._parseServiceDataForWoHand(buf);
        }
        else if ((model === 'T') || (model === 'i'))
        { // WoSensorTH
            sd = this._parseServiceDataForWoSensorTH(buf);
        }
        else if (model === 'c')
        { // WoCurtain
            sd = this._parseServiceDataForWoCurtain(buf);
        }
        else if (model === 's')
        { // WoPresence
            sd = this._parseServiceDataForWoPresence(buf);
        }
        else if (model === 'd')
        { // WoContact
            sd = this._parseServiceDataForWoContact(buf);
        }
        else if (model === 'u')
        { // WoBulb
            sd = this._parseServiceDataForWoBulb(device.manufacturerData);
        }
        else
        {
            return null;
        }

        if (!sd)
        {
            return null;
        }
        let address = device.address || '';
        if (address === '')
        {
            address = device.advertisement.manufacturerData || '';
            if (address !== '')
            {
                const str = device.advertisement.manufacturerData.toString('hex').slice(4);
                address = str.substr(0, 2);
                for (let i = 2; i < str.length; i += 2)
                {
                    address = `${address}:${str.substr(i, 2)}`;
                }
                // console.log("address", typeof(address), address);
            }
        }
        else
        {
            address = address.replace(/-/g, ':');
        }
        const data = {
            id: device.uuid,
            pid: device.id,
            address,
            rssi: device.rssi,
            serviceData: sd,
        };
        return data;
    }

    _parseServiceDataForWoHand(buf)
    {
        if (buf.length !== 3)
        {
            return null;
        }
        const byte1 = buf.readUInt8(1);
        const byte2 = buf.readUInt8(2);

        const mode = (byte1 & 0b10000000) !== 0; // Whether the light switch Add-on is used or not
        const state = (byte1 & 0b01000000) === 0; // Whether the switch status is ON or OFF
        const battery = byte2 & 0b01111111; // %

        const data = {
            model: 'H',
            modelName: 'WoHand',
            mode,
            state,
            battery,
        };

        return data;
    }

    _parseServiceDataForWoSensorTH(buf)
    {
        if (buf.length !== 6)
        {
            return null;
        }
        const byte2 = buf.readUInt8(2);
        const byte3 = buf.readUInt8(3);
        const byte4 = buf.readUInt8(4);
        const byte5 = buf.readUInt8(5);

        const tempSign = (byte4 & 0b10000000) ? 1 : -1;
        const tempC = tempSign * ((byte4 & 0b01111111) + (byte3 / 10));
        let tempF = ((tempC * 9) / 5) + 32;
        tempF = Math.round(tempF * 10) / 10;

        const data = {
            model: 'T',
            modelName: 'WoSensorTH',
            temperature:
            {
                c: tempC,
                f: tempF,
            },
            fahrenheit: !!((byte5 & 0b10000000)),
            humidity: (byte5 & 0b01111111),
            battery: (byte2 & 0b01111111),
        };

        return data;
    }

    _parseServiceDataForWoCurtain(buf)
    {
        if (buf.length < 5)
        {
            return null;
        }
        const byte1 = buf.readUInt8(1);
        const byte2 = buf.readUInt8(2);
        const byte3 = buf.readUInt8(3);
        const byte4 = buf.readUInt8(4);

        const calibration = byte1 & 0b01000000; // Whether the calibration is completed
        const battery = (byte2 & 0b01111111); // %
        const currPosition = (byte3 & 0b01111111); // current position %
        const lightLevel = (byte4 >> 4) & 0b00001111; // light sensor level (1-10)

        const data = {
            model: 'c',
            modelName: 'WoCurtain',
            calibration: !!calibration,
            battery,
            position: currPosition,
            lightLevel,
        };

        return data;
    }

    _parseServiceDataForWoPresence(buf)
    {
        if (buf.length !== 6)
        {
            return null;
        }

        const byte1 = buf.readUInt8(1);
        const byte2 = buf.readUInt8(2);
        const byte3 = buf.readUInt8(3);
        const byte4 = buf.readUInt8(4);
        const byte5 = buf.readUInt8(5);

        // console.log( "Pd: ", buf );

        const data = {
            model: 'P',
            modelName: 'WoPresence',
            battery: (byte2 & 0b01111111),
            light: ((byte5 & 0b00000011) === 2),
            range: ((byte5 >> 2) & 0b00000011),
            motion: ((byte1 & 0b01000000) === 0b01000000),
            lastMotion: (byte3 * 256) + byte4,
        };

        return data;
    }

    _parseServiceDataForWoContact(buf)
    {
        if (buf.length !== 9)
        {
            return null;
        }

        const byte1 = buf.readUInt8(1);
        const byte2 = buf.readUInt8(2);
        const byte3 = buf.readUInt8(3);
        const byte4 = buf.readUInt8(4);
        const byte5 = buf.readUInt8(5);
        const byte6 = buf.readUInt8(6);
        const byte7 = buf.readUInt8(7);
        const byte8 = buf.readUInt8(8);

        //this.log('Cd: ', buf);

        const data = {
            model: 'C',
            modelName: 'WoContact',
            motion: ((byte1 & 0b01000000) === 0b01000000),
            battery: (byte2 & 0b01111111),
            light: ((byte3 & 0b00000001) === 0b000000001),
            contact: ((byte3 & 0b00000110) !== 0),
            leftOpen: ((byte3 & 0b00000100) !== 0),
            lastMotion: (byte4 * 256) + byte5,
            lastContact: (byte6 * 256) + byte7,
            buttonPresses: (byte8 & 0b00001111), // Increments every time button is pressed
            entryCount: ((byte8 >> 6) & 0b00000011), // Increments every time button is pressed
            exitCount: ((byte8 >> 4) & 0b00000011), // Increments every time button is pressed
        };

        return data;
    }

    _parseServiceDataForWoBulb(buf)
    {
        if ((buf.length !== 13) || (buf.readUInt8(1) !== 9) || (buf.readUInt8(0) !== 0x69))
        {
            return null;
        }

        const byte8 = buf.readUInt8(8);
        const byte9 = buf.readUInt8(9);
        const byte10 = buf.readUInt8(10);

        //this.log('Cd: ', buf);

        const data = {
            model: 'u',
            modelName: 'WoBulb',
            sequence: byte8,
            on_off: ((byte9 & 0x80) === 0x80),
            dim: (byte9 & 0x7F),
            lightState: (byte10 & 0x03),
        };

        return data;
    }

}
module.exports = BLEDriver;
