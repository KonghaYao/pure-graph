import { TavilyExtract, TavilySearch } from '@langchain/tavily';
export const tavily_search = new TavilySearch({
    maxResults: 5,
    apiBaseUrl: process.env.TAVILY_HOST,
});

export const tavily_extract = new TavilyExtract({
    apiBaseUrl: process.env.TAVILY_HOST,
});
