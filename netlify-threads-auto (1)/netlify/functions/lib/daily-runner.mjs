import { buildDailyPost, publishThread } from './post-service.mjs';

function koreaDateKey(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export async function runDailyPost({
  env,
  now = new Date(),
  buildPost = buildDailyPost,
  publish = publishThread,
}) {
  const text = await buildPost({
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL || 'gpt-5-mini',
    dayKey: koreaDateKey(now),
    experienceNote: env.EXPERIENCE_NOTE || '',
  });

  if (env.DRY_RUN !== 'false') {
    return { status: 'dry_run', text };
  }

  const published = await publish({
    accessToken: env.THREADS_ACCESS_TOKEN,
    userId: env.THREADS_USER_ID,
    text,
  });

  return { status: 'published', text, ...published };
}
