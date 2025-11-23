import { entrypoint, MessagesZodMeta, getConfig, interrupt, MemorySaver } from '@langchain/langgraph';
import { z } from 'zod/v3';
import { createEntrypointGraph, LangGraphGlobal } from '../../src/';
import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage, createAgent, humanInTheLoopMiddleware, tool } from 'langchain';
import { withLangGraph } from '@langchain/langgraph/zod';
import { create_artifacts } from './create_artifacts';

const State = z.object({
    messages: withLangGraph(z.custom<BaseMessage[]>(), MessagesZodMeta),
});
const show_form = tool(
    (props) => {
        console.log(props);
        return 'good';
    },
    {
        name: 'show_form',
        description: '显示一个 rjsf schema 定义的表单',
        schema: z.object({
            schema: z.any().describe('@rjsf/core 所需要的 form schema， 对象格式，而非 json 字符串'),
        }),
    },
);
const interrupt_test = tool(
    (props) => {
        console.log(props);
        return 'good';
    },
    {
        name: 'interrupt_test',
        description: '测试中断',
        schema: z.object({
            message: z.string().describe('中断消息'),
        }),
    },
);

const workflow = entrypoint('test-entrypoint', async (state: z.infer<typeof State>) => {
    // Access context data
    // const config = getConfig();
    // console.log('Context:', config.configurable);
    const agent = createAgent({
        model: new ChatOpenAI({
            model: 'gpt-4o-mini',
            useResponsesApi: false,
            tags: ['test'],
            metadata: {
                subagent: true,
            },
        }),
        systemPrompt: '你是一个智能助手',
        tools: [show_form, interrupt_test],
        middleware: [
            humanInTheLoopMiddleware({
                interruptOn: {
                    interrupt_test: true,
                },
            }),
        ],
    });
    return agent.invoke(state);
});

export const graph = createEntrypointGraph({
    stateSchema: State,
    graph: workflow,
    checkpointer: new MemorySaver(),
});
