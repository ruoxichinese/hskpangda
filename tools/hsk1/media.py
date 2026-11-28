#!/usr/bin/env python3
"""Công cụ nguồn HSK 1 (giáo trình, sách bài tập, âm thanh). Chạy từ thư mục dự án.
  python3 tools/hsk1/media.py setup                 giải nén âm thanh + tải mô hình nhận dạng giọng nói (một lần mỗi phiên)
  python3 tools/hsk1/media.py pages tb|wb A B       xuất ảnh trang ghép đôi → /tmp/pg/{tb|wb}-A.jpg … (để XEM)
  python3 tools/hsk1/media.py thumbs tb|wb A B      ảnh thu nhỏ có đánh số trang → /tmp/pg/thumbs.png (tìm trang đầu bài)
  python3 tools/hsk1/media.py asr <mp3> [db] [min]  nhận dạng lời đọc theo đoạn (mốc giây + chữ Hán) → dò đáp án & mốc câu
  python3 tools/hsk1/media.py audio N               chép + nén âm thanh bài N: giáo trình N-1…N-k → public/audio/hsk1/, sách bài tập → wb/N-2 (听读练), wb/N-3 (模拟测练)
  python3 tools/hsk1/media.py crop N spec.json      cắt tranh cho BTVN bài N theo spec {trang: {tên: [x0,y0,x1,y1]}} (toạ độ ở 150 dpi) + bảng xem trước /tmp/pg/crop-N.jpg
  python3 tools/hsk1/media.py page150 wb P          xuất 1 trang 150 dpi → /tmp/pg/p150-P.jpg (để đo toạ độ cắt tranh)
Nguồn lấy từ /mnt/user-data/uploads (tìm theo tên: 教程…pdf, Workbook…pdf, Audio-HSK1.zip, 学练手册-音频.zip)."""
import glob, json, os, re, subprocess, sys, zipfile
UP = '/mnt/user-data/uploads'; T = '/tmp/pg'; ROOT = os.getcwd()
os.makedirs(T, exist_ok=True)
def find(pat):
    fs = [f for f in glob.glob(UP + '/*') if re.search(pat, os.path.basename(f), re.I)]
    if not fs: sys.exit(f'Không thấy file nguồn khớp “{pat}” trong uploads – nhờ người dùng tải lên.')
    return sorted(fs)[-1]
PDF = {'tb': lambda: find(r'教程.*\.pdf$'), 'wb': lambda: find(r'(workbook|练习册|学练).*\.pdf$')}
def sh(*a, **k): return subprocess.run(a, capture_output=True, **k)
cmd = sys.argv[1] if len(sys.argv) > 1 else ''
if cmd == 'setup':
    os.makedirs('/tmp/tba', exist_ok=True); os.makedirs('/tmp/wba', exist_ok=True)
    if not glob.glob('/tmp/tba/**/*.mp3', recursive=True):
        zipfile.ZipFile(find(r'audio-hsk1.*\.zip$')).extractall('/tmp/tba')
    if not os.listdir('/tmp/wba'):
        z = zipfile.ZipFile(find(r'学练手册.*\.zip$'))
        for i in z.infolist():
            n = re.sub(r'#U([0-9a-f]{4})', lambda m: chr(int(m.group(1), 16)), i.filename)
            if n.endswith('.mp3'): open('/tmp/wba/' + n.split('/', 1)[1].replace('/', '_'), 'wb').write(z.read(i))
    sh(sys.executable, '-m', 'pip', 'install', '-q', 'sherpa-onnx', '--break-system-packages')
    M = '/tmp/asr/sherpa-onnx-paraformer-zh-small-2024-03-09'
    if not os.path.exists(M + '/model.int8.onnx'):
        os.makedirs('/tmp/asr', exist_ok=True)
        sh('curl', '-sL', '-o', '/tmp/asr/m.tar.bz2', 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-paraformer-zh-small-2024-03-09.tar.bz2')
        sh('tar', 'xjf', '/tmp/asr/m.tar.bz2', '-C', '/tmp/asr')
    print('Âm thanh giáo trình:', len(glob.glob('/tmp/tba/**/*.mp3', recursive=True)), 'file · sách bài tập:', sorted(os.listdir('/tmp/wba')))
    print('Mô hình nhận dạng:', 'có' if os.path.exists(M + '/model.int8.onnx') else 'THIẾU')
elif cmd in ('pages', 'thumbs', 'page150'):
    src = sys.argv[2]; a = int(sys.argv[3]); b = int(sys.argv[4]) if len(sys.argv) > 4 else a
    from PIL import Image, ImageDraw
    if cmd == 'page150':
        sh('pdftoppm', '-r', '150', '-f', str(a), '-l', str(a), '-jpeg', PDF[src](), f'{T}/p150tmp')
        f = glob.glob(f'{T}/p150tmp*')[0]; os.replace(f, f'{T}/p150-{a}.jpg'); print(f'{T}/p150-{a}.jpg'); sys.exit()
    dpi = '14' if cmd == 'thumbs' else '90'
    for f in glob.glob(f'{T}/raw-*'): os.remove(f)
    sh('pdftoppm', '-r', dpi, '-gray', '-jpeg', '-f', str(a), '-l', str(b), PDF[src](), f'{T}/raw')
    fs = sorted(glob.glob(f'{T}/raw-*.jpg')); ims = [Image.open(f) for f in fs]
    if cmd == 'thumbs':
        w, h = ims[0].size; S = Image.new('L', (w * 10, h * ((len(ims) + 9) // 10)), 255); d = ImageDraw.Draw(S)
        for i, im in enumerate(ims): S.paste(im, ((i % 10) * w, (i // 10) * h)); d.text(((i % 10) * w + 2, (i // 10) * h + 2), str(a + i), fill=0)
        S.save(f'{T}/thumbs.png'); print(f'{T}/thumbs.png')
    else:
        for i in range(0, len(ims), 2):
            A = ims[i]; B = ims[i + 1] if i + 1 < len(ims) else Image.new('L', A.size, 255)
            S = Image.new('L', (A.width + B.width, A.height), 255); S.paste(A, (0, 0)); S.paste(B, (A.width, 0))
            S.save(f'{T}/{src}-{a + i}.jpg', quality=65); print(f'{T}/{src}-{a + i}.jpg')
elif cmd == 'asr':
    import numpy as np, sherpa_onnx
    M = '/tmp/asr/sherpa-onnx-paraformer-zh-small-2024-03-09/'
    rec = sherpa_onnx.OfflineRecognizer.from_paraformer(paraformer=M + 'model.int8.onnx', tokens=M + 'tokens.txt', num_threads=4)
    f = sys.argv[2]; db = sys.argv[3] if len(sys.argv) > 3 else '-35'; mind = sys.argv[4] if len(sys.argv) > 4 else '0.6'
    a = np.frombuffer(sh('ffmpeg', '-v', 'quiet', '-i', f, '-ac', '1', '-ar', '16000', '-f', 's16le', '-').stdout, np.int16).astype(np.float32) / 32768
    out = sh('ffmpeg', '-i', f, '-af', f'silencedetect=noise={db}dB:d={mind}', '-f', 'null', '-', text=True).stderr
    ss = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', out)]; se = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', out)]
    dur = len(a) / 16000; cur = 0.0; segs = []
    for s, e in zip(ss, se + [dur] * (len(ss) - len(se))):
        if s - cur > 0.15: segs.append((cur, s))
        cur = e
    if dur - cur > 0.15: segs.append((cur, dur))
    for s, e in segs:
        st = rec.create_stream(); st.accept_waveform(16000, a[int(s * 16000):int(e * 16000)]); rec.decode_stream(st)
        print(f'{s:7.1f}-{e:6.1f} {st.result.text}')
elif cmd == 'audio':
    n = sys.argv[2]; P = f'{ROOT}/public/audio/hsk1'; os.makedirs(P + '/wb', exist_ok=True); done = []
    for f in sorted(glob.glob(f'/tmp/tba/**/{n}-*.mp3', recursive=True)):
        done.append((f, f'{P}/{os.path.basename(f)}'))
    for tag, k in (('听读练', 2), ('模拟测练', 3)):
        f = f'/tmp/wba/第{n}课_{tag}.mp3'
        if os.path.exists(f): done.append((f, f'{P}/wb/{n}-{k}.mp3'))
    for src, dst in done:
        sh('ffmpeg', '-v', 'quiet', '-y', '-i', src, '-map', '0:a', '-ac', '1', '-ar', '32000', '-b:a', '48k', '-map_metadata', '-1', dst)
        cnt = lambda x: len(sh('ffmpeg', '-v', 'quiet', '-i', x, '-f', 's16le', '-ac', '1', '-ar', '8000', '-').stdout)
        a, b = cnt(src), cnt(dst)
        print(f'{os.path.relpath(dst, ROOT):40s} {b / 16000:6.1f}s', 'OK' if abs(a - b) < 1600 else 'LỆCH ĐỘ DÀI!')
elif cmd == 'crop':
    from PIL import Image, ImageDraw
    n = int(sys.argv[2]); spec = json.load(open(sys.argv[3]))
    out = f'{ROOT}/src/data/hsk1/homework/img/hw-{n:02d}'; os.makedirs(out, exist_ok=True); tiles = []
    for pg, boxes in spec.items():
        f = f'{T}/p150-{pg}.jpg'
        if not os.path.exists(f): sh(sys.executable, __file__, 'page150', 'wb', pg)
        im = Image.open(f).convert('RGB')
        for name, b in boxes.items():
            c = im.crop(tuple(b)); c.thumbnail((520, 520)); c.save(f'{out}/{name}.jpg', quality=82); tiles.append((name, c))
    W, tw, th = 6, 200, 170; S = Image.new('RGB', (W * tw, ((len(tiles) + W - 1) // W) * th), 'white'); d = ImageDraw.Draw(S)
    for i, (nm, c) in enumerate(tiles):
        t = c.copy(); t.thumbnail((tw - 6, th - 22)); S.paste(t, ((i % W) * tw + 3, (i // W) * th + 18)); d.text(((i % W) * tw + 3, (i // W) * th + 3), nm, fill='red')
    S.save(f'{T}/crop-{n}.jpg', quality=80); print(f'{len(tiles)} tranh → {out} · xem {T}/crop-{n}.jpg')
else:
    print(__doc__)
