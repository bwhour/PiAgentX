export default function register(api) {
  api.registerTool({
    name: 'hello_tool',
    label: 'Hello',
    description: 'Says hello',
    parameters: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    execute: async (_id, params) => ({
      content: [{ type: 'text', text: 'Hello, ' + params.name }],
      details: undefined,
    }),
  });
}
