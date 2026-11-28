"""Thư viện dựng dữ liệu HSK 1. Dùng trong script nội dung của từng bài:
    import sys; sys.path.insert(0, 'tools/hsk1'); from lib import *
Bài học: R (ô công thức), V (từ mới), L (câu thoại), Q (câu hỏi nhanh) → save_lesson(dict).
BTVN từ sách bài tập: wb_homework(n, spec) → save_homework(dict). Xem ví dụ đặc tả trong README.md."""
import json, os
D = 'src/data/hsk1/'

def R(zh, label, role): return {"zh": zh, "label": label, "role": role}
def V(zh, py, pos, vi, ez, ev, **k):
    d = {"zh": zh, "pinyin": py, "pos": pos, "vi": vi, "example": {"zh": ez, "vi": ev}}; d.update(k); return d
def L(sp, zh, vi, **k):
    d = {"speaker": sp, "zh": zh, "vi": vi}; d.update(k); return d
def Q(p, opts, a, ex=None, zh=None):
    d = {"prompt_vi": p, "options": opts, "answer": a}
    if zh: d["prompt_zh"] = zh
    if ex: d["explain_vi"] = ex
    return d
def LQ(zh, opts, a, ex=None):
    """câu nghe hai lần – chọn đáp án (listenQuiz) của giáo trình"""
    return Q("Nghe hai lần rồi chọn đáp án đúng.", opts, a, ex, zh=zh)
def text(n, k, tid, context, scene, lines, vocab, grammar=None, **extra):
    """bài khoá k của bài n; âm thanh theo số track sách: bài khoá = 2k-1, từ mới = 2k"""
    d = {"id": tid, "context_vi": context, "scene": scene, "audio": f"audio/hsk1/{n}-{2*k-1}.mp3",
         "vocabAudio": f"audio/hsk1/{n}-{2*k}.mp3", "lines": lines, "vocab": vocab}
    if grammar: d["grammar"] = grammar
    d.update(extra); return d
def fill_set(bank, items):
    """选词填空 của sách → các câu fill: items = [(câu có ___, đáp án, giải thích)]"""
    return [{"kind": "fill", "sentence": s, "bank": bank, "answer": a, "explain_vi": ex} for s, a, ex in items]
def number_ex(items):
    for i, e in enumerate(items): e["id"] = f"e{i+1}"
    return items

def save_lesson(l):
    p = D + f"lesson-{l['id']:02d}.json"; json.dump(l, open(p, 'w'), ensure_ascii=False, indent=1)
    print(f"bài {l['id']}: " + ' · '.join(f"{t['id']} {len(t['lines'])} câu/{len(t['vocab'])} từ/{len(t.get('grammar', []))} NP" for t in l['texts']) + f" · luyện tập {len(l['exercises'])}")

def add_glossary(items):
    """items = [(zh, pinyin, vi, known)] – tên riêng known=True; từ ngoài bài known=False"""
    g = json.load(open(D + 'glossary.json')); have = {w['zh'] for w in g['words']}; add = 0
    for zh, py, vi, k in items:
        if zh in have: continue
        e = {"zh": zh, "pinyin": py, "vi": vi}
        if k: e.update(known=True, proper=True)
        g['words'].append(e); add += 1
    json.dump(g, open(D + 'glossary.json', 'w'), ensure_ascii=False, indent=1); print('glossary +', add)

# ---------- BTVN từ sách bài tập (新HSK教程1 学练手册) ----------
FIX = dict(fixed=True)
def clip(s, e, src=None):
    d = {"start": round(s - 0.3, 1), "end": round(e + 1.0, 1)}
    if src: d["src"] = src
    return d
def wb_homework(n, spec):
    """spec keys (đều tuỳ chọn):
      listenRead: [(lựa chọn[], (giây đầu, giây cuối), đáp án index, giải thích)]   – 听读练 1, file wb/N-2
      p1: [(câu, (s,e), 'A|B|C', giải thích)]        – nghe chọn tranh, ảnh l{câu}-a/b/c.jpg
      p2: [(câu, [3 lựa chọn], 'A', (s,e), giải thích)] – nghe câu hỏi chọn trả lời
      p3: [(câu, 'A-D', (s,e), giải thích)]            – nghe hội thoại chọn tranh, ảnh l6-a…d.jpg
      p4: giống p2                                     – nghe câu + câu hỏi
      r1: [(câu, câu chữ Hán, 'A-D', giải thích)]      – đọc chọn tranh, ảnh r11-a…d.jpg
      r2: ([4 câu đáp], [(câu, câu hỏi, index, giải thích)], hướng dẫn)
      r3: ([3 từ], [(câu, câu có （　）, index, giải thích)])
      r4: [(câu, đoạn, câu hỏi ★, [3 lựa chọn], index, giải thích)]
      writing: [section…] (phần viết Pàngdá soạn thêm, type writing)"""
    S = []; img = lambda nm: f"hw-{n:02d}/{nm}.jpg"
    if spec.get('listenRead'):
        S.append({"type": "listening", "part": "听读练", "title_vi": "Nghe – chọn âm tiết", "instructions_vi": "Nghe đoạn ghi âm, chọn âm tiết bạn nghe được, rồi đọc to lại.",
                  "questions": [{"id": f"t{i+1}", "num": f"Â{i+1}", "kind": "mcq", "prompt_vi": "Nghe, chọn âm tiết bạn nghe được.", "options": o, "answer": a,
                                 "explain_vi": ex, "audio": clip(*t, f"audio/hsk1/wb/{n}-2.mp3"), **FIX} for i, (o, t, a, ex) in enumerate(spec['listenRead'])]})
    for q, t, a, ex in spec.get('p1', []):
        S.append({"type": "listening", "part": "第一部分", "title_vi": f"Nghe – chọn tranh (câu {q})", "instructions_vi": "Nghe cụm từ (đọc hai lần), chọn tranh đúng.",
                  "images": [{"key": k.upper(), "img": img(f"l{q}-{k}")} for k in "abc"],
                  "questions": [{"id": str(q), "num": str(q), "kind": "mcq", "prompt_vi": "Nghe, chọn tranh đúng.", "options": list("ABC"), "answer": "ABC".index(a), "explain_vi": ex, "audio": clip(*t), **FIX}]})
    t3 = lambda qs: [{"id": str(q), "num": str(q), "kind": "mcq", "options": o, "answer": "ABC".index(a), "explain_vi": ex, "audio": clip(*t), **FIX} for q, o, a, t, ex in qs]
    if spec.get('p2'):
        S.append({"type": "listening", "part": "第二部分", "title_vi": "Nghe câu hỏi – chọn câu trả lời (câu 4–5)", "instructions_vi": "Nghe câu hỏi (đọc hai lần), chọn câu trả lời đúng.", "questions": t3(spec['p2'])})
    if spec.get('p3'):
        S.append({"type": "listening", "part": "第三部分", "title_vi": "Nghe hội thoại – chọn tranh (câu 6–8)", "instructions_vi": "Nghe hội thoại (đọc hai lần), chọn tranh phù hợp nhất. Tranh A là ví dụ.",
                  "images": [{"key": k.upper(), "img": img(f"l6-{k}")} for k in "abcd"],
                  "questions": [{"id": str(q), "num": str(q), "kind": "mcq", "prompt_vi": "Nghe hội thoại, chọn tranh phù hợp.", "options": list("ABCD"), "answer": "ABCD".index(a), "explain_vi": ex, "audio": clip(*t), **FIX} for q, a, t, ex in spec['p3']]})
    if spec.get('p4'):
        S.append({"type": "listening", "part": "第四部分", "title_vi": "Nghe câu và câu hỏi – chọn đáp án (câu 9–10)", "instructions_vi": "Nghe một câu và câu hỏi (đọc hai lần), chọn đáp án đúng.", "questions": t3(spec['p4'])})
    if spec.get('r1'):
        S.append({"type": "reading", "part": "第一部分", "title_vi": "Đọc – chọn tranh (câu 11–13)", "instructions_vi": "Chọn tranh phù hợp với mỗi câu. Tranh A là ví dụ: 我很喜欢这本书。",
                  "images": [{"key": k.upper(), "img": img(f"r11-{k}")} for k in "abcd"],
                  "questions": [{"id": str(q), "num": str(q), "kind": "mcq", "prompt_zh": s, "options": list("ABCD"), "answer": "ABCD".index(a), "explain_vi": ex, **FIX} for q, s, a, ex in spec['r1']]})
    if spec.get('r2'):
        o, items, ins = spec['r2']
        S.append({"type": "reading", "part": "第二部分", "title_vi": "Đọc – ghép câu (câu 14–16)", "instructions_vi": ins,
                  "questions": [{"id": str(q), "num": str(q), "kind": "mcq", "prompt_zh": s, "options": o, "answer": a, "explain_vi": ex, **FIX} for q, s, a, ex in items]})
    if spec.get('r3'):
        o, items = spec['r3']
        S.append({"type": "reading", "part": "第三部分", "title_vi": "Đọc – chọn từ điền (câu 17–18)", "instructions_vi": "Chọn từ thích hợp điền vào chỗ trống.",
                  "questions": [{"id": str(q), "num": str(q), "kind": "mcq", "prompt_zh": s, "options": o, "answer": a, "explain_vi": ex, **FIX} for q, s, a, ex in items]})
    if spec.get('r4'):
        S.append({"type": "reading", "part": "第四部分", "title_vi": "Đọc – chọn đáp án (câu 19–20)", "instructions_vi": "Đọc câu, rồi chọn đáp án đúng cho câu hỏi có dấu ★.",
                  "questions": [{"id": str(q), "num": str(q), "kind": "mcq", "context_zh": c, "prompt_zh": "★ " + p, "options": o, "answer": a, "explain_vi": ex, **FIX} for q, c, p, o, a, ex in spec['r4']]})
    S += spec.get('writing', [])
    return {"lessonId": n, "level": "hsk1", "status": "ready", "pinyin": False, "audio": f"audio/hsk1/wb/{n}-3.mp3",
            "source_vi": "Bài tập trong sách bài tập 新HSK教程1 学练手册 (phần Mô phỏng HSK); phần Viết do Pàngdá soạn thêm", "sections": S}

def writing(reorders, translates):
    """phần Viết Pàngdá soạn thêm: reorders = [(mảnh[], đáp án[], dịch, giải thích, grammarRef|None)], translates = [(đề, đáp án[], từ khoá[], ngân hàng từ[], giải thích, grammarRef|None)]"""
    ro = []; tr = []
    for i, (t, a, vi, ex, g) in enumerate(reorders):
        d = {"id": f"b{i+1}", "num": f"V{i+1}", "kind": "reorder", "tiles": t, "answers": a, "vi": vi, "explain_vi": ex}
        if g: d["grammarRef"] = g
        ro.append(d)
    for i, (p, acc, kw, bank, ex, g) in enumerate(translates):
        d = {"id": f"b{len(reorders)+i+1}", "num": f"V{len(reorders)+i+1}", "kind": "translate", "prompt_vi": p, "acceptedAnswers": acc, "requiredKeywords": kw, "wordBank": bank, "explain_vi": ex}
        if g: d["grammarRef"] = g
        tr.append(d)
    return [{"type": "writing", "part": "B1", "title_vi": "Sắp xếp từ thành câu (Pàngdá soạn thêm)", "instructions_vi": "Chạm hoặc kéo các thẻ từ để xếp thành câu đúng.", "questions": ro},
            {"type": "writing", "part": "B2", "title_vi": "Dịch sang tiếng Trung (Pàngdá soạn thêm)", "instructions_vi": "Gõ chữ Hán bằng bộ gõ của máy, hoặc dùng nút “Gõ bằng pinyin”.", "questions": tr}]

def save_homework(h):
    p = D + f"homework/hw-{h['lessonId']:02d}.json"; json.dump(h, open(p, 'w'), ensure_ascii=False, indent=1)
    qs = [q for s in h['sections'] for q in s['questions']]
    miss = [i['img'] for s in h['sections'] for i in s.get('images', []) if not os.path.exists(D + 'homework/img/' + i['img'])]
    print(f"BTVN bài {h['lessonId']}: {len(qs)} câu (cần 25–45) · {len(h['sections'])} phần" + (f" · THIẾU ẢNH {miss}" if miss else ''))
