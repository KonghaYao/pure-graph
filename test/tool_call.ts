import { HumanMessage } from 'langchain';
import { graph } from './graph/tool_call';

for await (const event of await graph.stream(
    {
        messages: [new HumanMessage('使用 interrupt_test').toJSON()],
    },
    {
        configurable: {
            thread_id: '123',
        },
        streamMode: ['messages', 'values'],
        subgraphs: true,
    },
)) {
    console.log(event);
}
