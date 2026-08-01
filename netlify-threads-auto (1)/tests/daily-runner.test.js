import test from 'node:test';
import assert from 'node:assert/strict';
import { runDailyPost } from '../netlify/functions/lib/daily-runner.mjs';

test('DRY_RUN에서는 글을 생성하지만 Threads에 게시하지 않는다', async () => {
  let publishCalls = 0;
  const result = await runDailyPost({
    env: { DRY_RUN: 'true', OPENAI_API_KEY: 'key' },
    now: new Date('2026-08-01T03:30:00.000Z'),
    buildPost: async () => '테스트 글입니다.',
    publish: async () => { publishCalls += 1; },
  });

  assert.equal(publishCalls, 0);
  assert.deepEqual(result, { status: 'dry_run', text: '테스트 글입니다.' });
});

test('DRY_RUN 해제 시 생성한 글을 Threads에 게시한다', async () => {
  const calls = [];
  const result = await runDailyPost({
    env: {
      DRY_RUN: 'false',
      OPENAI_API_KEY: 'openai-key',
      THREADS_ACCESS_TOKEN: 'threads-key',
      THREADS_USER_ID: 'user-id',
    },
    now: new Date('2026-08-01T03:30:00.000Z'),
    buildPost: async (input) => {
      calls.push({ type: 'build', input });
      return '자동 게시 테스트입니다.';
    },
    publish: async (input) => {
      calls.push({ type: 'publish', input });
      return { creationId: 'c1', postId: 'p1' };
    },
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[1].input.text, '자동 게시 테스트입니다.');
  assert.deepEqual(result, {
    status: 'published',
    text: '자동 게시 테스트입니다.',
    creationId: 'c1',
    postId: 'p1',
  });
});
