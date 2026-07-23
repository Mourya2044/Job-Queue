import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";

export async function loadPlugin(pluginPath) {
    const manifest = JSON.parse(
        await fs.readFile(
            path.join(pluginPath, "plugin.json"),
            "utf8"
        )
    );

    const entryPath = path.join(pluginPath, manifest.entry);

    const module = await import(
        pathToFileURL(entryPath).href
    );

    return {
        manifest,
        execute: module.execute,
    };
}