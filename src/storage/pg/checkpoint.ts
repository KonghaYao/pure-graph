import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';

export const createPGCheckpoint = async () => {
    const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL!);
    if (process.env.DATABASE_INIT === 'true') {
        console.debug('LG | Initializing postgres checkpoint');
        await checkpointer.setup();
    }

    return checkpointer;
};
