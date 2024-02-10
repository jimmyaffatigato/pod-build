import fs from "fs/promises";
import path from "path";
import { importJSON, formatDateISO8601, formatEpCode } from "./util";
import { ChannelGenerator, Config, Channel } from "./ChannelGenerator";
import SiteBuilder from "./SiteBuilder";
import RSS from "./RSS";

export const CONFIGPATH = path.join(__dirname, "config.json");
export const CONTENTDIR = path.join(__dirname, "content");
export const PUBLICDIR = path.join(__dirname, "public");
export const RSSFILE = path.join(PUBLICDIR, "rss.xml");
export const EPDIR = path.join(PUBLICDIR, "ep");
export const MEDIADIR = path.join(PUBLICDIR, "media");

const defaultConfig: Config = {
  channel: {
    title: "",
    pubDate: formatDateISO8601(new Date()),
    domain: "",
    author: "",
    description: "",
    imageFile: "",
    email: "",
    items: [],
  },
};

export default class Generator {
  /**
   * Imports `config.json`, builds an `RSSChannel`, and compiles a static site for the content in `./public`.
   */
  static async start(): Promise<void> {
    await Generator.init();
    const config = await importJSON<Config>(CONFIGPATH);
    const channel = await Generator.generateChannel(config);

    if (channel) {
      await RSS.writeRSS(channel, RSSFILE);
      await Generator.buildSite(channel);
    }
  }

  static async init(): Promise<void> {
    try {
      await fs.access(CONTENTDIR);
    } catch {
      await fs.mkdir(CONTENTDIR);
    }

    try {
      await fs.access(PUBLICDIR);
    } catch {
      await fs.mkdir(PUBLICDIR);
    }

    try {
      await fs.access(EPDIR);
    } catch {
      await fs.mkdir(EPDIR);
    }

    try {
      await fs.access(MEDIADIR);
    } catch {
      await fs.mkdir(MEDIADIR);
    }

    try {
      await fs.access(CONFIGPATH);
    } catch {
      const output = defaultConfig as Config & { $schema: string };
      output.$schema = "config.schema.json";
      await fs.writeFile(CONFIGPATH, JSON.stringify(defaultConfig));
    }
  }

  /**
   * Transforms `Config` into `RSSChannel`
   */
  static async generateChannel(config: Config): Promise<Channel> {
    const channel = await ChannelGenerator.compile(config);
    await fs.writeFile(path.join(__dirname, "channel.json"), JSON.stringify(channel));
    return channel;
  }

  static async buildSite(channel: Channel): Promise<void> {
    const indexHTML = SiteBuilder.generateIndex(channel);
    const indexFile = path.join(PUBLICDIR, "index.html");
    const pageTemplate = SiteBuilder.generateItemPageTemplate();
    const pages = channel.items.map((item): { pageHTML: string; outputPath: string } => {
      const pageHTML = SiteBuilder.generateItemPage(pageTemplate, channel, item);
      const itemID = formatEpCode(item.itunesSeason, item.itunesEpisode);
      const outputPath = path.join(EPDIR, `${itemID}.html`);
      return { pageHTML, outputPath };
    });

    await fs.writeFile(indexFile, indexHTML);
    for (const page of pages) {
      const { pageHTML, outputPath } = page;
      await fs.writeFile(outputPath, pageHTML);
    }

    // Move other files - these should probably be declared in config.json
    fs.cp(path.join(CONTENTDIR, "styles.css"), path.join(PUBLICDIR, "styles.css"));
    fs.cp(path.join(CONTENTDIR, "docs.html"), path.join(PUBLICDIR, "docs.html"));
  }
}
