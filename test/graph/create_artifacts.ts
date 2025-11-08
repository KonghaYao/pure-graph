import { tool } from '@langchain/core/tools';
import { getCurrentTaskInput } from '@langchain/langgraph';
import { z } from 'zod';

export const ArtifactCommandSchema = {
    command: z
        .enum(['create', 'update', 'rewrite'])
        .describe('The operation to perform: create new artifact, update existing, or rewrite'),
    id: z.string().describe('Unique identifier for the artifact'),
    title: z.string().describe('Human-readable title for the artifact'),
    type: z.string().describe("MIME type of the artifact content (e.g., 'application/vnd.ant.react')"),
    language: z.string().describe('Programming language or format of the content'),
    content: z
        .string()
        .describe(
            "The actual content to be created. Don't Reply These Code to User, User can see these code in artifacts. If you need to update the content, use the 'update' command. content can be empty if you need to update a new artifact.",
        ),
    old_str: z.string().describe('The existing content to be replaced (for update operations)'),
    new_str: z.string().describe('The new content to replace the old content (for update operations)'),
};
export type ArtifactCommand = z.infer<z.ZodObject<typeof ArtifactCommandSchema>>;
export const create_artifacts = tool(
    async (artifacts) => {
        return 'Artifact operation completed successfully';
    },
    {
        name: 'create_artifacts',
        description: `
What is Artifact

- An Artifact is an independent content container you create to store substantial content that can be saved, edited, and reused. It presents code, documents, creative works, etc., as standalone entities rather than mixing them into the conversation.

- Artifacts can accommodate various types of content: code and applications in different programming languages, Markdown documents, HTML web pages, React components, SVG graphics, Mermaid diagrams, and any form of creative writing. Artifacts are especially suitable for content meant to be used beyond the conversation context, such as complete web applications, technical documentation, stories, reports, study guides, and more.

- Artifacts run in a restricted browser environment. It can't use localStorage, sessionStorage, or ANY browser storage APIs in artifacts, instead, you must use React state or JavaScript variables.

When to use the "create_artifacts" tool:
- When you need to present any visual output, UI component, or interactive element to the user.
- When generating source code exceeding 20 lines.
- When composing creative works, such as stories, poems, or scripts.
- When producing content that the user intends to save, reuse, or reference.
- When the user requests the creation of a web page, dashboard, or similar UI artifact.

When NOT to use the "create_artifacts" tool:
- When providing conversational responses, such as explaining concepts or answering questions.
- When giving advice, recommendations, or engaging in discussions.
- When showing short code examples (less than 20 lines).
- When sharing temporary information only relevant to the current conversation.
- When providing content that doesn't need to be saved or reused.
- When creating simple lists or brief answers.

Usage Notes:

1. **Design Principles:**
    - Functional design with minimalism and clean aesthetics
    - Modern, professional, brand-neutral style with flat colors and Apple-inspired animations
    - Reference: TailwindCSS official style, macOS app style, dashboard UI style
2. **Tech Stack:** 
    - react component
    - shadcn/ui
        - Only use components that are officially available in the shadcn/ui library. If a required component does not exist in shadcn/ui, implement it using standard HTML elements instead.
    - tailwindcss
    - framer-motion for animation
    - lucide-react for icons usage (DOES NOT output <svg> or emoji for icons.)
        - Do not use icons that are not available in lucide-react
    - recharts

3. **Implementation Notes:**
    - Create functional, working components (not placeholders)
    - Implement all routes for multi-page apps with interconnected data via context
    - Use responsive designs with full-screen layout and proper contrast

4. **Available Artifacts to Show:**
    - React Components: "application/vnd.ant.react".
        - Available libraries to Use
            - shadcn/ui: import { Alert, AlertDescription, AlertTitle, AlertDialog, AlertDialogAction } from '@/components/ui/alert'
            - lucide-react: import { Camera } from 'lucide-react'
            - recharts: import { LineChart, XAxis, ... } from 'recharts'
            - MathJS: import math from 'mathjs'
            - lodash: import \_ from 'lodash'
            - d3: import d3 from 'd3'
            - Plotly: import Plotly from 'plotly'
            - Three.js: import THREE from 'three' 
            - Papaparse: for processing CSVs
            - xlsx: for processing Excel files (XLSX, XLS)
            - Chart.js: import Chart from 'chart.js'
            - Tone: import Tone from 'tone'
            - Motion: import { motion } from 'framer-motion'
    - Mermaid Diagrams: "application/vnd.ant.mermaid".

<extra-libraries>
    <how-to-highlight-code>
        import { CodeBlock } from '@/components/ai-elements/code-block';
        <CodeBlock code="console.log('Hello, world!');" language="javascript" />
    </how-to-highlight-code>
</extra-libraries>
`,
        schema: z.object(ArtifactCommandSchema),
    },
);
