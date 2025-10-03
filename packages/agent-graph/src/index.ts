import { Annotation, entrypoint } from '@langchain/langgraph';
import { createState } from '@langgraph-js/pro';
import { AgentProtocol } from './types';
import { createReactAgent, createReactAgentAnnotation } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { createTools } from './tools';
import { createEntrypointGraph } from '@langgraph-js/pure-graph';
const AgentProtocolState = createState().build({
    agent_protocol: Annotation<AgentProtocol>(),
    model_name: Annotation<string>(),
});

const AgentGraphState = createState(AgentProtocolState, createReactAgentAnnotation()).build({});

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
    graph: entrypoint({ name: 'agent-graph' }, async (state: typeof AgentGraphState.State) => {
        const protocol = state.agent_protocol;

        const tools = await createTools(protocol);

        const agent = createReactAgent({
            llm: await createLLM(protocol, state.model_name),
            tools,
            prompt: protocol.systemPrompt,
            stateSchema: AgentGraphState,
        });
        const response = await agent.invoke(state);
        return response;
    }),
});
