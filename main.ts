import {Plugin, TFile, WorkspaceLeaf} from 'obsidian';
import {DEFAULT_SETTINGS, TechRadarSettings, TechRadarSettingsTab} from "./src/techRadarSettingsTab";
import YAML from "yaml";
import {rootMain} from "./src/LogConfig";
import {TechRadarView, VIEW_TYPE_EXAMPLE} from "./src/techRadarView";
import {DataArray, DataviewApi, getAPI} from "obsidian-dataview";


export function buildPluginStaticResourceSrc(plug: Plugin, assetPath: string) {
	return plug.app.vault.adapter.getResourcePath([plug.app.vault.configDir, "plugins", plug.manifest.id, assetPath].join("/"))
}

export default class TechRadarPlugin extends Plugin {
	settings: TechRadarSettings;
	d3: HTMLScriptElement;
	radar: HTMLScriptElement;
	cache: Map<string, string>;
	dataviewPlugin: DataviewApi;

	async activateView(content: string) {
		const {workspace} = this.app;

		let leaf: WorkspaceLeaf | null;
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

		if (!(leaf.view instanceof TechRadarView)) {
			return;
		}
		leaf.view.setTechRadarMarkdownContent(content);

		// "Reveal" the leaf in case it is in a collapsed sidebar
		workspace.revealLeaf(leaf);
	}

	async onload() {
		await this.loadSettings();
		this.dataviewPlugin = getAPI(this.app);

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
			(leaf) => new TechRadarView(this, leaf)
		);

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new TechRadarSettingsTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			const tgt = evt.target;
			rootMain.info("click", typeof tgt);
			if (tgt === null) {
				return;
			}
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
		return quadrant.tags.flatMap((tag) => {
			const files = this.dataviewPlugin.pages("#" + tag).file;
			rootMain.debug("found files with dataview", files);
			const filteredFiles = files.filter((x: DataArray) => x.frontmatter.tags && x.frontmatter.tags.includes(tag));
			rootMain.debug("filtered files", filteredFiles);

			return filteredFiles.map((x: DataArray) => {
				const ring = x.frontmatter.ring ? x.frontmatter.ring : 3;
				const quadrantParam = x.frontmatter.quadrant ? x.frontmatter.quadrant : quadrant.id;
				const moved = x.frontmatter.moved ? x.frontmatter.moved : 2;
				return {
					label: x.name,
					quadrant: quadrantParam,
					ring,
					moved,
					link: x.path
				}
			}).array();
			// .array() call is needed, otherwise the array is a dataview object and cannot be processed correctly subsequently
		});
	}

	renderSvg(source: string, el: HTMLElement, docId: string, thumbnail: boolean) {
		const config = YAML.parse(source);

		const entries: TechRadarEntry[] = config["quadrants"].flatMap((quadrant: any, index: number) => {
			rootMain.debug("quadrant", quadrant);

			if (!quadrant["tags"]) {
				return [];
			}

			const searchParam: IQuadrant = {
				id: index,
				tags: quadrant["tags"],
				name: quadrant["name"]
			};

			return this.getFilesFromQuadrant(searchParam);
		});

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
