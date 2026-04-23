# f028 Product Hunt Launch Images — Build Source

> 2026-05-11 Product Hunt 런칭용 이미지 3종의 **HTML 소스 + 스크린샷 빌드 스크립트**.
> 최종 PNG 출력물은 `docs/marketing/assets/f028/` 에 저장됨.

## 파일

| 파일 | 내용 |
|------|------|
| `image1.html` | Before / After split (Dark+Light, PH Gallery 1 / 썸네일 겸용) |
| `image2.html` | 3-line setup code snippet (Dark, PH Gallery 2) |
| `image3.html` | Results in Testably dashboard (Light, PH Gallery 3) |
| `build.mjs` | Playwright 기반 스크린샷 스크립트 — 1270×760 @2x → PNG |

## 빌드 방법

```bash
# 최초 1회: playwright chromium 브라우저 설치
npx playwright install chromium

# 3장 전부 다시 생성
node marketing/launch-images-f028/build.mjs

# 1장만 다시 생성 (예: Image 2만)
node marketing/launch-images-f028/build.mjs --only=2
```

출력 경로: `docs/marketing/assets/f028/f028-ph-image-{1|2|3}-{slug}@2x.png`

## 디자인 소스

각 HTML 은 `docs/specs/design-spec-f028-launch-images.md` 의 수치를 **그대로 반영**함:
- 논리 크기 1270×760, 내보내기 2540×1520 (@2x)
- 컬러: `--indigo-500: #6366F1`, `--violet-500: #8B5CF6`, `--slate-900: #0F172A` 등 HEX 전부 명시
- 폰트: Inter (400-900), JetBrains Mono (400-700), Pacifico (워드마크) — Google Fonts CDN
- 아이콘: Remix Icon 4.2.0 CDN

## 수정 워크플로우

1. HTML 파일 수정 (VS Code Live Server 로 1270×760 뷰포트에서 미리보기 가능)
2. `node marketing/launch-images-f028/build.mjs --only=<N>` 으로 해당 이미지만 다시 출력
3. `docs/marketing/assets/f028/` 의 PNG 확인
4. 필요 시 Squoosh CLI 로 WebP q=90 추가 생성:
   ```bash
   npx @squoosh/cli --webp '{"quality":90}' docs/marketing/assets/f028/*.png
   ```

## 알려진 제약

- **Image 3 의 스크린샷 영역은 HTML 재구성 목업**. 디자인 스펙 §5.1 권장대로 **실제 Testably 앱을 Chrome DevTools 1440×900 @2x 로 캡처**하면 진정성이 더 높아짐.
  - 실제 스크린샷 사용 시: HTML 의 `.app` 블록을 `<img src="..." />` 로 교체 후 재빌드.
- 웹폰트 로드에 약 1.5 초 대기 필요 — `build.mjs` 에 이미 `WAIT_FOR_FONTS_MS` 로 설정됨.
- 외부 CDN 의존: 로컬 오프라인에서는 폰트가 폴백됨. 오프라인 빌드가 필요하면 `/fonts/` 로컬 사본 추가.

## 재생성 체크리스트

출력 PNG 3장을 커밋할 때:
- [ ] 파일 크기 ≤ 1.2 MB 각각
- [ ] 2540×1520 @2x 해상도 유지 (`file` 명령으로 확인)
- [ ] SDK 버전 표기: 모든 이미지에서 `1.0.1` 또는 미표시 (alpha 흔적 0)
- [ ] `docs/marketing/assets/f028/` 에 최종 저장
