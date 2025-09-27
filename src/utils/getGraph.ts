import {
    BaseCheckpointSaver,
    BaseStore,
    CompiledGraph,
    CompiledStateGraph,
    Graph,
    LangGraphRunnableConfig,
    MemorySaver,
} from '@langchain/langgraph';
import { globalCheckPointer } from '../global';

export type CompiledGraphFactory<T extends string> = (config: {
    configurable?: Record<string, unknown>;
}) => Promise<CompiledGraph<T>>;

export const GRAPHS: Record<string, CompiledGraph<string> | CompiledGraphFactory<string>> = {};

export async function registerGraph(
    graphId: string,
    graph: CompiledGraph<any> | CompiledStateGraph<any, any, any, any, any, any, any> | CompiledGraphFactory<any>,
) {
    return (GRAPHS[graphId] = graph);
}
export async function getGraph(
    graphId: string,
    config: LangGraphRunnableConfig | undefined,
    options?: {
        checkpointer?: BaseCheckpointSaver | null;
        store?: BaseStore;
    },
) {
    if (!GRAPHS[graphId]) throw new Error(`Graph "${graphId}" not found`);

    const compiled =
        typeof GRAPHS[graphId] === 'function' ? await GRAPHS[graphId](config ?? { configurable: {} }) : GRAPHS[graphId];

    if (typeof options?.checkpointer !== 'undefined') {
        compiled.checkpointer = options?.checkpointer ?? globalCheckPointer;
    } else {
        compiled.checkpointer = globalCheckPointer;
    }

    compiled.store = options?.store ?? undefined;

    return compiled;
}
