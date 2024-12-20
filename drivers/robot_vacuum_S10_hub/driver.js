/* jslint node: true */

'use strict';

const HubDriver = require('../hub_driver');

class HubVacuumS10Driver extends HubDriver
{

	/**
	 * onOAuth2Init is called when the driver is initialized.
	 */
	async onOAuth2Init()
	{
		super.onOAuth2Init();

		// Device Triggers
		this.stateChangedTrigger = this.homey.flow.getDeviceTriggerCard('vaccum_state_changed');
		this.stateChangedToTrigger = this.homey.flow.getDeviceTriggerCard('vaccum_state_changed_to');
		this.taskChangedTrigger = this.homey.flow.getDeviceTriggerCard('vaccum_task_changed');
		this.taskChangedToTrigger = this.homey.flow.getDeviceTriggerCard('vaccum_task_changed_to');

		this.log('HubVacuumS10Driver has been initialized');
	}

	async onPairListDevices({ oAuth2Client })
	{
		return this.getHUBDevices(oAuth2Client, ['Robot Vacuum Cleaner S10', 'K10+ Pro']);
	}

	async triggerStateChanged(device, tokens, state)
	{
		this.stateChangedTrigger.trigger(device, tokens, state).catch(this.error);
	}

	async triggerStateChangedTo(device, tokens, state)
	{
		this.stateChangedToTrigger.trigger(device, tokens, state).catch(this.error);
	}

	async triggerTaskChanged(device, tokens, state)
	{
		this.taskChangedTrigger.trigger(device, tokens, state).catch(this.error);
	}

	async triggerTaskChangedTo(device, tokens, state)
	{
		this.taskChangedToTrigger.trigger(device, tokens, state).catch(this.error);
	}

}

module.exports = HubVacuumS10Driver;