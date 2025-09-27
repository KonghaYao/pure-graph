import { entrypoint, StateGraph } from '@langchain/langgraph';
import { createReactAgent, createReactAgentAnnotation } from '@langchain/langgraph/prebuilt';
import { createState } from '@langgraph-js/pro';
const state = createState(createReactAgentAnnotation()).build({});
export const graph = new StateGraph(state)
    .addNode('agent', async (state) => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        console.log('done');
        return {
            messages: [
                ...state.messages,
                {
                    role: 'ai',
                    content: 'Hello, world!',
                },
            ],
        };
    })
    .addEdge('__start__', 'agent')
    .addEdge('agent', '__end__')
    .compile();
