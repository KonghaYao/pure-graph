import { InteropZodObject } from '@langchain/core/utils/types';
import { BaseCheckpointSaver, CompiledStateGraph, Pregel, StateDefinition, StateGraph } from '@langchain/langgraph';
export const createEntrypointGraph = <S extends InteropZodObject, C extends InteropZodObject>({
    stateSchema,
    config,
    graph,
    checkpointer,
}: {
    stateSchema: S;
    config?: C;
    graph: Pregel<any, any>;
    checkpointer?: BaseCheckpointSaver;
}): CompiledStateGraph<
    {},
    {},
    string,
    StateDefinition,
    StateDefinition,
    StateDefinition,
    {
        [x: string]: any;
    },
    unknown,
    unknown
> => {
    const name = graph.getName();
    /** @ts-ignore */
    return new StateGraph(stateSchema, config)
        .addNode(name, (state, config) => graph.invoke(state, config))
        .addEdge('__start__', name)
        .addEdge(name, '__end__')
        .compile({
            name,
            checkpointer,
        });
};
