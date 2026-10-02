#!/usr/bin/env python3
"""Генератор текстур, моделей, рецептов и языковых файлов мода (без внешних зависимостей)."""
import zlib, struct, json, os, random
R = os.path.join(os.path.dirname(__file__), '..', 'src', 'main', 'resources')
A = os.path.join(R, 'assets', 'raftsurvival')
D = os.path.join(R, 'data', 'raftsurvival')
random.seed(7)

def png(path, w, h, px):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    raw = b''.join(b'\x00' + b''.join(bytes(px[y][x]) for x in range(w)) for y in range(h))
    def ch(t, d): c = struct.pack('>I', len(d)) + t + d; return c + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + ch(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)) + ch(b'IDAT', zlib.compress(raw)) + ch(b'IEND', b''))

def canvas(w, h, c=(0, 0, 0, 0)): return [[c for _ in range(w)] for _ in range(h)]
def jit(c, n=10): d = random.randint(-n, n); return (max(0, min(255, c[0] + d)), max(0, min(255, c[1] + d)), max(0, min(255, c[2] + d)), 255)
def fill(px, x, y, w, h, c, n=0):
    for j in range(y, y + h):
        for i in range(x, x + w):
            if 0 <= j < len(px) and 0 <= i < len(px[0]): px[j][i] = jit(c, n) if n else c
def block_tex(name, base, line=None, noise=8, bands=None):
    px = canvas(16, 16)
    fill(px, 0, 0, 16, 16, base, noise)
    if line:
        for y in range(0, 16, 4): fill(px, 0, y, 16, 1, line)
    if bands:
        for y in bands: fill(px, 0, y, 16, 2, (90, 90, 95, 255))
    png(f'{A}/textures/block/{name}.png', 16, 16, px)
def item_tex(name, draw):
    px = canvas(16, 16); draw(px); png(f'{A}/textures/item/{name}.png', 16, 16, px)
def line(px, pts, c):
    for x, y in pts: fill(px, x, y, 1, 1, c)

# ---- блоки
wood = (150, 105, 60, 255)
block_tex('raft_plank', wood, (95, 65, 35, 255))
block_tex('floating_barrel_side', (125, 85, 45, 255), (80, 55, 30, 255), bands=[3, 11])
block_tex('floating_barrel_top', (110, 75, 40, 255), None, 6, bands=[0, 14])
block_tex('desalinator_side', (120, 140, 150, 255), (70, 90, 100, 255))
block_tex('desalinator_top', (60, 130, 190, 255), None, 14)
for i, c in enumerate([(160, 120, 70, 255), (190, 150, 130, 255), (170, 110, 60, 255)]):
    block_tex(f'drying_rack_{i}', wood, (95, 65, 35, 255))
    p = canvas(16, 16); 
    import copy
    px = canvas(16, 16); fill(px, 0, 0, 16, 16, wood, 8)
    for y in range(0, 16, 4): fill(px, 0, y, 16, 1, (95, 65, 35, 255))
    if i: fill(px, 3, 5, 10, 6, c, 6); fill(px, 12, 6, 3, 4, c)
    png(f'{A}/textures/block/drying_rack_{i}.png', 16, 16, px)

# ---- предметы
item_tex('scrap', lambda p: (fill(p, 3, 6, 10, 4, (140, 100, 60, 255), 8), fill(p, 5, 4, 4, 8, (110, 80, 50, 255), 8)))
item_tex('rope', lambda p: [fill(p, 3 + (i % 2), 2 + i, 9, 1, (200, 175, 120, 255), 12) for i in range(12)])
item_tex('shark_tooth', lambda p: [fill(p, 7 - i // 2, 2 + i, 2 + i // 2 * 1, 1, (245, 245, 235, 255)) for i in range(11)])
item_tex('gull_feather', lambda p: [fill(p, 3 + i, 12 - i, 2, 1, (245, 245, 250, 255)) for i in range(10)])
def dried(p):
    fill(p, 3, 6, 9, 5, (190, 140, 100, 255), 8); fill(p, 11, 5, 3, 7, (170, 120, 85, 255)); fill(p, 5, 7, 1, 1, (20, 20, 20, 255))
item_tex('dried_fish', dried)
def harpoon(p):
    for i in range(12): fill(p, 2 + i, 13 - i, 1, 1, (110, 80, 50, 255))
    fill(p, 11, 1, 4, 1, (200, 200, 205, 255)); fill(p, 14, 1, 1, 4, (200, 200, 205, 255)); fill(p, 12, 3, 2, 1, (200, 200, 205, 255))
item_tex('harpoon', harpoon)
def flare(p):
    fill(p, 6, 6, 4, 8, (200, 40, 40, 255), 6); fill(p, 6, 4, 4, 2, (240, 230, 200, 255)); fill(p, 7, 1, 2, 3, (255, 200, 40, 255))
item_tex('signal_flare', flare)

# ---- сущности: UV-развёртка боксов
def box(px, u, v, w, h, d, top, side, bot, belly=None):
    fill(px, u + d, v, w, d, top, 6); fill(px, u + d + w, v, w, d, bot, 4)
    for (x0, ww) in [(u, d), (u + d, w), (u + d + w, d), (u + 2 * d + w, w)]:
        for j in range(h):
            t = j / max(1, h - 1)
            c = side if (belly is None or t < 0.55) else belly
            fill(px, x0, v + d + j, ww, 1, c, 5)
sh = canvas(128, 64)
GR, GR2, WH = (88, 104, 122, 255), (70, 84, 100, 255), (225, 230, 235, 255)
box(sh, 0, 0, 10, 10, 22, GR2, GR, WH, WH); box(sh, 0, 32, 8, 8, 10, GR2, GR, WH, WH)
box(sh, 40, 32, 6, 6, 10, GR2, GR, WH, WH); box(sh, 80, 32, 4, 4, 8, GR2, GR, WH, WH)
box(sh, 104, 32, 2, 16, 6, GR2, GR2, GR2); box(sh, 64, 0, 2, 6, 8, GR2, GR2, GR2)
box(sh, 88, 0, 8, 1, 4, GR2, GR, WH); box(sh, 88, 8, 8, 1, 4, GR2, GR, WH)
fill(sh, 10, 32 + 10 + 2, 2, 2, (10, 10, 10, 255)); fill(sh, 14, 32 + 10 + 2, 2, 2, (10, 10, 10, 255))
fill(sh, 12, 32 + 10 + 6, 4, 1, (120, 30, 30, 255))
png(f'{A}/textures/entity/shark.png', 128, 64, sh)
gl = canvas(64, 32); W, G, Y, O = (245, 245, 248, 255), (150, 158, 170, 255), (240, 190, 40, 255), (230, 140, 50, 255)
box(gl, 0, 0, 5, 4, 10, W, W, W); box(gl, 0, 14, 3, 3, 3, W, W, W); box(gl, 14, 14, 1, 1, 2, Y, Y, Y)
box(gl, 32, 0, 9, 1, 5, G, G, W); box(gl, 32, 8, 9, 1, 5, G, G, W); box(gl, 0, 22, 4, 1, 4, W, W, G)
box(gl, 20, 22, 1, 3, 1, O, O, O); box(gl, 28, 22, 1, 3, 1, O, O, O); fill(gl, 4, 14 + 3 + 1, 1, 1, (10, 10, 10, 255)); fill(gl, 6, 14 + 3 + 1, 1, 1, (10, 10, 10, 255))
png(f'{A}/textures/entity/gull.png', 64, 32, gl)

# ---- модели / состояния / определения предметов
def J(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True); json.dump(obj, open(path, 'w'), ensure_ascii=False, indent=1)
M = 'raftsurvival:'
def cube_all(n): J(f'{A}/models/block/{n}.json', {'parent': 'minecraft:block/cube_all', 'textures': {'all': M + 'block/' + n}})
cube_all('raft_plank')
J(f'{A}/models/block/floating_barrel.json', {'parent': 'minecraft:block/cube_column', 'textures': {'end': M + 'block/floating_barrel_top', 'side': M + 'block/floating_barrel_side'}})
J(f'{A}/models/block/desalinator.json', {'parent': 'minecraft:block/cube_bottom_top', 'textures': {'top': M + 'block/desalinator_top', 'bottom': M + 'block/desalinator_side', 'side': M + 'block/desalinator_side'}})
for i in range(3): cube_all(f'drying_rack_{i}')
for b in ['raft_plank', 'floating_barrel', 'desalinator']:
    J(f'{A}/blockstates/{b}.json', {'variants': {'': {'model': M + 'block/' + b}}})
J(f'{A}/blockstates/drying_rack.json', {'variants': {f'stage={i}': {'model': M + f'block/drying_rack_{i}'} for i in range(3)}})
for b in ['raft_plank', 'floating_barrel', 'desalinator']:
    J(f'{A}/items/{b}.json', {'model': {'type': 'minecraft:model', 'model': M + 'block/' + b}})
J(f'{A}/items/drying_rack.json', {'model': {'type': 'minecraft:model', 'model': M + 'block/drying_rack_0'}})
for it in ['scrap', 'rope', 'shark_tooth', 'gull_feather', 'dried_fish', 'harpoon', 'signal_flare']:
    J(f'{A}/models/item/{it}.json', {'parent': 'minecraft:item/' + ('handheld' if it == 'harpoon' else 'generated'), 'textures': {'layer0': M + 'item/' + it}})
    J(f'{A}/items/{it}.json', {'model': {'type': 'minecraft:model', 'model': M + 'item/' + it}})

# ---- рецепты
def rid(i, c=1): return {'id': M + i, 'count': c}
def shaped(n, pat, key, res, c=1): J(f'{D}/recipe/{n}.json', {'type': 'minecraft:crafting_shaped', 'category': 'misc', 'pattern': pat, 'key': key, 'result': rid(res, c)})
def shapeless(n, ing, res, c=1): J(f'{D}/recipe/{n}.json', {'type': 'minecraft:crafting_shapeless', 'category': 'misc', 'ingredients': ing, 'result': rid(res, c)})
shapeless('raft_plank_from_scrap', [M + 'scrap', M + 'scrap'], 'raft_plank')
shapeless('raft_plank_from_planks', ['#minecraft:planks'], 'raft_plank')
shapeless('rope', ['minecraft:string'] * 3, 'rope')
shaped('harpoon', ['  B', ' / ', '/  '], {'B': 'minecraft:bone', '/': 'minecraft:stick'}, 'harpoon')
shaped('desalinator', ['PRP', 'PBP', 'PPP'], {'P': M + 'raft_plank', 'R': M + 'rope', 'B': 'minecraft:bowl'}, 'desalinator')
shaped('drying_rack', ['RRR', '/ /', '/ /'], {'R': M + 'rope', '/': 'minecraft:stick'}, 'drying_rack')
shapeless('signal_flare', [M + 'shark_tooth'] * 3 + [M + 'rope', 'minecraft:bone'], 'signal_flare')
shapeless('sticks_from_raft_plank', [M + 'raft_plank'], 'scrap', 1)

# ---- таблицы добычи
def loot(path, item, mn, mx, chance=1.0):
    pool = {'rolls': 1, 'entries': [{'type': 'minecraft:item', 'name': M + item, 'functions': [{'function': 'minecraft:set_count', 'count': {'min': mn, 'max': mx}}]}]}
    if chance < 1: pool['conditions'] = [{'condition': 'minecraft:random_chance', 'chance': chance}]
    J(path, {'type': 'minecraft:entity', 'pools': [pool]})
loot(f'{D}/loot_table/entities/shark.json', 'shark_tooth', 1, 2)
loot(f'{D}/loot_table/entities/gull.json', 'gull_feather', 0, 2)

# ---- океанское измерение (лобби + миры)
J(f'{D}/dimension/ocean.json', {'type': 'minecraft:overworld', 'generator': {'type': 'minecraft:flat', 'settings': {
    'biome': 'minecraft:deep_ocean', 'features': False, 'lakes': False,
    'layers': [{'block': 'minecraft:bedrock', 'height': 1}, {'block': 'minecraft:sand', 'height': 4}, {'block': 'minecraft:water', 'height': 60}],
    'structure_overrides': []}}})

# ---- язык
ru = {'item.raftsurvival.raft_plank': 'Плотовая доска', 'block.raftsurvival.raft_plank': 'Плотовая доска', 'block.raftsurvival.floating_barrel': 'Плавучая бочка',
      'block.raftsurvival.desalinator': 'Опреснитель', 'block.raftsurvival.drying_rack': 'Сушилка для рыбы', 'item.raftsurvival.scrap': 'Обломки',
      'item.raftsurvival.rope': 'Верёвка', 'item.raftsurvival.shark_tooth': 'Акулий зуб', 'item.raftsurvival.gull_feather': 'Перо чайки',
      'item.raftsurvival.dried_fish': 'Вяленая рыба', 'item.raftsurvival.harpoon': 'Гарпун', 'item.raftsurvival.signal_flare': 'Сигнальная ракета',
      'entity.raftsurvival.shark': 'Акула', 'entity.raftsurvival.gull': 'Чайка', 'itemGroup.raftsurvival': 'Выживание на плоту'}
en = {'item.raftsurvival.raft_plank': 'Raft Plank', 'block.raftsurvival.raft_plank': 'Raft Plank', 'block.raftsurvival.floating_barrel': 'Floating Barrel',
      'block.raftsurvival.desalinator': 'Desalinator', 'block.raftsurvival.drying_rack': 'Drying Rack', 'item.raftsurvival.scrap': 'Scrap',
      'item.raftsurvival.rope': 'Rope', 'item.raftsurvival.shark_tooth': 'Shark Tooth', 'item.raftsurvival.gull_feather': 'Gull Feather',
      'item.raftsurvival.dried_fish': 'Dried Fish', 'item.raftsurvival.harpoon': 'Harpoon', 'item.raftsurvival.signal_flare': 'Signal Flare',
      'entity.raftsurvival.shark': 'Shark', 'entity.raftsurvival.gull': 'Seagull', 'itemGroup.raftsurvival': 'Raft Survival'}
J(f'{A}/lang/ru_ru.json', ru); J(f'{A}/lang/en_us.json', en)
print('assets ok')
