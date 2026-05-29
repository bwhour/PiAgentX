export function register(api) {
  api.registerTool({
    name: 'ne_tool',
    label: 'NE Tool',
    description: 'Named export tool',
    parameters: { type: 'object', properties: {}, required: [] },
    execute: async () => ({ content: [], details: undefined }),
  });
}
