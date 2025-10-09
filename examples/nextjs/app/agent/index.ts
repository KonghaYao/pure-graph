import { registerGraph } from '@langgraph-js/pure-graph';
import { graph } from './entrypoint';
registerGraph('test-entrypoint', graph);
