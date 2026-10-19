# 🐼 Pàngdá HSK – Học tiếng Trung theo chuẩn HSK 3.0

Website học tiếng Trung cho người Việt, bám sát giáo trình **《新HSK教程 1》(New HSK Course 1)**, đồng hành cùng linh vật gấu trúc **Pàngdá 胖达**.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit test: chấm điểm, dữ liệu, từ điển
npm run build      # bản production trong dist/
```

Yêu cầu Node.js 18 trở lên.

## Hiện có gì

**HSK 2** (theo 《新HSK教程 2》) đã mở: bài 1–3 đầy đủ (mỗi bài 4 bài khoá, trong đó bài 4 là đoạn văn; câu hỏi “nghe hai lần rồi chọn đáp án”; khởi động; văn hoá về vịt quay Bắc Kinh, Đại học Bắc Kinh, Tây An) và bài tập về nhà 18 câu. Bài 4–15 có khung JSON theo mục lục sách. Ở HSK 2, pinyin và bản dịch ẩn mặc định, chạm để xem.


Cấp 1 (HSK 1) có **bài 1–3 đầy đủ**: bài khoá, từ mới, ngữ pháp, luyện tập trên lớp, 5 game, hoạt động lớp, nói nhịu có ghi âm, góc văn hoá và **bài tập về nhà 18–19 câu**. Bài 1 có thêm phần nhập môn pinyin. Bài 7 có sẵn phần nhập môn chữ Hán. Bài 4–15 có khung JSON. Cấp 2–9 đang khoá ("Sắp ra mắt").

> **Lưu ý về nội dung:** hội thoại trong bài 1–3 được viết lại theo đúng tình huống, nhân vật, từ vựng và ngữ pháp của sách, không chép nguyên văn. Nếu bạn sở hữu sách và muốn dùng lời gốc, chỉ cần thay trường `lines` trong file JSON.

## Cấu trúc thư mục

```
src/
  data/
    levels.json                 cấu hình các cấp + bộ "difficulty"
    characters.json             nhân vật trong sách
    hanzi-strokes.json          dữ liệu nét chữ đóng gói sẵn (tự sinh)
    hsk1/
      lesson-01.json … lesson-15.json
      glossary.json             tên riêng & từ ngoài bài
      homework/hw-01.json … hw-15.json
    hsk2/ …                     để trống, thêm sau
  components/                   LevelSelector, DialoguePlayer, VocabTable, GrammarCard,
                                ExerciseEngine, GameHub, PandaMascot, questions/…
  pages/                        LessonPage, HomeworkPage, …
  lib/                          grading.ts (chấm điểm), dict.ts (pinyin tự động), audio.ts, data.ts
  store/ProgressStore.tsx       tiến độ, XP, huy hiệu, sao lưu (localStorage)
  theme/ThemeProvider.tsx       5 theme × sáng/tối
public/audio/hsk1/              file mp3 theo số track của sách
```

## Thêm một cấp HSK mới

1. Tạo thư mục `src/data/hsk2/` gồm `lesson-01.json …`, `homework/hw-01.json …` và tuỳ chọn `glossary.json`.
2. Trong `src/data/levels.json`, đổi `"available": true` cho cấp đó và chỉnh bộ `difficulty`.
3. Chạy `node scripts/build-hanzi-data.mjs` để đóng gói dữ liệu nét chữ cho các chữ mới.

Không cần sửa component nào. Router, lộ trình, sổ từ vựng và kho ngữ pháp tự đọc dữ liệu theo quy ước tên file.

Bộ `difficulty` điều khiển giao diện và bài tập:

| Trường | Ý nghĩa |
|---|---|
| `pinyinDefault` | `always` luôn hiện · `tap` chạm để hiện · `hidden` ẩn |
| `translationDefault` | `shown` · `tap` (bấm để xem) · `hidden` |
| `explainLanguage` | `vi` hoặc `vi+zh` (hiện thêm `explain_zh` trong thẻ ngữ pháp) |
| `audioSpeed` | tốc độ đọc mặc định |
| `hintsPerQuestion` | số lần gợi ý mỗi câu luyện tập. Bằng 0 thì ẩn ngân hàng từ trong bài dịch |
| `timerSeconds` | giới hạn thời gian bài tập về nhà (`null` = không bấm giờ, hết giờ tự nộp) |
| `homeworkPassScore` | % tối thiểu để đạt |
| `exercisePinyin` | pinyin trong phần Luyện tập, bài ôn tập và game xếp câu. Mặc định `hidden` để học sinh tự nhận diện chữ Hán; đặt `always` hoặc `tap` nếu muốn hiện |

`pandaStage` (0–3) quyết định phụ kiện của Pàngdá ở cấp đó: gấu con, băng đô, kính, mũ tốt nghiệp.

**HSK 3** (theo 《新HSK教程 3》, 18 bài) đã mở: bài 1–3 đầy đủ (sân bay & hành lý, nhà hàng & đồ ăn giao tận nơi, chuyển nhà), bài tập về nhà 18 câu có giới hạn 30 phút. Bài 4–18 có khung JSON theo mục lục sách.

## Chữ đa âm

Từ điển tự động chỉ giữ một cách đọc cho mỗi từ. Khi một chữ cần đọc khác, ghi ngay trong câu: `钱可以慢慢{还|huán}` hoặc `{长|cháng}头发`. Ký hiệu này được bỏ đi khi đọc bằng giọng máy và khi chấm điểm. Trong 生词, đặt `"noDict": true` cho cách đọc ít gặp (ví dụ 还 huán) để nó không đè lên cách đọc thường dùng (还 hái).

## Từ vựng giữa các cấp

Mỗi cấp có thể có `wordlist.json` – các từ thuộc chuẩn của cấp đó nhưng chưa nằm trong 生词 của bài nào (ví dụ `hsk1/wordlist.json`). Từ điển của một cấp được ghép theo thứ tự: toàn bộ từ của các cấp thấp hơn (coi là đã học) → wordlist → glossary → 生词 của các bài. Nhờ vậy câu HSK 2 dùng từ HSK 1 vẫn tự có pinyin và không bị gạch chân. Khi soạn bài HSK 1 mới, từ nào đưa vào 生词 sẽ tự được ưu tiên hơn wordlist.

Các trường mới cho bài khoá: `"passage": true` hiển thị bài khoá dạng đoạn văn (không phải hội thoại), `"listenQuiz"` là câu hỏi nghe trước khi đọc (cùng định dạng với `quiz` của ngữ pháp). Nhân vật có thể có `levelNotes` để ghi diễn biến ở từng cấp.

## Thêm một bài học

Sao chép `lesson-03.json` làm mẫu và đổi `"status": "draft"` thành `"ready"`.

- **Chữ Hán chỉ cần viết thường**, không cần ghi pinyin cho từng câu. Pinyin được tự sinh từ danh sách `vocab` của mọi bài cùng `glossary.json` (tách từ theo khớp dài nhất, tự xử lý biến điệu 不). Từ nào chưa có trong từ điển sẽ không có pinyin. `npm test` sẽ báo chính xác chữ nào còn thiếu.
- `texts[].lines[].speaker` là `id` trong `characters.json`. `tipRef` gắn một mẹo trong `tips` ngay sau câu đó.
- `objectives[].doneWhen` là danh sách các phần phải xong thì mục tiêu được tự tick. Các khoá hợp lệ: `pinyin`, `hanzi`, `warmup`, `text-1`…, `exercises`, `games`, `activity`, `twister`, `culture`.
- Ngữ pháp: `formula` là mảng các công thức. Mỗi thành phần có `role` để tô màu: `S` chủ ngữ, `V` vị ngữ, `O` tân ngữ, `ADV` trạng ngữ, `ATTR` định ngữ, `PART` trợ từ, `Q` nghi vấn, `N` danh từ, `X` dấu câu.
- `exercises[].kind`: `fill`, `reorder`, `listenPick`, `listenTF`, `pictureComplete`, `matchQA`, `choice`.
- `warmup` (bài 4–15): `[{ "emoji": "🍎", "word": "苹果", "pinyin": "píngguǒ", "vi": "táo" }]`.
- Từ ngoài bài (tên riêng, chữ trong câu nói nhịu…) khai báo ở `glossary.json`. `"known": true` thì không gạch chân. Không có `known` thì gạch chân, chạm vào để xem nghĩa.

Bài học được mở khoá tuần tự. Bài ở trạng thái `draft` vẫn xem trước được nhưng chưa hoàn thành được.

## Viết file bài tập về nhà

Gồm 15–20 câu, 7–9 câu đọc hiểu (phần A) và phần còn lại là viết (phần B). **Chỉ dùng từ của bài 1 đến bài hiện tại.** `npm test` sẽ kiểm tra số câu, tỉ lệ đọc/viết, từ vượt bài, đáp án trắc nghiệm, số chỗ trống trong câu điền từ, và việc đáp án sắp xếp dùng đúng các thẻ.

| `kind` | Trường chính |
|---|---|
| `mcq` | `prompt_zh` hoặc `prompt_vi`, `options`, `answer` (chỉ số) |
| `truefalse` | `statement_zh`, `statement_vi` (tuỳ chọn), `answer` |
| `match` | `pairs: [{ q, a }]` – chấm điểm theo từng cặp |
| `cloze` | `text` với `{{1}}`, `{{2}}`…, `bank`, `answers` |
| `reorder` | `tiles`, `answers` (mảng – chấp nhận nhiều thứ tự đúng), `vi` |
| `translate` | `prompt_vi`, `acceptedAnswers`, `requiredKeywords`, `wordBank` |

Mọi câu đều có `explain_vi`. Câu viết có thể thêm `grammarRef` (id thẻ ngữ pháp) để trang kết quả hiện liên kết "Ôn lại".

**Cách chấm câu dịch** (`src/lib/grading.ts`, có unit test):
1. Chuẩn hoá: bỏ khoảng trắng, đồng nhất dấu câu toàn/nửa độ rộng, bỏ dấu câu cuối. Khi so sánh, dấu câu bên trong cũng được bỏ qua, nên `老师，再见` khớp với `老师再见`.
2. Khớp một `acceptedAnswers` thì tính đúng.
3. Nếu đủ `requiredKeywords` và độ giống (Levenshtein) ≥ 60% thì tính "Gần đúng". Trang kết quả tô chỗ khác biệt, người học có thể bấm "Câu của tôi cũng đúng" để được ½ điểm.
4. Còn lại là sai. Trang kết quả hiện đáp án, giải thích và liên kết về phần 小语讲堂.

## Thêm audio

Đặt mp3 vào `public/audio/<cấp>/`, đặt tên theo số track của sách (`2-1.mp3`), rồi khai báo trong JSON:

- `texts[].audio`: cả đoạn hội thoại. Thêm `"t": <giây>` cho từng câu trong `lines` để bật highlight karaoke khi phát mp3.
- `texts[].vocabAudio`: bảng từ mới.
- `tongueTwister.audio`: câu nói nhịu.

Chưa có file thì tự dùng Web Speech API (zh-CN). Chất lượng giọng phụ thuộc vào trình duyệt và hệ điều hành; Chrome và Safari có giọng tiếng Trung tốt nhất.

## Thêm theme

1. Trong `src/index.css`, thêm một khối `:root[data-theme='ten-moi'] { --c-primary: R G B; … }` và một khối `:root[data-mode='dark'][data-theme='ten-moi']`. Giá trị viết dạng bộ ba RGB để Tailwind dùng được độ trong suốt.
2. Thêm theme vào mảng `THEMES` trong `src/theme/ThemeProvider.tsx`.
3. Kiểm tra độ tương phản: `--c-accent` là màu dùng cho chữ, cần đạt 4.5:1 trên `--c-surface`. `--c-onprimary` là màu chữ trên nút gradient; nút chính dùng chữ 19px đậm (chữ lớn theo WCAG), nên cần đạt 3:1.

Khăn quàng của Pàngdá tự đổi theo `--c-primary`. Script trong `index.html` đặt `data-theme` và `data-mode` trước khi render, nên trang không bị nháy màu khi tải.

## Đồng bộ đám mây với Supabase (tuỳ chọn)

Mặc định tiến độ chỉ lưu trong trình duyệt (localStorage). Bật Supabase để:
- học sinh đăng nhập bằng Google hoặc email, tiến độ tự đồng bộ giữa các thiết bị;
- giáo viên tạo lớp, đưa mã 6 ký tự cho học sinh, rồi xem bảng điểm cả lớp và xuất CSV.

localStorage vẫn là bộ nhớ chính: website dùng được khi mất mạng, có mạng lại thì tự đồng bộ. Khi gộp giữa hai máy, website luôn giữ kết quả tốt nhất (bài đã học hợp lại, điểm lấy cao nhất, chuỗi ngày học được nối nếu học liên tiếp trên hai máy).

### Cài đặt (khoảng 15 phút, gói miễn phí)

1. Tạo dự án tại https://supabase.com → **New project**.
2. **SQL Editor** → dán toàn bộ `supabase/schema.sql` → **Run**. File chạy lại được nhiều lần.
3. **Authentication → URL Configuration**:
   - *Site URL*: địa chỉ website, vd. `https://tenban.github.io/hsk-pangda/`
   - *Redirect URLs*: thêm cùng địa chỉ đó, và `http://localhost:5173/` khi chạy trên máy.
4. Đăng nhập bằng email: **Authentication → Email Templates → Magic Link**, thêm dòng `Mã đăng nhập: {{ .Token }}` để học sinh nhập mã 6 số (tiện khi mở email trên máy khác).
5. Đăng nhập bằng Google (tuỳ chọn): **Authentication → Providers → Google**, làm theo hướng dẫn tạo OAuth Client trên Google Cloud Console.
6. **Project Settings → API**: chép *Project URL* và khoá *anon public* vào `.env.local` (xem `.env.example`). Khi đăng bằng GitHub Actions thì đặt chúng thành *Repository variables* cùng tên.
7. Cấp quyền giáo viên: người đó đăng nhập website một lần, rồi quản trị viên chạy trong SQL Editor:
   ```sql
   select public.make_teacher('co.giao@truong.edu.vn');
   ```

### Bảo mật

Khoá *anon public* được phép đưa lên web. Dữ liệu được bảo vệ bằng Row Level Security (đã kiểm thử trên PostgreSQL 16):
- học sinh chỉ đọc và ghi tiến độ của chính mình;
- giáo viên chỉ đọc được tiến độ của học sinh trong lớp mình tạo;
- không ai tự cấp quyền giáo viên được – chỉ quản trị viên qua SQL Editor;
- người chưa đăng nhập không đọc được bảng nào.

### Đăng lên GitHub Pages

File `.github/workflows/deploy.yml` tự chạy test, build và đăng mỗi khi đẩy code lên nhánh `main`. Bật trong **Settings → Pages → Source: GitHub Actions**.

## Ghi chú kỹ thuật

- **Tiến độ** lưu trong localStorage với các khoá `progress.<cấp>`, `pangda.global`, `pangda.settings`, `pangda.theme`, `pangda.mode`. Trang Cài đặt có xuất/nhập file JSON. Phiên đăng nhập Supabase lưu ở khoá `sb-pangda-auth` (không nằm trong file sao lưu).
- **Thứ tự nét** dùng [hanzi-writer](https://hanziwriter.org). Dữ liệu nét của các chữ trong bài được đóng gói sẵn (tải lười, khoảng 250 KB gzip) nên chạy được khi không có mạng; chữ thiếu sẽ tải từ CDN jsDelivr. Dữ liệu từ `hanzi-writer-data` theo giấy phép Arphic Public License.
- **Chấm phát âm** khi Đóng vai dùng Speech Recognition (Chrome, Edge, Safari). Điểm là độ giống giữa câu nhận dạng được và câu mẫu, chỉ mang tính tham khảo.
- **Triển khai** lên host tĩnh không hỗ trợ rewrite URL (GitHub Pages…): `VITE_HASH_ROUTER=1 VITE_BASE=/ten-repo/ npm run build`.
- **Tiếp cận:** điều hướng được bằng bàn phím, có aria-label, có link "Bỏ qua tới nội dung chính". Khi bật prefers-reduced-motion, Pàngdá đứng yên và không có confetti.
