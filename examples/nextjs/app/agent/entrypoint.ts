import { Annotation, entrypoint, getConfig, getCurrentTaskInput } from '@langchain/langgraph';
import { createReactAgent, createReactAgentAnnotation } from '@langchain/langgraph/prebuilt';
import { createState } from '@langgraph-js/pro';
import { createEntrypointGraph } from '@langgraph-js/pure-graph';
import { ChatOpenAI } from '@langchain/openai';
const State = createState(createReactAgentAnnotation()).build({});

const workflow = entrypoint('test-entrypoint', async (state: typeof State.State) => {
    // 这里可以获取 config
    const config = getConfig();
    console.log(config.configurable);
    const agent = createReactAgent({
        llm: new ChatOpenAI({
            model: 'qwen-plus',
        }),
        prompt: '你是一个智能助手',
        tools: [],
    });
    return agent.invoke(state);
});

export const graph = createEntrypointGraph({
    stateSchema: State,
    graph: workflow,
});
