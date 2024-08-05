// State management for the view: https://liamca.in/Obsidian/API+FAQ/views/persisting+your+view+state

import {ItemView, ViewStateResult, WorkspaceLeaf} from "obsidian";
import {rootMain, rootService} from "./LogConfig";
import MyPlugin from "../main";

export const VIEW_TYPE_EXAMPLE = "example-view";

interface ITechRadarPersistedState {
	techRadarContent: string;
}

export class SampleView extends ItemView implements ITechRadarPersistedState {
	techRadarContent: string;
	svgElement: SVGElement;
	private plugin: MyPlugin;

	constructor(plugin: MyPlugin, leaf: WorkspaceLeaf) {
		super(leaf);
		this.plugin = plugin;

		this.techRadarContent = "";
	}

	getViewType() {
		return VIEW_TYPE_EXAMPLE;
	}

	getDisplayText() {
		return "Tech Radar";
	}

	async onOpen() {
		this.display();
		// FIXME css does not correctly displayed, because the view get not rerendered after the svg is added
		this.registerEvent(this.app.workspace.on("layout-change", () => {
			rootMain.debug("Editor changed");
			this.display();
		}));
	}

	display() {
		const container = this.containerEl.children[1];
		container.empty();
		rootService.debug("Source content: " + this.techRadarContent);
		if (this.techRadarContent === "") {
			container.createEl("div", {text: "No content"});
			return;
		}
		this.plugin.renderSvg(this.techRadarContent, container.createEl("div", {cls: ["cm-preview-code-block", "cm-embed-block", "markdown-rendered"]}), "1", false);
		rootService.debug("Opened view");
	}

	async onClose() {
		// Nothing to clean up.
	}

	async setState(state: ITechRadarPersistedState, result: ViewStateResult): Promise<void> {
		if (state.techRadarContent) {
			this.techRadarContent = state.techRadarContent;
		}
		await super.setState(state, result);
		this.display();
	}

	getState(): ITechRadarPersistedState {
		return {
			techRadarContent: this.techRadarContent,
		};
	}

	setTechRadarMarkdownContent(techRadarContent: string) {
		this.techRadarContent = techRadarContent;
		this.app.workspace.requestSaveLayout();
		this.display();
	}
}
