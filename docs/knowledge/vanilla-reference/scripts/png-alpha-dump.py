#!/usr/bin/env python3
"""小さな PNG テクスチャの透明度を、1ピクセルずつ表示する（'..' は完全に透明）。

使い方: python3 png-alpha-dump.py <ファイル.png> [...]
バニラのテクスチャの枠や光の筋の位置を確かめるのに使う（例: ガラスは外周 1 ピクセルが枠、内側 14x14 が面）。
標準ライブラリのみ。8 ビットの RGBA・RGB・グレースケール・パレット形式の PNG に対応。
"""
import struct
import sys
import zlib


def load(path):
    data = open(path, "rb").read()
    pos, idat, plte, trns = 8, b"", None, None
    while pos < len(data):
        length, kind = struct.unpack(">I4s", data[pos:pos + 8])
        chunk = data[pos + 8:pos + 8 + length]
        pos += 12 + length
        if kind == b"IHDR":
            width, height, _depth, ctype = struct.unpack(">IIBB", chunk[:10])
        elif kind == b"IDAT":
            idat += chunk
        elif kind == b"PLTE":
            plte = chunk
        elif kind == b"tRNS":
            trns = chunk
    bpp = {6: 4, 2: 3, 3: 1, 4: 2, 0: 1}[ctype]
    raw, stride, prev, rows, i = zlib.decompress(idat), width * bpp, bytearray(width * bpp), [], 0
    for _ in range(height):
        kind, line = raw[i], bytearray(raw[i + 1:i + 1 + stride])
        i += 1 + stride
        for x in range(stride):
            a = line[x - bpp] if x >= bpp else 0
            b = prev[x]
            c = prev[x - bpp] if x >= bpp else 0
            if kind == 1:
                line[x] = (line[x] + a) & 255
            elif kind == 2:
                line[x] = (line[x] + b) & 255
            elif kind == 3:
                line[x] = (line[x] + (a + b) // 2) & 255
            elif kind == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append(line)
        prev = line

    def alpha(row, x):
        if ctype == 6:
            return row[x * 4 + 3]
        if ctype == 4:
            return row[x * 2 + 1]
        if ctype == 3:
            index = row[x]
            return trns[index] if trns and index < len(trns) else 255
        return 255

    return width, height, [[alpha(r, x) for x in range(width)] for r in rows]


for path in sys.argv[1:]:
    w, h, grid = load(path)
    print(f"{path} {w}x{h}")
    for row in grid:
        print(" ".join(".." if a == 0 else f"{a:02x}" for a in row))
