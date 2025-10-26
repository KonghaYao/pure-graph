import { InteropZodObject } from '@langchain/core/utils/types';
import { AnnotationRoot, Pregel, StateDefinition, StateGraph, StateType, UpdateType } from '@langchain/langgraph';
import { InteropZodToStateDefinition } from '@langchain/langgraph/zod';
import { ZodObject, ZodSchema, ZodTypeAny } from 'zod';

export const createEntrypointGraph = <S extends InteropZodObject, C extends InteropZodObject>({
    stateSchema,
    config,
    graph,
}: {
    stateSchema: S;
    config?: C;
    graph: Pregel<any, any>;
}): StateGraph<
    ZodObject<{}, 'strip', ZodTypeAny, {}, {}>,
    StateType<InteropZodToStateDefinition<ZodObject<{}, 'strip', ZodTypeAny, {}, {}>, {}>>,
    UpdateType<InteropZodToStateDefinition<ZodObject<{}, 'strip', ZodTypeAny, {}, {}>, {}>>,
    '__start__',
    InteropZodToStateDefinition<ZodObject<{}, 'strip', ZodTypeAny, {}, {}>, {}>,
    InteropZodToStateDefinition<ZodObject<{}, 'strip', ZodTypeAny, {}, {}>, {}>,
    StateDefinition,
    unknown,
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
        });
};
