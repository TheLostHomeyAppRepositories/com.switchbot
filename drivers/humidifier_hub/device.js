/*jslint node: true */
'use strict';

const Homey = require('homey');

class HumidityHubDevice extends Homey.Device
{
    /**
     * onInit is called when the device is initialized.
     */
    async onInit()
    {
        this.log('HumidityHubDevice has been initialising');
        if (!this.hasCapability("alarm_water"))
        {
            await this.addCapability("alarm_water");
        }

        try
        {
            this.getHubDeviceValues();
        }
        catch(err)
        {
            this.setUnavailable(err.message);
        }
        this.registerCapabilityListener('onoff', this.onCapabilityOnOff.bind(this));
        this.registerMultipleCapabilityListener(['nebulization_mode', 'nebulization_efficiency'], this.onCapabilityNebulization.bind(this));

    }

    // this method is called when the Homey device switches the device on or off
    async onCapabilityOnOff(value, opts)
    {
        let command = value ? "turnOn" : "turnOff";

        return this.sendCommand(command, 'default');
    }

    // this method is called when the Homey device has requested a position change ( 0 to 1)
    async onCapabilityNebulization(valueOj, optsObj)
    {
        let mode = null;
        if (valueOj.nebulization_mode)
        {
            // Mode is true
            mode = 'auto';
        }
        else if (valueOj.nebulization_efficiency)
        {
            // The efficiency has changed
            mode = valueOj.nebulization_efficiency.toString();

            if (this.getCapabilityValue('nebulization_mode'))
            {
                this.homey.setTimeout(() => this.setCapabilityValue('nebulization_mode', false).catch(this.error), 1000);
            }
        }
        else
        {
            // mode must have been false so get the last efficiency
            mode = this.getCapabilityValue('nebulization_efficiency').toString();
        }

        return await this.sendCommand('setMode', mode);
    }

    async sendCommand(command, parameter)
    {
        let data = {
            "command": command,
            "parameter": parameter,
            "commandType": "command"
        };

        const dd = this.getData();
        return this.driver.setDeviceData(dd.id, data);
    }

    async getHubDeviceValues()
    {
        const dd = this.getData();

        try
        {
            let data = await this.driver.getDeviceData(dd.id);
            if (data)
            {
                this.setAvailable();
                this.setCapabilityValue('onoff', data.power == 'on').catch(this.error);
                this.setCapabilityValue('nebulization_efficiency', data.nebulizationEfficiency).catch(this.error);
                this.setCapabilityValue('nebulization_mode', data.auto).catch(this.error);
                this.setCapabilityValue('measure_temperature', data.temperature).catch(this.error);
                this.setCapabilityValue('measure_humidity', data.humidity).catch(this.error);
                this.setCapabilityValue('alarm_water', data.lackWater).catch(this.error);
            }
        }
        catch(err)
        {
            this.log('getHubDeviceValues: ', err);
            this.setUnavailable(err.message);
        }
    }
}

module.exports = HumidityHubDevice;