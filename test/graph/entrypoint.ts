import { entrypoint } from '@langchain/langgraph';
import { createReactAgentAnnotation } from '@langchain/langgraph/prebuilt';
import { createState } from '@langgraph-js/pro';
import { createEntrypointGraph } from '../../src/';
const State = createState(createReactAgentAnnotation()).build({});
const workflow = entrypoint('test-entrypoint', async (state: typeof State.State) => {
    return {
        messages: [
            {
                role: 'ai',
                content: 'Hello, world!',
            },
        ],
    };
});

export const graph = createEntrypointGraph({
    stateSchema: State,
    graph: workflow,
});
