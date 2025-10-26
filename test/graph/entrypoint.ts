import { entrypoint, MessagesZodMeta, StateGraph } from '@langchain/langgraph';
import { createState } from '@langgraph-js/pro';
import { z } from 'zod/v3';
import { createEntrypointGraph } from '../../src/';
import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage, createAgent } from 'langchain';
import { withLangGraph } from '@langchain/langgraph/zod';
const State = z.object({
    messages: withLangGraph(z.custom<BaseMessage[]>(), MessagesZodMeta),
});

const workflow = entrypoint('test-entrypoint', async (state: z.infer<typeof State>) => {
    // 这里可以获取 config
    // const config = getConfig();
    // console.log(config.configurable);
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
}).compile();
