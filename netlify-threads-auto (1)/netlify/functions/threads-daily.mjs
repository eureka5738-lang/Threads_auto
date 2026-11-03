import { runDailyPost } from './lib/daily-runner.mjs';

export default async () => {
  try {
    const result = await runDailyPost({ env: process.env });
    console.log(JSON.stringify({
  status: result.status,
  postId: result.postId ?? null,
  textLength: result.text.length,
  ...(result.status === 'dry_run'
    ? { generatedText: result.text }
    : {}),
}));
    return Response.json(result, { status: 200 });
  } catch (error) {
    console.error(JSON.stringify({
      status: 'failed',
      message: error instanceof Error ? error.message : '알 수 없는 오류',
    }));

    return Response.json({
      status: 'failed',
      message: error instanceof Error ? error.message : '알 수 없는 오류',
    }, { status: 500 });
  }
};

export const config = {
  schedule: '35 9 * * *',
};
