import { Command, Send } from '@langchain/langgraph';
import { Command as ClientCommand } from '@langgraph-js/sdk';
export interface RunSend {
    node: string;
    input?: unknown;
}

export interface RunCommand extends ClientCommand {}

export const getLangGraphCommand = (command: RunCommand) => {
    let goto = command.goto != null && !Array.isArray(command.goto) ? [command.goto] : command.goto;

    return new Command({
        goto: goto?.map((item: string | RunSend) => {
            if (typeof item !== 'string') return new Send(item.node, item.input);
            return item;
        }),
        update: command.update ?? undefined,
        resume: command.resume,
    });
};
