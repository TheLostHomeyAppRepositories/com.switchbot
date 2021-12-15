'use strict';

const HubDevice = require('../hub_device');

class MyDevice extends HubDevice
{

    /**
     * onInit is called when the device is initialized.
     */
    async onInit()
    {
        this.log('MyDevice has been initialized');
        this.registerCapabilityListener('play_scene', this.onCapabilityStartScene.bind(this));
    }

    async onCapabilityStartScene(value, opts)
    {
        const dd = this.getData();
        const url = `scenes/${dd.id}/execute`;
        await this.driver.PostURL(url);
    }

    /**
     * onAdded is called when the user adds the device, called just after pairing.
     */
    async onAdded()
    {
        this.log('MyDevice has been added');
    }

    /**
     * onRenamed is called when the user updates the device's name.
     * This method can be used this to synchronise the name to the device.
     * @param {string} name The new name
     */
    async onRenamed(name)
    {
        this.log('MyDevice was renamed');
    }

    /**
     * onDeleted is called when the user deleted the device.
     */
    async onDeleted()
    {
        this.log('MyDevice has been deleted');
    }

}

module.exports = MyDevice;
