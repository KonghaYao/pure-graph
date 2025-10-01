import {
    GET,
    POST,
    DELETE,
} from "@langgraph-js/pure-graph/dist/adapter/nextjs/router.js";
import { registerGraph } from "@langgraph-js/pure-graph";
import { graph } from "../../../../../../test/graph/index";
registerGraph("test", graph);

export { GET, POST, DELETE };
