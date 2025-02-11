import { Transform } from "node:stream";
import { FileEntry, StreamHandlerOptions } from "./types.js";
import { parseJsonFileEntry } from "./parseJsonFileEntry.js";

const CHARACTERS_PER_TOKEN = 5;

export function filePathToNestedObject(flatObject: {
  [filepath: string]: any;
}): NestedObject<null> {
  const result: NestedObject<null> = {};

  for (const [path, value] of Object.entries(flatObject)) {
    let parts = path.split("/");
    parts = parts[0] === "" ? parts.slice(1) : parts;

    let current: NestedObject<null> = result;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = null;
      } else {
        current[part] = (current[part] as NestedObject<null>) || {};
        current = current[part] as NestedObject<null>;
      }
    }
  }

  return result;
}

const withLeadingSpace = (lineNumber: number, totalLines: number) => {
  const totalCharacters = String(totalLines).length;
  const spacesNeeded = totalCharacters - String(lineNumber).length;
  return " ".repeat(spacesNeeded) + String(lineNumber);
};
const addLineNumbers = (content: string, shouldAddLineNumbers: boolean) => {
  if (!shouldAddLineNumbers) {
    return content;
  }
  const lines = content.split("\n");

  return lines
    .map(
      (line, index) => `${withLeadingSpace(index + 1, lines.length)} | ${line}`,
    )
    .join("\n");
};

const escapeHTML = (str: string) => {
  if (typeof str !== "string") {
    return "";
  }

  return str
    .replace(
      /[&<>'"]/g,
      (tag: string) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        }[tag] || tag),
    )
    .replace(/\u0000/g, "\uFFFD") // Replace null bytes
    .replace(/\u2028/g, "\\u2028") // Line separator
    .replace(/\u2029/g, "\\u2029"); // Paragraph separator
};

interface SizeStats {
  totalFiles: number;
  files: number;
  totalTokens: number;
  tokens: number;
  characters: number;
  lines: number;
}

interface StoredFile {
  path: string;
  entry: FileEntry;
}

export type NestedObject<T = null> = {
  [key: string]: NestedObject<T> | T;
};
export function nestedObjectToTreeString<T>(
  obj: NestedObject<T>,
  prefix: string = "",
  isLast: boolean = true,
): string {
  let result = "";
  const entries = Object.entries(obj);

  entries.forEach(([key, value], index) => {
    const isLastEntry = index === entries.length - 1;
    const newPrefix = prefix + (isLast ? "    " : "│   ");

    result += `${prefix}${isLastEntry ? "└── " : "├── "}${key}\n`;

    if (typeof value === "object" && value !== null) {
      result += nestedObjectToTreeString(
        value as NestedObject<T>,
        newPrefix,
        isLastEntry,
      );
    }
  });

  return result;
}

export class HTMLStreamer extends Transform {
  private hasStreamedHeader = false;
  private fileCount = 0;
  private totalCharacters = 0;
  private totalLines = 0;
  private result: { [path: string]: FileEntry } = {};

  constructor(
    private options: StreamHandlerOptions & {
      shouldAddLineNumbers: boolean;
      href: string;
      ogImageUrl: string;
    },
  ) {
    super({ objectMode: true });
  }

  private async streamHeader() {
    try {
      const url = new URL(this.options.href);

      const response = await fetch(`${url.origin}/view.html`);
      let template = await response.text();

      const { ogImageUrl } = this.options;

      const [_, __, owner, repo, page, branch, ...pathParts] =
        url.pathname.split("/");
      const path = pathParts.join("/");

      const title = `GitHub ${owner}/${repo} LLM Context`;
      const description = `Easily ask your LLM code questions about "${repo}". /${path}${
        branch ? ` at ${branch}` : ""
      } on GitHub`;

      const finalHtml = template
        .replace(
          '<a href="#github-link">',
          `<a href="https://github.com/${owner}/${repo}" target="_blank">`,
        )
        .replace(
          "<title></title>",
          `<title>${title}</title>
            <meta name="description" content="${description}" />
            <meta name="keywords" content="GitHub, LLM, context, code, developer tools" />
            <meta name="author" content="Code From Anywhere" />
            <meta name="robots" content="index, follow" />
            
            <meta property="og:image" content="${
              ogImageUrl ||
              `https://github-og-image.githuq.workers.dev/${owner}/${repo}?path=${path}`
            }" />
            <meta name="twitter:image" content="${
              ogImageUrl ||
              `https://github-og-image.githuq.workers.dev/${owner}/${repo}?path=${path}`
            }" />
            <!-- Facebook Meta Tags -->
        <meta property="og:url" content="${url.toString()}" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image:alt" content="${description}"/>
        <meta property="og:image:width" content="1200"/>
        <meta property="og:image:height" content="600"/>
    
        
        <!-- Twitter Meta Tags -->
        <meta name="twitter:card" content="summary_large_image" />
        <meta property="twitter:domain" content="uithub.com" />
        <meta property="twitter:url" content="${url.toString()}" />
        <meta name="twitter:title" content="${title}" />
        <meta name="twitter:description" content="${description}" />
        
        
        `,
        );

      // Find where to split the template (before the closing body tag)
      const bodyEndIndex = finalHtml.lastIndexOf(`<pre id="textToCopy"></pre>`);
      if (bodyEndIndex === -1) {
        this.push(finalHtml);
        return;
      }

      // Stream everything up to the content div
      const header = finalHtml.slice(0, bodyEndIndex);
      this.push(header);
    } catch (error) {
      console.error("Error fetching base template:", error);
      // Push minimal header as fallback
      this.push(`
        Error fetching base template
      `);
    }
  }

  private stringifyFileContent = (path: string, entry: FileEntry) => {
    const contentOrUrl =
      entry.type === "content" && entry.content
        ? escapeHTML(
            addLineNumbers(entry.content, this.options.shouldAddLineNumbers),
          )
        : entry.type === "binary"
        ? entry.url
        : "";
    return `${path}:\n${"-".repeat(80)}\n${contentOrUrl}\n\n\n${"-".repeat(
      80,
    )}\n`;
  };

  private calculateSizeStats(): SizeStats {
    return {
      totalFiles: this.fileCount,
      files: this.fileCount,
      totalTokens: Math.ceil(this.totalCharacters / CHARACTERS_PER_TOKEN),
      tokens: Math.ceil(this.totalCharacters / CHARACTERS_PER_TOKEN),
      characters: this.totalCharacters,
      lines: this.totalLines,
    };
  }

  async _transform(
    chunk: { path: string; entry: FileEntry },
    encoding: string,
    callback: Function,
  ) {
    try {
      // Stream header if this is the first chunk
      if (!this.hasStreamedHeader) {
        await this.streamHeader();
        this.hasStreamedHeader = true;
      }

      // Update counts
      this.fileCount++;
      if (chunk.entry.type === "content" && chunk.entry.content) {
        this.totalCharacters += chunk.entry.content.length;
        this.totalLines += chunk.entry.content.split("\n").length;
      }
      this.result[chunk.path] = chunk.entry;

      // Stream the formatted file content

      callback();
    } catch (error) {
      callback(error);
    }
  }

  _flush(callback: Function) {
    try {
      // Calculate final stats
      const stats = this.calculateSizeStats();

      const filePart = Object.keys(this.result)
        .map((path) => this.stringifyFileContent(path, this.result[path]))
        .join("");

      const tree = filePathToNestedObject(this.result);
      const treeString = nestedObjectToTreeString(tree);

      const fileString =
        treeString + (this.options.shouldOmitFiles ? "" : "\n\n" + filePart);

      // Push closing content div
      this.push(`<pre id="textToCopy">${fileString}</pre>
    </div>


</body>

</html>`);

      // // Push stats script and closing tags
      // this.push(`
      //   <script>
      //     const data = ${JSON.stringify(stats)};
      //     document.getElementById('tokens').textContent = '~' + ${
      //       stats.tokens
      //     } + ' tokens';
      //   </script>
      //   </body>
      //   </html>
      // `);

      callback();
    } catch (error) {
      callback(error);
    }
  }
}
/*.replace(
      `<pre id="textToCopy"></pre>`,
      `<pre id="textToCopy">${escapeHTML(fileString)}</pre>`,
    )
        .replace('<p id="tokens"></p>', `<p id="tokens">±${tokens} tokens</p>`)
    */

/*
<meta property="og:image" content="${
          ogImageUrl ||
          `https://github-og-image.githuq.workers.dev/${owner}/${repo}?path=${path}&tokens=${totalTokens}`
        }" />
        <meta name="twitter:image" content="${
      ogImageUrl ||
      `https://github-og-image.githuq.workers.dev/${owner}/${repo}?path=${path}&tokens=${totalTokens}`
    }" /
>*/
