import type { IncomingMessage, ServerResponse } from 'http';

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
  setHeader: (name: string, value: string | number | readonly string[]) => this;
}

export default function handler(req: IncomingMessage, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const hasGemini =
    typeof process.env.GEMINI_API_KEY === 'string' &&
    process.env.GEMINI_API_KEY.trim().length > 0 &&
    process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY';

  return res.status(200).json({
    status: 'healthy',
    platform: 'SakhiBiz Grassroots E-Learning',
    geminiConfigured: hasGemini,
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
  });
}
