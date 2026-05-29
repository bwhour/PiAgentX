export default function register(api) {
  for (let i = 1; i <= 3; i++) {
    api.registerTool({
      name: 'tool_' + i,
      label: 'Tool ' + i,
      description: 'Tool number ' + i,
      parameters: { type: 'object', properties: {}, required: [] },
      execute: async () => ({ content: [], details: undefined }),
    });
  }
}
