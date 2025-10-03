import { AgentProtocol } from './types';
import { StructuredTool } from '@langchain/core/tools';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import * as tavily from './tools/tavily';
const prebuiltTools: Record<string, StructuredTool> = {
    ...tavily,
};

export const createPrebuiltTools = async (protocol: AgentProtocol): Promise<StructuredTool[]> => {
    const PrebuiltConfigs = protocol.tools.filter((i) => i.tool_type === 'builtin');
    if (PrebuiltConfigs.length === 0) {
        return [];
    }
    return PrebuiltConfigs.map((i) => prebuiltTools[i.name]);
};

export const createMCPTools = async (protocol: AgentProtocol): Promise<StructuredTool[]> => {
    const MCPConfigs = protocol.tools.filter((i) => i.tool_type === 'mcp');
    if (MCPConfigs.length === 0) {
        return [];
    }
    const client = new MultiServerMCPClient({
        mcpServers: Object.fromEntries(
            MCPConfigs.map((i) => [
                i.name,
                {
                    url: i.url,
                    headers: i.headers,
                },
            ]),
        ),
    });
    return client.getTools();
};

export const createTools = async (protocol: AgentProtocol): Promise<StructuredTool[]> => {
    return [...(await createMCPTools(protocol)), ...(await createPrebuiltTools(protocol))];
};
