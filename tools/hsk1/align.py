#!/usr/bin/env python3
"""Ghi mốc thời gian từng câu (t) cho bài khoá HSK 1 từ âm thanh gốc – để tô sáng câu và nghe từng câu bằng giọng thật.
  python3 tools/hsk1/align.py 1 2 3 …      (số bài; cần media.py setup trước)
Cách làm: nhận dạng giọng nói theo đoạn (khoảng lặng) → khớp tuần tự đoạn với câu theo độ trùng chữ Hán.
In bảng kiểm tra; câu nào khớp kém được đánh dấu “?” để nghe lại."""
import json, re, subprocess, sys, glob, os
import numpy as np, sherpa_onnx
M = '/tmp/asr/sherpa-onnx-paraformer-zh-small-2024-03-09/'
rec = sherpa_onnx.OfflineRecognizer.from_paraformer(paraformer=M + 'model.int8.onnx', tokens=M + 'tokens.txt', num_threads=4)
HZ = lambda s: re.sub(r'[^\u4e00-\u9fff0-9]', '', s)
NUM = dict(zip('0123456789', '零一二三四五六七八九'))
def norm(s): return ''.join(NUM.get(c, c) for c in HZ(s))
def segments(f, db='-35', mind='0.35'):
    a = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'quiet', '-i', f, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True).stdout, np.int16).astype(np.float32) / 32768
    out = subprocess.run(['ffmpeg', '-i', f, '-af', f'silencedetect=noise={db}dB:d={mind}', '-f', 'null', '-'], capture_output=True, text=True).stderr
    ss = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', out)]; se = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', out)]
    dur = len(a) / 16000; cur = 0.0; segs = []
    for s, e in zip(ss, se + [dur] * (len(ss) - len(se))):
        if s - cur > 0.15: segs.append((cur, s))
        cur = e
    if dur - cur > 0.15: segs.append((cur, dur))
    res = []
    for s, e in segs:
        st = rec.create_stream(); st.accept_waveform(16000, a[int(s * 16000):int(e * 16000)]); rec.decode_stream(st)
        txt = norm(st.result.text)
        if txt: res.append((s, e, txt))
    return res
def sim(seg, line):
    if not seg: return 0
    pool = list(line); hit = 0
    for c in seg:
        if c in pool: pool.remove(c); hit += 1
    return hit / len(seg)
def align(lines, segs):
    L = [norm(l['zh']) for l in lines]; n = len(L)
    # DP: gán mỗi đoạn cho một câu, chỉ số câu không giảm, mỗi câu ít nhất 1 đoạn
    m = len(segs); NEG = -1e9
    dp = [[NEG] * n for _ in range(m)]; bk = [[0] * n for _ in range(m)]
    for j in range(m):
        for i in range(n):
            s = sim(segs[j][2], L[i]) * len(segs[j][2])
            if j == 0:
                dp[j][i] = s if i == 0 else NEG; continue
            stay = dp[j - 1][i]; adv = dp[j - 1][i - 1] if i > 0 else NEG
            if adv > stay: dp[j][i], bk[j][i] = adv + s, 1
            else: dp[j][i], bk[j][i] = stay + s, 0
    if m < n or dp[m - 1][n - 1] <= NEG / 2: return None
    i = n - 1; owner = [0] * m
    for j in range(m - 1, -1, -1):
        owner[j] = i
        if j > 0 and bk[j][i] == 1: i -= 1
    out = []
    for i in range(n):
        js = [j for j in range(m) if owner[j] == i]
        heard = ''.join(segs[j][2] for j in js)
        out.append((round(max(0, segs[js[0]][0] - 0.15), 2), heard, sim(L[i], heard)))
    return out
if __name__ == '__main__':
    for n in map(int, sys.argv[1:]):
        p = f'src/data/hsk1/lesson-{n:02d}.json'; d = json.load(open(p)); changed = 0
        for t in d['texts']:
            src = glob.glob(f'/tmp/tba/**/{os.path.basename(t.get("audio", "x"))}', recursive=True)
            if not t.get('audio') or not src: print(f'bài {n} {t["id"]}: không có file âm thanh'); continue
            best = None
            for db in ('-35', '-30', '-26', '-22'):   # nhạc nền → hạ ngưỡng tách câu
                r = align(t['lines'], segments(src[0], db))
                if r:
                    score = min(x[2] for x in r)
                    if not best or score > best[0]: best = (score, r)
                    if score >= 0.6: break
            r = best[1] if best else None
            if not r: print(f'bài {n} {t["id"]}: KHÔNG KHỚP ĐƯỢC ({len(segs)} đoạn / {len(t["lines"])} câu)'); continue
            for l, (tt, heard, sc) in zip(t['lines'], r):
                l['t'] = tt
                flag = '  ' if sc >= 0.6 else ' ?'
                print(f'bài {n} {t["id"]}{flag} {tt:6.2f}  {norm(l["zh"])[:18]:18s} | nghe: {heard[:18]}')
            changed += 1
        json.dump(d, open(p, 'w'), ensure_ascii=False, indent=1)
