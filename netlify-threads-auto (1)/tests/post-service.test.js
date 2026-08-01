import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDailyPost,
  publishThread,
  validatePost,
} from '../netlify/functions/lib/post-service.mjs';

test('금칙 표현이 포함된 게시물을 거절한다', () => {
  assert.throws(
    () => validatePost('AI만 쓰면 100% 성공하고 무조건 수익이 납니다.'),
    /금칙 표현/,
  );
});

test('500자를 초과한 게시물을 거절한다', () => {
  assert.throws(() => validatePost('가'.repeat(501)), /500자/);
});

test('정상 게시물을 통과시킨다', () => {
  const text = '스마트스토어 업무에 AI를 하나씩 적용하며 배우고 있어요.';
  assert.equal(validatePost(text), text);
});

test('OpenAI 응답에서 최종 게시글을 추출한다', async () => {
  const fakeFetch = async () => new Response(JSON.stringify({
    output: [{ content: [{ type: 'output_text', text: JSON.stringify({
      text: 'AI 공부가 새로운 강사의 길로 이어지고 있어요.',
    }) }] }],
  }), { status: 200, headers: { 'content-type': 'application/json' } });

  const text = await buildDailyPost({
    apiKey: 'test-openai-key',
    fetchImpl: fakeFetch,
    dayKey: '2026-08-01',
  });

  assert.equal(text, 'AI 공부가 새로운 강사의 길로 이어지고 있어요.');
});

test('Threads 컨테이너 생성 후 publish를 호출한다', async () => {
  const calls = [];
  const fakeFetch = async (url, options) => {
    calls.push({ url, options });
    const body = calls.length === 1 ? { id: 'creation-123' } : { id: 'post-456' };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const result = await publishThread({
    accessToken: 'threads-secret',
    userId: 'user-123',
    text: '테스트 게시글입니다.',
    fetchImpl: fakeFetch,
  });

  assert.deepEqual(result, { creationId: 'creation-123', postId: 'post-456' });
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /user-123\/threads$/);
  assert.match(calls[1].url, /user-123\/threads_publish$/);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer threads-secret');
  assert.match(calls[0].options.body.toString(), /media_type=TEXT/);
});

test('Threads 토큰 또는 사용자 ID가 없으면 게시를 중단한다', async () => {
  await assert.rejects(
    () => publishThread({ accessToken: '', userId: '', text: '테스트' }),
    /환경변수/,
  );
});
