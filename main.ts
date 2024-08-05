import {Editor, MarkdownView, Notice, Plugin, TFile, WorkspaceLeaf} from 'obsidian';
import {SampleSettingTab} from "./src/sampleSettingTab";
import {SampleModal} from "./src/sampleModal";
import YAML from "yaml";
import {rootMain} from "./src/LogConfig";
import {SampleView, VIEW_TYPE_EXAMPLE} from "./src/sampleView";
import {DataArray, getAPI} from "obsidian-dataview";


// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export function buildPluginStaticResourceSrc(plug: Plugin, assetPath: string) {
	return plug.app.vault.adapter.getResourcePath([plug.app.vault.configDir, "plugins", plug.manifest.id, assetPath].join("/"))
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	d3: HTMLScriptElement;
	radar: HTMLScriptElement;
	cache: Map<string, string>;

	async activateView(content: string) {
		const {workspace} = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Our view could not be found in the workspace, create a new leaf
			// in the right sidebar for it
			leaf = workspace.getLeaf(true);
			if (leaf === null) {
				return;
			}
			await leaf.setViewState({type: VIEW_TYPE_EXAMPLE, active: true});
		}

		if (!(leaf.view instanceof SampleView)) {
			return;
		}
		leaf.view.setTechRadarMarkdownContent(content);

		// "Reveal" the leaf in case it is in a collapsed sidebar
		workspace.revealLeaf(leaf);
	}

	async onload() {
		await this.loadSettings();

		this.cache = new Map();

		/* usage */
		const element = document.head;
		this.radar = element.createEl("script", {attr: {src: buildPluginStaticResourceSrc(this, "radar.js")}});
		this.d3 = element.createEl("script", {attr: {src: buildPluginStaticResourceSrc(this, "d3.v4.min.js")}});

		this.registerMarkdownCodeBlockProcessor("tech-radar", (source, el, ctx) => {
			this.cache.set(ctx.docId, source);
			this.renderSvg(source, el, ctx.docId, true);
		});

		this.registerView(
			VIEW_TYPE_EXAMPLE,
			(leaf) => new SampleView(this, leaf)
		);

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			const tgt = evt.target;
			rootMain.info("click", typeof tgt);
			if (tgt === null) {
				return;
			}
			// TODO here now needs to be the view shown with the outerHTML of the clicked element
			// @ts-ignore
			if (!tgt.id.startsWith("radar")) {
				rootMain.debug("not radar");
				return;
			}

			// @ts-ignore
			const docId = tgt.id.replace("radar", "");

			// @ts-ignore
			const svgSource = this.cache.get(docId);

			if (svgSource === undefined) {
				rootMain.error("no svg in cache found");
				return;
			}

			// open view with svg Content
			this.activateView(svgSource);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {
		this.radar.remove();
		this.d3.remove();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	getFilesFromQuadrant(quadrant: IQuadrant): TechRadarEntry[] {
		const dataviewPlugin = getAPI(this.app);

		const foundFiles = [];
		for (const tag of quadrant.tags) {

			const dv = dataviewPlugin;
			const files = dv.pages("#" + tag).file;
			rootMain.debug("found files with dataview", files);
			const filteredFiles = files.filter((x: DataArray) => x.frontmatter.tags && x.frontmatter.tags.includes(tag));
			rootMain.debug("filtered files", filteredFiles);

			foundFiles.push(...filteredFiles.map((x: DataArray) => {
				const ring = x.frontmatter.ring ? x.frontmatter.ring : 3;
				const quadrantParam = x.frontmatter.quadrant ? x.frontmatter.quadrant : quadrant.id;
				const moved = x.frontmatter.moved ? x.frontmatter.moved : 0;
				return {
					label: x.name,
					quadrant: quadrantParam,
					ring,
					moved,
					link: x.path
				}
			}));
		}

		return foundFiles;
	}

	renderSvg(source: string, el: HTMLElement, docId: string, thumbnail: boolean) {
		const config = YAML.parse(source);

		const entries: TechRadarEntry[] = [];
		let i = 0;
		for (const quadrant of config["quadrants"]) {
			rootMain.debug("quadrant", quadrant);

			if (!quadrant["tags"]) {
				i++;
				continue;
			}

			const searchParam: IQuadrant = {
				id: i++,
				tags: quadrant["tags"],
				name: quadrant["name"]
			};

			const quadrantEntries = this.getFilesFromQuadrant(searchParam);
			entries.push(...quadrantEntries);
		}

		rootMain.debug("calculated entries", entries);
		config["entries"] = entries;

		const svgTag = "radar" + docId;
		config["svg"] = svgTag;
		config["scale"] = thumbnail ? 0.46 : 1.0;
		config["docId"] = docId;


		el.createSvg("svg", {attr: {id: svgTag}, cls: ["tech-radar-svg"]});
		const scriptTag = el.createEl("script");
		scriptTag.type = "text/javascript";
		scriptTag.text = `radar_visualization(${JSON.stringify(config)})`;
	}
}

interface IQuadrant {
	id: number
	tags: string[]
	name: string
}

interface TechRadarEntry {
	label: string
	quadrant: number
	ring: number
	moved: number
	link: TFile

}
