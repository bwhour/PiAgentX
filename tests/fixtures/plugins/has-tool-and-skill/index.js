export default function register(api) {
  api.registerTool({
    name: 'my_tool',
    label: 'My Tool',
    description: 'Does something',
    parameters: { type: 'object', properties: {}, required: [] },
    execute: async () => ({ content: [{ type: 'text', text: 'ok' }], details: undefined }),
  });
  api.registerSkill({
    name: 'my-skill',
    description: 'A skill',
    invocation: '/my-skill',
    content: '## Usage',
  });
}
