import fs from "fs/promises";
import XML from "./XML";
import { JSDOM } from "jsdom";
import { Channel, ITunesCategory, Item } from "./ChannelGenerator";

export const XSL = `<?xml-stylesheet type="text/xsl" href="/channel.xsl"?>`;
export const XMLHEADER = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE rss>`;
export const RSSTEMPLATE = `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/"></rss>`;

export default class RSS {
  static parse(xml: string): Channel {
    return RSS.parseRSSChannel(xml);
  }

  static parseRSSChannel(xml: string): Channel {
    const dom = new JSDOM(xml, {
      contentType: "application/xml",
    });
    const doc = dom.window.document;

    const channel = doc.getElementsByTagName("channel")[0];
    const atomLink = channel.getElementsByTagName("atom:link")[0].getAttribute("href");
    const title = XML.readElementText(channel, "title");
    const pubDate = XML.readElementText(channel, "pubDate");
    const link = XML.readElementText(channel, "link");
    const language = XML.readElementText(channel, "language");
    const copyright = XML.readElementText(channel, "copyright");
    const docs = XML.readElementText(channel, "docs");
    const description = XML.readElementText(channel, "description");
    const imageElement = channel.getElementsByTagName("image")[0];
    const image = {
      url: XML.readElementText(imageElement, "url"),
      title: XML.readElementText(imageElement, "title"),
      link: XML.readElementText(imageElement, "link"),
    };
    const itunesAuthor = XML.readElementText(channel, "itunes:author");
    const itunesExplicit = Boolean(XML.readElementText(channel, "itunesExplicit"));
    const itunesImageHref = channel.getElementsByTagName("itunes:image")[0].getAttribute("href");
    const itunesKeywords = XML.readElementText(channel, "itunes:keywords");
    const itunesDuration = Number(XML.readElementText(channel, "itunes:duration"));
    const itunesOwner = channel.getElementsByClassName("itunes:owner")[0];
    const itunesName = XML.readElementText(itunesOwner, "itunes:name");
    const itunesEmail = XML.readElementText(itunesOwner, "itunes:email");

    const items = Array.from(channel.getElementsByTagName("item")).map(RSS.parseRSSItem);

    dom.window.close();

    return {
      atomLink,
      title,
      pubDate,
      link,
      language,
      copyright,
      docs,
      description,
      image,
      itunesAuthor,
      itunesDuration,
      itunesExplicit,
      itunesImage: {
        href: itunesImageHref,
      },
      itunesKeywords,
      itunesOwner: {
        itunesName,
        itunesEmail,
      },
      items,
    };
  }

  private static parseRSSItem(element: Element): Item {
    const title = XML.readElementText(element, "title");
    const itunesTitle = XML.readElementText(element, "itunes:title");
    const pubDate = XML.readElementText(element, "pubDate");
    const link = XML.readElementText(element, "link");
    const itunesImage = element.getElementsByTagName("itunes:image")[0].getAttribute("href");
    const description = element.getElementsByTagName("description")[0].firstChild.textContent;
    const enclosureElement = element.getElementsByTagName("enclosure")[0];
    const enclosure = {
      length: Number(enclosureElement.getAttribute("length")),
      type: enclosureElement.getAttribute("type"),
      url: enclosureElement.getAttribute("url"),
    };
    const itunesDuration = Number(XML.readElementText(element, "itunes:duration"));
    const itunesExplicit = Boolean(XML.readElementText(element, "itunes:explicit"));
    const itunesEpisode = Number(XML.readElementText(element, "itunes:episode"));
    const itunesSeason = Number(XML.readElementText(element, "itunes:season"));

    return {
      title,
      itunesTitle,
      pubDate,
      link,
      itunesImage: {
        href: itunesImage,
      },
      description,
      enclosure,
      itunesDuration,
      itunesExplicit,
      itunesEpisode,
      itunesSeason,
    };
  }

  static async channelToRSS(channel: Channel): Promise<string> {
    const dom = new JSDOM(`${RSSTEMPLATE}`, {
      contentType: "application/xml",
    });

    const doc = dom.window.document;

    const rssElement = doc.getElementsByTagName("rss")[0];
    const channelElement = doc.createElement("channel");
    rssElement.appendChild(channelElement);

    const channelChildren: Element[] = [];

    if (channel.atomLink) {
      channelChildren.push(
        XML.element(doc, "atom:link", null, [
          ["href", channel.atomLink],
          ["rel", "self"],
          ["type", "application/rss+xml"],
        ])
      );
    }
    if (channel.title) {
      channelChildren.push(XML.element(doc, "title", channel.title));
    }
    if (channel.image?.url && channel.image.title && channel.image.link) {
      channelChildren.push(XML.element(doc, "image", [XML.element(doc, "url", channel.image.url), XML.element(doc, "title", channel.image.title), XML.element(doc, "link", channel.image.link)]));
    }
    if (channel.pubDate) {
      channelChildren.push(XML.element(doc, "pubDate", channel.pubDate));
    }
    if (channel.language) {
      channelChildren.push(XML.element(doc, "language", channel.language));
    }
    if (channel.description) {
      channelChildren.push(XML.element(doc, "description", channel.description));
    }
    if (channel.link) {
      channelChildren.push(XML.element(doc, "link", channel.link));
    }
    if (channel.copyright) {
      channelChildren.push(XML.element(doc, "copyright", channel.copyright));
    }
    if (channel.generator) {
      channelChildren.push(XML.element(doc, "generator", channel.generator));
    }
    if (channel.docs) {
      channelChildren.push(XML.element(doc, "docs", channel.docs));
    }
    if (channel.itunesAuthor) {
      channelChildren.push(XML.element(doc, "itunes:author", channel.itunesAuthor));
    }
    if (channel.itunesImage.href) {
      channelChildren.push(XML.element(doc, "itunes:image", null, [["href", channel.itunesImage.href]]));
    }
    if (channel.itunesKeywords) {
      channelChildren.push(XML.element(doc, "itunes:keywords", channel.itunesKeywords));
    }
    if (channel.itunesExplicit) {
      channelChildren.push(XML.element(doc, "itunes:explicit", String(channel.itunesExplicit)));
    }
    if (channel.itunesOwner?.itunesName && channel.itunesOwner.itunesEmail) {
      channelChildren.push(XML.element(doc, "itunes:owner", [XML.element(doc, "itunes:name", channel.itunesOwner.itunesName), XML.element(doc, "itunes:email", channel.itunesOwner.itunesEmail)]));
    }
    if (channel.itunesType) {
      channelChildren.push(XML.element(doc, "itunes:type", channel.itunesType));
    }
    if (channel.itunesCategory) {
      const f = (category: ITunesCategory) => {
        const categoryElement = XML.element(doc, "itunes:category", null, [["text", category.text]]);
        if (category.subcategory) {
          const subcategoryElement = XML.element(doc, "itunes:category", null, [["text", category.subcategory]]);
          categoryElement.appendChild(subcategoryElement);
        }
        channelChildren.push(categoryElement);
      };

      if (Array.isArray(channel.itunesCategory)) {
        for (const itunesCategory of channel.itunesCategory) {
          f(itunesCategory);
        }
      } else {
        f(channel.itunesCategory);
      }
    }
    for (const item of channel.items) {
      const itemElement = doc.createElement("item");

      const itemChildren: Element[] = [];

      if (item.title) {
        itemChildren.push(XML.element(doc, "title", item.title));
      }
      if (item.itunesTitle) {
        itemChildren.push(XML.element(doc, "itunes:title", item.itunesTitle));
      }
      if (item.itunesImage?.href) {
        itemChildren.push(XML.element(doc, "itunes:image", null, [["href", item.itunesImage.href]]));
      }
      if (item.pubDate) {
        // Pre-formatted by the Channel Generator.
        itemChildren.push(XML.element(doc, "pubDate", item.pubDate));
      }
      if (item.link) {
        // Use the link as the guid. As long as episode codes are not reused on this domain, they are unique.
        itemChildren.push(XML.element(doc, "guid", item.link, [["isPermalink", "true"]]));
      }
      if (item.link) {
        itemChildren.push(XML.element(doc, "link", item.link));
      }
      if (item.description) {
        // Item descriptions can contain HTML and must be wrapped in a CDATA tag in the feed file.
        // CDATA is added here and not in the Channel property because the CDATA tag is added by the document writer.
        // The parser does not need to remove the CDATA on the other end, it's implicit (I didn't know this before)
        itemChildren.push(XML.element(doc, "description", doc.createCDATASection(item.description)));
      }
      if (item.enclosure?.length && item.enclosure.type && item.enclosure.url) {
        itemChildren.push(
          XML.element(doc, "enclosure", null, [
            ["length", String(item.enclosure.length)],
            ["type", item.enclosure.type],
            ["url", item.enclosure.url],
          ])
        );
      }
      if (item.itunesDuration) {
        itemChildren.push(XML.element(doc, "itunes:duration", String(item.itunesDuration)));
      }
      if (item.itunesExplicit) {
        itemChildren.push(XML.element(doc, "itunes:explicit", String(item.itunesExplicit)));
      }
      if (item.itunesSeason) {
        itemChildren.push(XML.element(doc, "itunes:season", String(item.itunesSeason)));
      }
      if (item.itunesEpisode) {
        itemChildren.push(XML.element(doc, "itunes:episode", String(item.itunesEpisode)));
      }

      XML.appendChildren(itemElement, itemChildren);

      channelChildren.push(itemElement);
    }

    XML.appendChildren(channelElement, channelChildren);

    const output = `${XMLHEADER}${dom.serialize()}`;
    dom.window.close();

    return output;
  }

  static async writeRSS(channel: Channel, rssFile: string): Promise<string> {
    const rss = await RSS.channelToRSS(channel);
    await fs.writeFile(rssFile, rss);
    return rss;
  }
}
