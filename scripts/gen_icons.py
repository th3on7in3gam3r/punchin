import struct, zlib, math

def make_png(size):
    bg = (37, 99, 235)
    white = (255, 255, 255)
    cx = cy = size // 2
    r = int(size * 0.45)
    lw = max(2, int(size * 0.08))

    pixels = [list(bg) for _ in range(size * size)]

    def set_px(x, y, color):
        if 0 <= x < size and 0 <= y < size:
            pixels[y * size + x] = list(color)

    def draw_circle(cx, cy, r, lw, color):
        for i in range(360 * 8):
            a = math.radians(i / 8)
            for t in range(-lw//2, lw//2+1):
                x = int(cx + (r+t) * math.cos(a))
                y = int(cy + (r+t) * math.sin(a))
                set_px(x, y, color)

    def draw_line(x0, y0, x1, y1, lw, color):
        dx, dy = x1-x0, y1-y0
        steps = max(abs(dx), abs(dy))
        if steps == 0:
            return
        for i in range(steps+1):
            x = int(x0 + dx*i/steps)
            y = int(y0 + dy*i/steps)
            for tx in range(-lw//2, lw//2+1):
                for ty in range(-lw//2, lw//2+1):
                    set_px(x+tx, y+ty, color)

    def draw_dot(cx, cy, r, color):
        for y in range(cy-r, cy+r+1):
            for x in range(cx-r, cx+r+1):
                if (x-cx)**2+(y-cy)**2 <= r**2:
                    set_px(x, y, color)

    br = int(size * 0.18)
    for y in range(size):
        for x in range(size):
            in_rect = True
            if x < br and y < br and (x-br)**2+(y-br)**2 > br**2:
                in_rect = False
            if x > size-br-1 and y < br and (x-(size-br-1))**2+(y-br)**2 > br**2:
                in_rect = False
            if x < br and y > size-br-1 and (x-br)**2+(y-(size-br-1))**2 > br**2:
                in_rect = False
            if x > size-br-1 and y > size-br-1 and (x-(size-br-1))**2+(y-(size-br-1))**2 > br**2:
                in_rect = False
            if not in_rect:
                pixels[y*size+x] = [0, 0, 0]

    draw_circle(cx, cy, r, lw, white)
    draw_line(cx, cy, cx, cy - int(r*0.55), lw, white)
    draw_line(cx, cy, cx + int(r*0.45), cy, lw, white)
    draw_dot(cx, cy, int(size*0.04), white)

    def png_chunk(name, data):
        c = zlib.crc32(name + data) & 0xffffffff
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', c)

    raw = b''
    for y in range(size):
        raw += b'\x00'
        for x in range(size):
            p = pixels[y*size+x]
            raw += bytes(p[:3])

    compressed = zlib.compress(raw, 9)
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    return b'\x89PNG\r\n\x1a\n' + png_chunk(b'IHDR', ihdr) + png_chunk(b'IDAT', compressed) + png_chunk(b'IEND', b'')

for size in [192, 512]:
    data = make_png(size)
    with open(f'public/icon-{size}.png', 'wb') as f:
        f.write(data)
    print(f'Generated icon-{size}.png ({len(data)} bytes)')
