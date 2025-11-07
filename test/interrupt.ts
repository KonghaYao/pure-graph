import { HumanMessage } from 'langchain';
import { graph } from './graph/entrypoint';

for await (const event of await graph.stream(
    {
        messages: [new HumanMessage('使用 form').toDict()],
    },
    {
        streamMode: ['messages', 'values'],
        subgraphs: true,
    },
)) {
    console.log(event);
}
