/*--- LogConfig.ts ---*/
import {CategoryConfig, CategoryProvider} from "typescript-logging-category-style";
import {LogLevel} from "typescript-logging";

// @ts-ignore
const logLevel = DEBUG ? LogLevel.Debug : LogLevel.Info;

const params: Partial<CategoryConfig> = {
	level: logLevel,
};
const provider = CategoryProvider.createProvider("ExampleProvider", params);

export function setLogLevel(level: LogLevel) {
	provider.updateRuntimeSettings({level: level});
}

export const rootModel = provider.getCategory("model");
export const rootService = provider.getCategory("service");
export const rootMain = provider.getCategory("main");
