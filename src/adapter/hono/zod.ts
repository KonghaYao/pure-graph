import z from 'zod';

export const AssistantConfigurable = z
    .object({
        thread_id: z.string().optional(),
        thread_ts: z.string().optional(),
    })
    .catchall(z.unknown());

export const AssistantConfig = z
    .object({
        tags: z.array(z.string()).optional(),
        recursion_limit: z.number().int().optional(),
        configurable: AssistantConfigurable.optional(),
    })
    .catchall(z.unknown())
    .describe('The configuration of an assistant.');

export const Assistant = z.object({
    assistant_id: z.string().uuid(),
    graph_id: z.string(),
    config: AssistantConfig,
    created_at: z.string(),
    updated_at: z.string(),
    metadata: z.object({}).catchall(z.any()),
});

export const MetadataSchema = z
    .object({
        source: z.union([z.literal('input'), z.literal('loop'), z.literal('update'), z.string()]).optional(),
        step: z.number().optional(),
        writes: z.record(z.unknown()).nullable().optional(),
        parents: z.record(z.string()).optional(),
    })
    .catchall(z.unknown());

export const SendSchema = z.object({
    node: z.string(),
    input: z.unknown().nullable(),
});

export const CommandSchema = z.object({
    update: z
        .union([z.record(z.unknown()), z.array(z.tuple([z.string(), z.unknown()]))])
        .nullable()
        .optional(),
    resume: z.unknown().optional(),
    goto: z.union([SendSchema, z.array(SendSchema), z.string(), z.array(z.string())]).optional(),
});
