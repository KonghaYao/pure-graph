import { Annotation, entrypoint, MessagesZodMeta } from '@langchain/langgraph';
import { AgentProtocol } from './types';
import { BaseMessage, createAgent } from 'langchain';
import { ChatOpenAI } from '@langchain/openai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { createTools } from './tools';
import { createEntrypointGraph } from '@langgraph-js/pure-graph';
import { withLangGraph } from '@langchain/langgraph/zod';
import { z } from 'zod/v3';

const AgentProtocolSchema = z.object({
    agent_protocol: z.custom<AgentProtocol>(),
    model_name: z.string(),
});

const AgentGraphState = z
    .object({
        messages: withLangGraph(z.custom<BaseMessage[]>(), MessagesZodMeta),
    })
    .merge(AgentProtocolSchema);

export const createLLM = async (protocol: AgentProtocol, model_name?: string): Promise<BaseChatModel> => {
    if (!model_name) {
        model_name = protocol.llm[0].model;
    } else {
        const llm = protocol.llm.find((i) => i.model === model_name);
        if (!llm) {
            throw new Error(`Model ${model_name} not found`);
        }
        model_name = llm.model;
    }
    return new ChatOpenAI({
        model: model_name,
    });
};

export const graph = createEntrypointGraph({
    stateSchema: AgentGraphState,
    graph: entrypoint({ name: 'agent-graph' }, async (state: z.infer<typeof AgentGraphState>) => {
        const protocol = state.agent_protocol;

        const tools = await createTools(protocol);

        const agent = createAgent({
            model: await createLLM(protocol, state.model_name),
            tools,
            systemPrompt: protocol.systemPrompt,
        });
        const response = await agent.invoke(state);
        return response;
    }),
});
