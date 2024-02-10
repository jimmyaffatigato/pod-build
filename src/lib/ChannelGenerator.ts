import fs from "fs/promises";
import sharp from "sharp";
import path from "path";
import { dateToRFC2822, GENERATORNAME, formatEpCode, getAudioMetadata } from "./util";
import { CONTENTDIR, MEDIADIR, PUBLICDIR } from "./Generator";

export interface Config {
  channel: {
    /**
     * Title of feed
     */
    title: string;
    /**
     * Publication date of this version of the feed.
     * Any string recognized by `new Date()`
     */
    pubDate: string;
    /**
     * Host domain for links.
     */
    domain: string;
    /**
     * Copyright/License declaration.
     */
    copyright?: string;
    /**
     * Identity of the creator of this feed.
     */
    author: string;
    /**
     * Description.
     */
    description: string;
    /**
     * Image file path and alt text.
     * Generator looks for files in the local `content` directory.
     */
    imageFile: string;
    /**
     * List of keywords.
     */
    keywords?: string[];
    /**
     * Contains explicit content?
     */
    explicit?: boolean;
    /**
     * Contact email for iTunes (public)
     */
    email: string;
    /**
     * Serial or episodic?
     */
    serial?: boolean;

    category?: ITunesCategory | [ITunesCategory, ITunesCategory];
    items: {
      /**
       * Title of this item (without metadata, such as episode number)
       */
      title: string;
      /**
       * Publication date of this item
       */
      pubDate: string;
      /**
       * Local file containing the description of this item (without templates).
       * It will appear as `<description>` with templates such as `footer.html` applied.
       */
      descriptionFile: string;
      /**
       * Names (with extensions) of local audio and image files from the content directory.
       */
      /**
       * Currently assumed to be mp3 type. Don't make things complicated.
       */
      audioFile: string;
      /**
       * Currently assumed to be png type. Don't make things complicated.
       */
      imageFile: string;
      /**
       * Integer representing listening order.
       */
      episode?: number;
      /**
       * Integer grouping episodes.
       */
      season?: number;
      /**
       * Full, Bonus, or Trailer
       * `"full" | "bonus" | "trailer"`
       */
      episodeType?: EpisodeType;
    }[];
  };
}

export interface Channel {
  atomLink: string;
  title: string;
  image: {
    url: string;
    title: string;
    link: string;
  };
  pubDate: string;
  /**
   * Channel description (plain text)
   */
  description?: string;
  link: string;
  copyright?: string;
  language: string;
  generator?: string;
  docs?: string;
  itunesAuthor: string;
  itunesImage: {
    href: string;
  };
  itunesKeywords?: string;
  itunesCategory?: ITunesCategory | [ITunesCategory, ITunesCategory];
  itunesDuration: number;
  itunesExplicit: boolean;
  itunesOwner: {
    itunesName: string;
    itunesEmail: string;
  };
  itunesType?: "episodic" | "serial";
  items: Item[];
}

export interface Item {
  title: string;
  itunesTitle?: string;
  pubDate?: string;
  link?: string;
  itunesImage?: {
    href: string;
  };
  /**
   * Item description (can contain HTML)
   */
  description?: string;
  enclosure?: Enclosure;
  itunesDuration?: number;
  itunesExplicit?: boolean;
  itunesSeason?: number;
  itunesEpisode?: number;
  itunesEpisodeType?: EpisodeType;
  itunesAuthor?: string;
}

export interface Enclosure {
  /**
   * Size in bytes
   */
  length: number;
  /**
   * MIME type (always assumed to be `"audio/mpeg"` in this generator)
   */
  type: string;
  url: string;
}

export type EpisodeType = "full" | "bonus" | "trailer";

export interface ITunesCategory {
  text: string;
  subcategory?: string;
}

export class ChannelGenerator {
  static async compile(config: Config): Promise<Channel> {
    if (!validateConfig(config)) {
      throw new Error("Config failed validation");
    }

    const channelConfig = config.channel;
    const domain = channelConfig.domain;

    // LOAD TEMPLATES
    const footerHTML = await fs.readFile(path.join(CONTENTDIR, "footer.html"), "utf-8");

    const mediaFiles: [string, string][] = [];
    const localImageFile = path.join(CONTENTDIR, channelConfig.imageFile);
    const publicImageFile = path.join(MEDIADIR, channelConfig.imageFile);
    mediaFiles.push([localImageFile, publicImageFile]);

    const imageURL = `${domain}/media/${channelConfig.imageFile}`;

    const channel: Channel = {
      atomLink: `${domain}/rss.xml`,
      title: channelConfig.title,
      pubDate: dateToRFC2822(new Date(channelConfig.pubDate)),
      link: `${domain}`,
      language: "en-us",
      copyright: channelConfig.copyright || "",
      generator: GENERATORNAME,
      docs: `${domain}/docs.html`,
      description: channelConfig.description,
      image: {
        url: imageURL,
        title: channelConfig.title,
        link: domain,
      },
      itunesAuthor: channelConfig.author,
      itunesImage: {
        href: imageURL,
      },
      itunesKeywords: (channelConfig.keywords || []).join(","),
      itunesExplicit: channelConfig.explicit || false,
      itunesOwner: {
        itunesName: channelConfig.author,
        itunesEmail: channelConfig.email,
      },
      itunesType: channelConfig.serial ? "serial" : "episodic",
      itunesCategory: channelConfig.category,
      items: [],
    } as Channel;

    for (const itemConfig of config.channel.items) {
      // TODO: Batch the copy. Keep a list of files.
      // Copy referenced files from `content` to `public/media`
      const audioFileLocalPath = path.join(CONTENTDIR, itemConfig.audioFile);
      const audioFilePublicPath = path.join(MEDIADIR, itemConfig.audioFile);
      mediaFiles.push([audioFileLocalPath, audioFilePublicPath]);

      // TODO: This would be a good place to overwrite ID3 tags (node-id3)
      // TODO: (Low Priority) Verify image properties
      const imageFileLocalPath = path.join(CONTENTDIR, itemConfig.imageFile);
      const imageFilePublicPath = path.join(MEDIADIR, itemConfig.imageFile);
      mediaFiles.push([imageFileLocalPath, imageFilePublicPath]);

      // The public URLs of the audio and image files.
      // DOMAIN/media/filename
      const audioFileURL = `${domain}/media/${itemConfig.audioFile}`;
      const imageFileURL = `${domain}/media/${itemConfig.imageFile}`;

      // Item ID is s##-e##
      const itemID = formatEpCode(itemConfig.season, itemConfig.episode);

      // Define public URL for this item
      const link = `${domain}/ep/${itemID}.html`;

      // Read the metadata of the audio file.
      // The RSS file is required to declare the duration (`<itunes:duration>`)
      // and size (`<enclosure length="12345">`) of the referenced audio.
      // The `AudioMetadata` interface used here could be extended to include
      // more information about the file, including ID3 fields (node-id3)
      const audioMetadata = await getAudioMetadata(audioFileLocalPath);

      // Import description HTML
      const descriptionHTML = await fs.readFile(path.join(CONTENTDIR, itemConfig.descriptionFile), "utf-8");

      // "Append templates"
      const description = [descriptionHTML, footerHTML].join("");
      // TODO: More templates? Necessary?
      const itemProps: Item = {
        // Format full title: "s##-e## - {title}"
        // if a format were to be applied programmatically, it would be here.
        title: `${itemID} - ${itemConfig.title}`,
        itunesTitle: itemConfig.title,
        pubDate: itemConfig.pubDate,
        link,
        itunesImage: {
          href: imageFileURL,
        },
        description,
        itunesDuration: Math.floor(audioMetadata.duration),
        itunesSeason: itemConfig.season,
        itunesEpisode: itemConfig.episode,
        itunesExplicit: channelConfig.explicit,
        itunesEpisodeType: itemConfig.episodeType,
        enclosure: {
          length: Math.floor(audioMetadata.size),
          // Type is assumed to be mp3. Don't complicate things.
          type: "audio/mpeg",
          url: audioFileURL,
        },
      };
      channel.items.push(itemProps);
    }

    // Copy media files
    for (const mediaFile of mediaFiles) {
      const [origin, destination] = mediaFile;
      await fs.cp(origin, destination);
    }

    // Generate `public/favicon.ico` in from channel image
    const faviconImage = sharp(publicImageFile);
    const publicFaviconFile = path.join(PUBLICDIR, "favicon.bmp");
    faviconImage.resize(16, 16);
    await faviconImage.toFile(publicFaviconFile);
    await fs.rename(publicFaviconFile, path.join(PUBLICDIR, "favicon.ico"));

    return channel;
  }
}

export function validateConfig(config: Config): boolean {
  const channel = config.channel;
  return !!channel?.title && !!channel.domain && !!channel.pubDate && !!channel.author && !!channel.description && !!channel.imageFile && !!channel.email;
}
