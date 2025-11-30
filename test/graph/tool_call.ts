import { entrypoint, MessagesZodMeta, getConfig, interrupt, MemorySaver } from '@langchain/langgraph';
import { z } from 'zod/v3';
import { createEntrypointGraph, LangGraphGlobal } from '../../src';
import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage, createAgent, humanInTheLoopMiddleware, tool } from 'langchain';
import { withLangGraph } from '@langchain/langgraph/zod';
import { create_artifacts } from './create_artifacts';
import { StateGraph } from '@langchain/langgraph';
import { START } from '@langchain/langgraph';
import { FakeChatModel } from '@langchain/core/utils/testing';
import { AgentState } from '@langgraph-js/pro';

const State = AgentState.extend({});

const sample_tool = tool(
    (state, config) => {
        return 'hello';
    },
    {
        name: 'sample_tool',
    },
);

export const graph = new StateGraph(State)
    .addSequence([
        [
            'a',
            (state, config) => {
                const data = sample_tool.invoke({});
                // new FakeChatModel({
                //     responses: [
                //         {
                //             role: 'assistant',
                //             content: 'hello',
                //         },
                //     ],
                // });
                return state;
            },
        ],
    ])
    .addEdge(START, 'a')
    .compile();
