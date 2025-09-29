export interface AgentTool {
    name: string;
    tool_type: string;
    description?: string;
}

export interface MCPTool extends AgentTool {
    tool_type: 'mcp';
    type: string;
    url: string;
    headers?: Record<string, string>;
}
export interface PrebuiltTool extends AgentTool {
    tool_type: 'prebuilt';
}

export interface InnerTool extends AgentTool {
    tool_type: 'inner';
}

export interface SubAgent {
    protocolId: string;
    protocol?: AgentProtocol;
}

export interface AgentProtocol {
    id: string;
    protocolVersion: string;
    name: string;
    description: string;
    url: string;
    iconUrl?: string;
    version: string;
    documentationUrl?: string;
    llm: {
        provider?: string;
        model: string;
    }[];
    systemPrompt: string;
    tools: (PrebuiltTool | InnerTool | MCPTool)[];
    subAgents: SubAgent[];
}
