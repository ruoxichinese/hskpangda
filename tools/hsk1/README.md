# Quy trình cập nhật một bài HSK 1 (dành cho Claude)

Nguồn người dùng tải lên: giáo trình `…新HSK1教程…pdf`, sách bài tập `Workbook…练习册…pdf`,
`Audio-HSK1.zip` (âm thanh giáo trình), `…学练手册-音频.zip` (âm thanh sách bài tập), kèm `hsk-pangda-lite.zip`.

## Bản đồ trang (số trang PDF)

| Bài | Giáo trình | Sách bài tập: Mô phỏng HSK | Ghi chú |
| --- | --- | --- | --- |
| 1 | 16–19 | 听读练 9–11 (bài tập 11) | BTVN = 听读练: phụ âm đầu, vần, thanh, chọn hội thoại theo tranh |
| 2 | 20–24 | 听读练 14–15 | |
| 3 | 25–32 | 听读练 18–19 | |
| 4 | 33–41 | 23–28 (听读练 22) | wb/4-2 = 听读练, wb/4-3 = 模拟测练 |
| 5 | 42–49 | 32–37 (听读练 31) | |
| 6 | 50–59 (小结 58–59) | 40–45 (听读练 39) | |
| 7 | 60–68 | 49–54 | từ bài 7 sách bài tập không còn 听读练 |
| 8 | 69–75 | 58–63 | |
| 9 | 76–83 (小结 83–84) | 67–72 | |
| 10 | 85–92 | 76–81 | nhân vật mới 售货员 |
| 11 | 93–100 | 85–90 | |
| 12 | 101–108 (小结 108–109) | 94–99 | bài khoá 1 cũng có câu nghe chọn đáp án |
| 13 | 110–117 | 103–108 | |
| 14 | 118–126 | 112–117 | |
| 15 | 127–134 (小结 135–136) | 121–126 | sách bài tập có thêm đề thi thử HSK 1 đầy đủ từ trang 127 |

Mỗi bài giáo trình: bài khoá k → âm thanh `N-(2k-1)` (bài khoá), `N-(2k)` (từ mới). Bài khoá 2, 3 có câu “nghe hai lần chọn đáp án” (đáp án tự suy ra từ lời thoại → liệt kê cho giáo viên).

## Các bước (khoảng 15 lệnh cho 3 bài)

1. `python3 tools/hsk1/media.py setup` – giải nén âm thanh, tải mô hình nhận dạng giọng nói (GitHub release, ~80 MB).
2. `media.py thumbs tb A B` → xem `/tmp/pg/thumbs.png` nếu chưa có trang trong bảng trên.
3. `media.py pages tb A B` rồi xem từng ảnh đôi `/tmp/pg/tb-*.jpg`; `media.py pages wb A B` cho sách bài tập.
4. `media.py asr "/tmp/wba/第N课_模拟测练.mp3"` → mốc giây + chữ Hán của từng câu nghe (đáp án + mốc cắt).
5. Đo toạ độ tranh: `media.py page150 wb P` (dò khối ảnh bằng scipy như trong lịch sử), viết spec JSON
   `{trang: {"l1-a": [x0,y0,x1,y1], …}}` (l1–l3 a/b/c: nghe chọn tranh; l6-a…d: nghe hội thoại; r11-a…d: đọc chọn tranh)
   → `media.py crop N spec.json` → xem `/tmp/pg/crop-N.jpg`.
6. `media.py audio N` – chép + nén âm thanh (kiểm tra độ dài không lệch).
7. Viết script nội dung dùng `lib.py`: bài học (`text()`, `V`, `L`, `R`, `Q`, `LQ`, `fill_set`, `save_lesson`) và
   BTVN (`wb_homework(n, dict(p1=…, p2=…, p3=…, p4=…, r1=…, r2=…, r3=…, r4=…, writing=writing(…)))`, `save_homework`).
   Mẫu đầy đủ: lịch sử chat bài 7–9 (l7.py, l8.py, l9.py, hw789.py). Nhân vật mới → thêm vào `src/data/characters.json`.
8. `sh validate.sh build` (skill) + `check_vocab.py hsk1 src/data/hsk1/lesson-NN.json` + `package_project.py --old <lite cũ>`.

## Lưu ý đã gặp

- BTVN từ sách bài tập phải 25–45 câu, `pinyin: false`; mô phỏng HSK chỉ có 20 câu → thêm 10 câu Viết (Pàngdá soạn thêm).
- Nhãn số câu phải ngắn (Â1, V1) – nhãn dài làm vỡ thanh điều hướng.
- Khi thêm từ mới của bài N, BTVN các bài trước có thể dùng trúng từ đó → test báo “dùng từ chưa học”; sửa BTVN cũ.
- Đừng `pkill -f <tên>` khi tên đó nằm trong chính câu lệnh bash (tự diệt shell).
- Từ điển lấy pinyin của từ đơn ở bài học SỚM NHẤT có từ đó: đừng khai cách đọc nhẹ (shang, li…) cho từ đơn nếu bài sau dùng nó với thanh đầy đủ – ghi cách đọc nhẹ vào note_vi.
- Tên gọi tắt (小明, 小胡…) phải thêm vào glossary, nếu không test “mọi chữ Hán có trong từ điển” báo lỗi.
- 里 / 上 / 边 sau danh từ đọc nhẹ: khai báo pinyin nhẹ trong từ mới (li, shang, bian).

## Đồng bộ âm thanh bài khoá (mốc t từng câu)

`python3 tools/hsk1/align.py 1 2 …` – nhận dạng giọng nói file bài khoá gốc, khớp với từng câu, ghi `t` (giây) vào lesson JSON.
Câu nào khớp kém được in dấu “?” → nghe lại và sửa tay. Tự thử nhiều ngưỡng tách câu khi có nhạc nền (bài 14).
Thiếu `t` thì website không tô sáng câu và phần Đóng vai / nghe từng câu phải dùng giọng máy.

## Đề thi thử

`src/data/hsk1/exams/thi-thu-01.json` – đề mô phỏng HSK 1 trong sách bài tập (trang 128–137), 20 Nghe + 20 Đọc, không có Viết.
File nghe `public/audio/hsk1/exam/hsk1-thi-thu-01.mp3`; mốc `start` mỗi câu = lúc đọc số câu (lấy từ `media.py asr`).
