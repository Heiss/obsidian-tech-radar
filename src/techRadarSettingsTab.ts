import {App, PluginSettingTab, Setting} from "obsidian";
import TechRadarPlugin from "../main";


interface TechRadarSettings {
	mySetting: string;
}

export const DEFAULT_SETTINGS: TechRadarSettings = {
	mySetting: 'default'
}

export type {TechRadarSettings};

export class TechRadarSettingsTab extends PluginSettingTab {
	settings: TechRadarSettings;
	plugin: TechRadarPlugin;

	constructor(app: App, plugin: TechRadarPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
