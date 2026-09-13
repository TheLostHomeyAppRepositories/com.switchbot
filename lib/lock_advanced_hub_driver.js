/* jslint node: true */

'use strict';

const HubDriver = require('../drivers/hub_driver');

class LockAdvancedHubDriver extends HubDriver
{

	/**
	 * onOAuth2Init is called when the driver is initialized.
	 */
	async onOAuth2Init()
	{
		super.onOAuth2Init();
		this.lockedTrigger = this.homey.flow.getDeviceTriggerCard('locked');
		this.latchedTrigger = this.homey.flow.getDeviceTriggerCard('latched');
		this.unlockedTrigger = this.homey.flow.getDeviceTriggerCard('unlocked');
		this.log(`${this.constructor.name} has been initialized`);
	}

	/**
	 * onPairListDevices is called when a user is adding a device and the 'list_devices' view is called.
	 * This should return an array with the data of devices that are available for pairing.
	 */
	async onPairListDevices({ oAuth2Client })
	{
		return this.getHUBDevices(oAuth2Client, this.getSupportedLockTypes(), false, this.requiresHub());
	}

	getSupportedLockTypes()
	{
		return [];
	}

	// Wifi-only locks connect directly to the cloud and have no parent SwitchBot Hub
	requiresHub()
	{
		return true;
	}

	async triggerLocked(device, tokens, state)
	{
		this.lockedTrigger.trigger(device, tokens, state).catch(this.error);
	}

	async triggerLatched(device, tokens, state)
	{
		this.latchedTrigger.trigger(device, tokens, state).catch(this.error);
	}

	async triggerUnlocked(device, tokens, state)
	{
		this.unlockedTrigger.trigger(device, tokens, state).catch(this.error);
	}

}

module.exports = LockAdvancedHubDriver;
