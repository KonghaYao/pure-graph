import { entrypoint, MessagesZodMeta, getConfig } from '@langchain/langgraph';
import { z } from 'zod/v3';
import { createEntrypointGraph } from '../../src/';
import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage, createAgent } from 'langchain';
import { withLangGraph } from '@langchain/langgraph/zod';

const State = z.object({
    messages: withLangGraph(z.custom<BaseMessage[]>(), MessagesZodMeta),
});

const workflow = entrypoint('test-entrypoint', async (state: z.infer<typeof State>) => {
    // Access context data
    const config = getConfig();
    console.log('Context:', config.configurable);

    const agent = createAgent({
        model: new ChatOpenAI({
            model: 'qwen-plus',
        }),
        systemPrompt: '你是一个智能助手',
        tools: [],
    });
    return agent.invoke(state);
});

export const graph = createEntrypointGraph({
    stateSchema: State,
    graph: workflow,
});
