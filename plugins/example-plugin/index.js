/**
 * Example Plugin
 *
 * 演示如何通过插件系统添加自定义工具和技能。
 * 插件入口函数接收一个 `api` 对象，可以注册工具和技能。
 *
 * @param {import("../../src/infrastructure/plugins/types.js").PluginApi} api
 */
export default function register(api) {
  // 注册一个自定义工具
  api.registerTool({
    name: "echo_tool",
    label: "回声工具（示例）",
    description: "Returns the input message as-is. Example plugin tool.",
    parameters: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "Message to echo back.",
        },
      },
      required: ["message"],
    },
    execute: async (_toolCallId, params) => {
      return {
        content: [{ type: "text", text: `Echo: ${params.message}` }],
        details: undefined,
      };
    },
  });

  // 注册一个自定义技能（注入到系统提示词）
  api.registerSkill({
    name: "example-skill",
    description: "Demonstrates plugin-provided skills. Use /example-skill to invoke.",
    invocation: "/example-skill",
    content: "This skill was loaded from the example plugin in plugins/example-plugin/.",
  });
}
