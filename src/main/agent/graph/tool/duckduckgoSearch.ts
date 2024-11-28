/*
Copyright 2024 SpiralMind Co., Ltd. & Humanest Ltd. & Spiral Effect

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import { Tool, ToolParams } from "@langchain/core/tools";
import { search, SearchOptions } from "duck-duck-scrape";

export {
  SafeSearchType,
  SearchOptions,
  SearchTimeType,
} from "duck-duck-scrape";

export interface DuckDuckGoSearchParameters extends ToolParams {
  /**
   * The search options for the search using the SearchOptions interface
   * from the duck-duck-scrape package.
   */
  searchOptions?: SearchOptions;
  /**
   * The maximum number of results to return from the search.
   * Limiting to 10 to avoid context overload.
   * @default 10
   */
  maxResults?: number;
}

const DEFAULT_MAX_RESULTS = 10;

/**
 * Class for interacting with the DuckDuckGo search engine
 * It extends the base Tool class to perform retrieval.
 */
export class DuckDuckGoSearch extends Tool {
  private searchOptions?: SearchOptions;

  private maxResults = DEFAULT_MAX_RESULTS;

  constructor(params?: DuckDuckGoSearchParameters) {
    super(params ?? {});

    const { searchOptions, maxResults } = params ?? {};
    this.searchOptions = searchOptions;
    this.maxResults = maxResults || this.maxResults;
  }

  static lc_name() {
    return "DuckDuckGoSearch";
  }

  name = "duckduckgo-search";

  description =
    "A search engine. Useful for when you need to answer questions about current events. Input should be a search query.";

  async _call(input: string): Promise<string> {
    const { results } = await search(input, this.searchOptions);

    return JSON.stringify(
      results
        .map((result) => ({
          title: extractText(result.title),
          link: result.url,
          snippet: extractText(result.description),
        }))
        .slice(0, this.maxResults)
    );
  }
}

// Title と description をHTML形式から修正するための関数

import { DataNode, Element, Node } from "domhandler";
import { parseDocument } from "htmlparser2";

const _getText = (nodes: Node[]): string => {
  let text = "";
  for (const node of nodes) {
    if (node instanceof DataNode) {
      text += node.data;
    } else if (node instanceof Element && node.children) {
      text += _getText(node.children);
    }
  }
  return text;
};
const extractText = (html: string): string => {
  const dom = parseDocument(html, { decodeEntities: true }).children;
  return _getText(dom);
};
