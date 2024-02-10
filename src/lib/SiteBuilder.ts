import { JSDOM } from "jsdom";
import XML from "./XML";
import { formatDateISO8601, formatDurationHHMMSS } from "./util";
import { Channel, Item } from "./ChannelGenerator";
import mustache from "mustache";

export const HTMLTEMPLATE = "<!DOCTYPE html><head></head><body></body></html>";

type PageBuilder = (document: Document) => void;

export default class SiteBuilder {
  static buildPage(builder: PageBuilder): string {
    const dom = new JSDOM(HTMLTEMPLATE);
    const doc = dom.window.document;
    builder(doc);
    const output = dom.serialize();
    dom.window.close();
    return output;
  }

  static generateItemPageTemplate(): string {
    return SiteBuilder.buildPage((document) => {
      XML.head(document, "{{channel.title}}");
      XML.nav(document.body, "{{channel.link}}", "{{channel.image.url}}", "{{channel.title}}", "{{channel.atomLink}}");

      // Image
      const coverImage = document.createElement("img");
      document.body.appendChild(coverImage);
      coverImage.src = "{{item.itunesImage.href}}";
      coverImage.height = 300;

      // Title
      const itemTitle = document.createElement("h1");
      document.body.appendChild(itemTitle);
      const itemTitleLink = document.createElement("a");
      itemTitle.appendChild(itemTitleLink);
      itemTitleLink.href = "{{item.link}}";
      itemTitleLink.textContent = "{{item.title}}";

      // Duration
      const itemDuration = document.createElement("span");
      itemTitle.appendChild(itemDuration);
      itemDuration.textContent = ` ({{duration}})`;

      // Date
      const dateElement = document.createElement("h2");
      document.body.appendChild(dateElement);
      dateElement.textContent = "{{date}}";

      const audioSection = document.createElement("section");
      document.body.appendChild(audioSection);
      const audioElement = document.createElement("audio");
      audioSection.appendChild(audioElement);
      audioElement.controls = true;
      audioElement.src = "{{item.enclosure.url}}";

      const downloadLinkSpan = document.createElement("span");
      downloadLinkSpan.className = "downloadLink";
      document.body.appendChild(downloadLinkSpan);
      const downloadLinkA = document.createElement("a");
      downloadLinkA.href = "{{item.enclosure.url}}";
      downloadLinkA.textContent = "Download";
      downloadLinkA.title = `Download "{{fileName}}"`;
      downloadLinkSpan.appendChild(downloadLinkA);
      downloadLinkSpan.appendChild(document.createTextNode(` ({{downloadSize}} MB, {{item.enclosure.type}})`));

      const description = document.createElement("section");
      document.body.appendChild(description);
      description.className = "episodeDescription";
      description.innerHTML = "{{{item.description}}}";
    });
  }

  static generateItemPage(template: string, channel: Channel, item: Item): string {
    const pageHTML = mustache.render(template, {
      channel,
      item,
      date: formatDateISO8601(new Date(item.pubDate)),
      duration: formatDurationHHMMSS(item.itunesDuration),
      fileName: item.enclosure.url.substring(item.enclosure.url.lastIndexOf("/") + 1),
      downloadSize: (item.enclosure.length / 1_000_000).toFixed(1),
    });
    return pageHTML;
  }

  static generateIndex(channel: Channel): string {
    return SiteBuilder.buildPage((doc) => {
      XML.head(doc, channel.title);

      const channelImage = doc.createElement("img");
      doc.body.appendChild(channelImage);
      channelImage.className = "channelImage";
      channelImage.src = channel.image.url;
      channelImage.alt = channel.image.title;

      const channelTitle = doc.createElement("h1");
      doc.body.appendChild(channelTitle);
      const titleLink = doc.createElement("a");
      titleLink.href = channel.link;
      titleLink.textContent = channel.title;
      channelTitle.appendChild(titleLink);

      const subscribeP = doc.createElement("p");
      doc.body.appendChild(subscribeP);
      const subscribeLink = doc.createElement("a");
      subscribeLink.href = channel.atomLink;
      subscribeLink.textContent = "Subscribe";
      subscribeP.appendChild(subscribeLink);

      const channelDescription = doc.createElement("p");
      doc.body.appendChild(channelDescription);
      channelDescription.textContent = channel.description;

      const episodesHeader = doc.createElement("h2");
      doc.body.appendChild(episodesHeader);
      episodesHeader.className = "episodesHeader";
      episodesHeader.textContent = "Episodes";

      const itemList = doc.createElement("table");
      doc.body.appendChild(itemList);
      const tbody = doc.createElement("tbody");
      itemList.appendChild(tbody);
      for (const item of channel.items) {
        // Item Row <tr>
        const row = doc.createElement("tr");
        tbody.appendChild(row);
        // Image Cell <td>
        const imgCell = doc.createElement("td");
        row.appendChild(imgCell);
        // Image Element <img>
        const itemIcon = doc.createElement("img");
        imgCell.appendChild(itemIcon);
        itemIcon.src = item.itunesImage.href;
        itemIcon.height = 20;
        // Title Link Cell <td>
        const itemLinkCell = doc.createElement("td");
        row.appendChild(itemLinkCell);
        // Title Link <a>
        const itemLink = doc.createElement("a");
        itemLinkCell.appendChild(itemLink);
        itemLink.href = item.link;
        itemLink.textContent = item.title;
        // Duration <td>
        const durationCell = doc.createElement("td");
        row.appendChild(durationCell);
        durationCell.textContent = `(${formatDurationHHMMSS(item.itunesDuration)})`;
        // Date <td>
        const dateCell = doc.createElement("td");
        row.appendChild(dateCell);
        dateCell.textContent = formatDateISO8601(new Date(item.pubDate));
      }
      // HR below episode list
      doc.body.appendChild(doc.createElement("hr"));
      // Footer
      const footerElement = doc.createElement("footer");
      doc.body.appendChild(footerElement);
      // Docs Link
      const docsLink = doc.createElement("a");
      footerElement.appendChild(docsLink);
      docsLink.href = channel.docs;
      docsLink.textContent = "Docs";
    });
  }

  static generateDocsPage(): string {
    const dom = new JSDOM(HTMLTEMPLATE);
    dom.window.document.title = "Docs";
    const output = dom.serialize();
    return output;
  }
}
