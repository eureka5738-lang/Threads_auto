# Netlify Threads AI 자동 게시

매일 한국 시간 오후 12시 30분에 OpenAI로 글을 만들고 Threads API로 게시하는 Netlify Scheduled Function입니다.

## 안전 기본값

- `DRY_RUN`이 정확히 `false`일 때만 실제 게시합니다.
- 토큰과 API 키는 소스 파일에 넣지 않습니다.
- 빈 글, 500자 초과, 수익 보장 등 금칙 표현은 게시 전에 차단합니다.
- Threads 게시 실패 시 같은 실행에서 무제한 재시도하지 않습니다.

## Netlify 환경변수

Netlify의 `Project configuration → Environment variables`에서 입력합니다.

| 이름 | 값 | 민감정보 |
|---|---|---|
| `THREADS_ACCESS_TOKEN` | 발급한 Threads 사용자 토큰 | 예 |
| `THREADS_USER_ID` | Threads 숫자 사용자 ID | 아니요 |
| `OPENAI_API_KEY` | OpenAI API 키 | 예 |
| `OPENAI_MODEL` | `gpt-5-mini` | 아니요 |
| `DRY_RUN` | 첫 배포는 `true` | 아니요 |
| `EXPERIENCE_NOTE` | 실제 경험 메모(선택) | 아니요 |

토큰과 API 키는 채팅, 코드, Git 저장소에 입력하지 않습니다.

## 배포 순서

1. 이 폴더를 GitHub 저장소에 올리거나 Netlify CLI로 배포합니다.
2. Netlify 환경변수를 설정합니다.
3. 환경변수 반영을 위해 새 배포를 실행합니다.
4. Scheduled Functions에서 `threads-daily`를 수동 실행합니다.
5. 함수 로그에서 `status: dry_run`과 생성 글 길이를 확인합니다.
6. 생성된 글을 검토한 후 `DRY_RUN=false`로 변경합니다.
7. 다시 배포하고 수동 실행하여 Threads 테스트 게시를 확인합니다.

## 예약 시간

Netlify 예약 함수는 UTC 기준입니다.

```text
30 3 * * *
```

한국 시간으로 매일 오후 12시 30분입니다.

## 로컬 테스트

```bash
npm test
```

모든 테스트가 통과해야 배포합니다.
