const OPENAI_URL = 'https://api.openai.com/v1/responses';
const THREADS_BASE_URL = 'https://graph.threads.net/v1.0';

const BLOCKED_TERMS = [
  '100% 성공',
  '무조건 수익',
  '수익 보장',
  '의료 진단',
  '주식 추천',
  '코인 투자',
];

const TOPICS = [
  '스마트스토어 업무에 AI를 활용한 실제 경험',
  'AI 공부와 자격증 도전 과정',
  '직접 만든 챗봇과 웹앱 이야기',
  '중년 여성의 새로운 도전',
  '초보자를 위한 짧은 AI 활용 팁',
];

export function validatePost(value) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error('게시글이 비어 있습니다.');
  if (text.length > 500) throw new Error('게시글이 500자를 초과했습니다.');
  if (BLOCKED_TERMS.some((term) => text.includes(term))) {
    throw new Error('게시글에 금칙 표현이 포함되어 있습니다.');
  }
  return text;
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  const block = payload?.output
    ?.flatMap((item) => item.content ?? [])
    ?.find((item) => item.type === 'output_text');
  return block?.text;
}

function parseOpenAIResponse(payload) {
  const raw = extractOutputText(payload);
  if (!raw) throw new Error('OpenAI 응답에 게시글이 없습니다.');
  const parsed = JSON.parse(raw);
  return validatePost(parsed.text);
}

async function readJson(response, label) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message ?? `${response.status} ${response.statusText}`;
    throw new Error(`${label} 실패: ${message}`);
  }
  return payload;
}

export async function buildDailyPost({
  apiKey,
  model = 'gpt-5-mini',
  dayKey,
  experienceNote = '',
  fetchImpl = fetch,
}) {
  if (!apiKey) throw new Error('OPENAI_API_KEY 환경변수가 없습니다.');
  const topicIndex = Math.abs(
    [...String(dayKey)].reduce((sum, char) => sum + char.charCodeAt(0), 0),
  ) % TOPICS.length;
  const topic = TOPICS[topicIndex];

  const response = await fetchImpl(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      instructions: [
        '당신은 스마트스토어를 운영해 온 1인 셀러가 AI 강사로 성장하는 과정을 기록하는 Threads 작가입니다.',
        '친근하고 솔직한 1인칭 경험담으로 작성하세요.',
        '입력에 없는 매출, 경력, 수강생 수, 성과를 만들지 마세요.',
        '첫 문장, 실제 경험 2~4문장, 배운 점, 자연스러운 질문 순서로 작성하세요.',
        '전체 글은 500자 이내이며 해시태그는 0~2개만 사용하세요.',
        '반드시 {"text":"최종 게시글"} 형태의 JSON만 반환하세요.',
      ].join('\n'),
      input: [
        `오늘 날짜: ${dayKey}`,
        `오늘 주제: ${topic}`,
        `실제 경험 메모: ${experienceNote || '새로운 내용을 꾸며내지 말고, AI를 배우며 느낀 일반적인 성장 과정만 작성'}`,
      ].join('\n'),
    }),
  });

  return parseOpenAIResponse(await readJson(response, 'OpenAI 글 생성'));
}

export async function publishThread({
  accessToken,
  userId,
  text,
  fetchImpl = fetch,
}) {
  if (!accessToken || !userId) {
    throw new Error('THREADS_ACCESS_TOKEN 또는 THREADS_USER_ID 환경변수가 없습니다.');
  }
  const safeText = validatePost(text);
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const createBody = new URLSearchParams({ media_type: 'TEXT', text: safeText });
  const createResponse = await fetchImpl(`${THREADS_BASE_URL}/${userId}/threads`, {
    method: 'POST',
    headers,
    body: createBody,
  });
  const creation = await readJson(createResponse, 'Threads 컨테이너 생성');
  if (!creation.id) throw new Error('Threads 컨테이너 ID가 없습니다.');

  const publishBody = new URLSearchParams({ creation_id: creation.id });
  const publishResponse = await fetchImpl(`${THREADS_BASE_URL}/${userId}/threads_publish`, {
    method: 'POST',
    headers,
    body: publishBody,
  });
  const published = await readJson(publishResponse, 'Threads 게시');
  if (!published.id) throw new Error('게시된 Threads ID가 없습니다.');

  return { creationId: creation.id, postId: published.id };
}
