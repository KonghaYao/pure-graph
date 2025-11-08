import { entrypoint, MessagesZodMeta, getConfig, interrupt } from '@langchain/langgraph';
import { z } from 'zod/v3';
import { createEntrypointGraph, LangGraphGlobal } from '../../src/';
import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage, createAgent, tool } from 'langchain';
import { withLangGraph } from '@langchain/langgraph/zod';
import { LangGraphClient } from '@langgraph-js/sdk';
import { create_artifacts } from './create_artifacts';

const State = z.object({
    messages: withLangGraph(z.custom<BaseMessage[]>(), MessagesZodMeta),
});
const show_form = tool(
    (props) => {
        console.log(props);
        return interrupt({});
    },
    {
        name: 'show_form',
        description: '显示一个 rjsf schema 定义的表单',
        schema: z.object({
            schema: z.any().describe('@rjsf/core 所需要的 form schema， 对象格式，而非 json 字符串'),
        }),
    },
);

const workflow = entrypoint('test-entrypoint', async (state: z.infer<typeof State>) => {
    // Access context data
    // const config = getConfig();
    // console.log('Context:', config.configurable);
    const agent = createAgent({
        model: new ChatOpenAI({
            model: 'qwen-plus',
        }),
        systemPrompt: '你是一个智能助手',
        tools: [show_form, create_artifacts],
        checkpointer: LangGraphGlobal.globalCheckPointer,
    });
    return agent.invoke(state);
});

export const graph = createEntrypointGraph({
    stateSchema: State,
    graph: workflow,
});
