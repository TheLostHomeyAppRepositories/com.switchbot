/*jslint node: true */
'use strict';

const Homey = require('homey');

class TemperatureBLEDevice extends Homey.Device
{
    /**
     * onInit is called when the device is initialized.
     */
    async onInit()
    {
        this.log('TemperatureBLEDevice has been initialized');
        this.bestRSSI = 100;
        this.bestHub = "";
    }

    /**
     * onAdded is called when the user adds the device, called just after pairing.
     */
    async onAdded()
    {
        this.log('TemperatureBLEDevice has been added');
    }

    /**
     * onSettings is called when the user updates the device's settings.
     * @param {object} event the onSettings event data
     * @param {object} event.oldSettings The old settings object
     * @param {object} event.newSettings The new settings object
     * @param {string[]} event.changedKeys An array of keys changed since the previous version
     * @returns {Promise<string|void>} return a custom message that will be displayed
     */
    async onSettings({ oldSettings, newSettings, changedKeys })
    {
        this.log('TemperatureBLEDevice settings where changed');
    }

    /**
     * onRenamed is called when the user updates the device's name.
     * This method can be used this to synchronise the name to the device.
     * @param {string} name The new name
     */
    async onRenamed(name)
    {
        this.log('TemperatureBLEDevice was renamed');
    }

    /**
     * onDeleted is called when the user deleted the device.
     */
    async onDeleted()
    {
        await this.blePeripheral.disconnect();
        this.log('TemperatureBLEDevice has been deleted');
    }

    async getDeviceValues()
    {
        try
        {
            const dd = this.getData();

            if (this.bestHub !== "")
            {
                // This device is being controlled by a BLE hub
                if (this.homey.app.IsBLEHubAvailable(this.bestHub))
                {
                    return;
                }

                this.bestHub = "";
            }

            if (dd.id)
            {
                if (this.homey.app.moving === 0)
                {
                    this.homey.app.updateLog("Finding Temperature BLE device", 2);
                    let bleAdvertisement = await this.homey.ble.find(dd.id);
                    this.homey.app.updateLog(this.homey.app.varToString(bleAdvertisement), 3);
                    let rssi = await bleAdvertisement.rssi;
                    this.setCapabilityValue('rssi', rssi);

                    let data = this.driver.parse(bleAdvertisement);
                    if (data)
                    {
                        this.homey.app.updateLog("Parsed Temperature BLE: " + this.homey.app.varToString(data), 2);
                        this.setCapabilityValue('measure_temperature', data.serviceData.temperature.c);
                        this.setCapabilityValue('measure_humidity', data.serviceData.humidity);
                        this.setCapabilityValue('measure_battery', data.serviceData.battery);
                        this.homey.app.updateLog(`Parsed Curtain BLE: temperature = ${data.serviceData.temperature.c}, humidity = ${data.serviceData.humidity}, battery = ${data.serviceData.battery}`, 2);
                    }
                    else
                    {
                        this.homey.app.updateLog("Parsed Temperature BLE: No service data", 1);
                    }
                }
                else
                {
                    this.homey.app.updateLog("Temperature Refresh skipped while moving");
                }
            }
            else
            {
                this.setUnavailable("SwitchBot BLE hub not detected");
            }
        }
        catch (err)
        {
            this.homey.app.updateLog(this.homey.app.varToString(err), 0);
        }
        finally
        {
            this.homey.app.updateLog("Finding Temperature BLE device --- COMPLETE", 2);
        }
    }

    async syncBLEEvents(events)
    {
        try
        {
            const dd = this.getData();
            for (const event of events)
            {
                if (event.address && (event.address == dd.address))
                {
                    this.setCapabilityValue('measure_temperature', event.serviceData.temperature.c);
                    this.setCapabilityValue('measure_humidity', event.serviceData.humidity);
                    this.setCapabilityValue('measure_battery', event.serviceData.battery);
                    this.setCapabilityValue('rssi', event.rssi);

                    if (event.hubMAC && (event.rssi < this.bestRSSI) || (event.hubMAC === this.bestHub))
                    {
                        this.bestHub = event.hubMAC;
                        this.bestRSSI = event.rssi;
                    }

                    this.setAvailable();
                }
            }
        }
        catch (error)
        {
            this.homey.app.updateLog("Error in temperature syncEvents: " + this.homey.app.varToString(error), 0);
        }
    }

}

module.exports = TemperatureBLEDevice;