import { AnnotationRoot, Pregel, StateGraph } from '@langchain/langgraph';

export const createEntrypointGraph = <StateType extends AnnotationRoot<any>, ConfigType extends AnnotationRoot<any>>({
    stateSchema,
    config,
    graph,
}: {
    stateSchema: StateType;
    config?: ConfigType;
    graph: Pregel<any, any>;
}) => {
    const name = graph.getName();
    return new StateGraph(stateSchema, config)
        .addNode(name, (state, config) => graph.invoke(state, config))
        .addEdge('__start__', name)
        .addEdge(name, '__end__')
        .compile({
            name,
        });
};
