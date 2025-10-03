import { interrupt, StateGraph } from '@langchain/langgraph';
import { HumanInterrupt } from '@langchain/langgraph/prebuilt';
import { createReactAgentAnnotation } from '@langchain/langgraph/prebuilt';
import { createState } from '@langgraph-js/pro';
const state = createState(createReactAgentAnnotation()).build({});
export const graph = new StateGraph(state)
    .addNode('agent', async (state) => {
        return {
            messages: [
                ...state.messages,
                {
                    role: 'ai',
                    content: 'Processing...',
                },
            ],
        };
    })
    .addNode('interrupt', async (state) => {
        // interrupt
        const response = interrupt([
            {
                action_request: {
                    action: 'test',
                    args: {
                        a: 1,
                    },
                },
                config: {
                    allow_ignore: true,
                    allow_respond: true,
                    allow_edit: true,
                    allow_accept: true,
                },
                description: 'Please review the tool call',
            } as HumanInterrupt,
        ])[0];
        return {
            messages: [
                ...state.messages,
                {
                    role: 'ai',
                    content: response,
                },
            ],
        };
    })
    .addEdge('__start__', 'agent')
    .addConditionalEdges(
        'agent',
        (state) => {
            // 条件：如果消息数量大于1，则走interrupt路径
            return state.messages.length > 1 ? 'interrupt' : '__end__';
        },
        {
            interrupt: 'interrupt',
            __end__: '__end__',
        },
    )
    .addEdge('interrupt', '__end__')
    .compile();
