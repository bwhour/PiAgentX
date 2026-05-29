/**
 * ACP (Agent Communication Protocol) - JSON-RPC 2.0 实现
 */

export interface ACPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

export interface ACPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface ACPNotification {
  jsonrpc: '2.0';
  method: string;
  params?: any;
}
