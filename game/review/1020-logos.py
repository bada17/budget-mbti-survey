"""검토용 워드마크: 설치된 OFL 글꼴을 윤곽선으로 바꾼다. 본편은 선택 후 적용."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / '_appearance-fonttools'))
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
PRET = TTFont(ROOT / 'node_modules/pretendard/dist/public/static/Pretendard-ExtraBold.otf')
JUA = [TTFont(p) for p in (ROOT / 'node_modules/@fontsource/jua/files').glob('*-400-normal.woff2')]

def letters(text, x, baseline, size, fonts, fill, tracking=0):
    paths = []
    for char in text:
        font = next((f for f in fonts if ord(char) in f.getBestCmap()), None)
        if font is None:
            raise ValueError(f'글꼴에 없음: {char}')
        name = font.getBestCmap()[ord(char)]
        glyphs = font.getGlyphSet()
        factor = size / font['head'].unitsPerEm
        pen = SVGPathPen(glyphs, ntos=lambda v: str(round(v, 2)))
        glyphs[name].draw(TransformPen(pen, (factor, 0, 0, -factor, x, baseline)))
        if pen.getCommands():
            paths.append(f'<path d="{pen.getCommands()}"/>')
        x += font['hmtx'][name][0] * factor + tracking
    return f'<g fill="{fill}" stroke="#fff" stroke-width="1.1" stroke-linejoin="round" paint-order="stroke">{"".join(paths)}</g>'

def leaf(x, y, color, turn=0):
    return f'<path transform="translate({x} {y}) rotate({turn})" d="M0 0C-18-1-27-13-25-27C-9-27 1-17 0 0Z" fill="{color}" stroke="#fff" stroke-width="1.1"/>'

def svg(content):
    return '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="112" viewBox="0 0 360 112" role="img" aria-label="함께해요 시민의 숲">'+content+'</svg>'

tree = '<path d="M40 91V47M40 68L25 54M40 60L56 42" fill="none" stroke="#00afec" stroke-width="6" stroke-linecap="round"/>'
a = tree + leaf(37,58,'#00afec',-12) + leaf(45,48,'#00afec',105)
a += letters('함께해요',83,35,21,[PRET],'#0d1c26',.1)
a += letters('시민의 숲',79,88,53,[PRET],'#0d1c26',-1.2)
b = letters('함께해요',34,34,22,JUA,'#ad503d',1.2)
b += letters('시민의 숲',31,91,61,JUA,'#ad503d',-.8)
b += leaf(301,48,'#ad503d',12) + '<path d="M301 50V67" stroke="#ad503d" stroke-width="4" stroke-linecap="round"/>'
c = letters('함께해요',21,59,21,[PRET],'#0d1c26',.5)
c += letters('시민의 숲',117,75,46,JUA,'#0d1c26',-1)
c += leaf(298,24,'#00afec',110)
for key, content in [('a',a),('b',b),('c',c)]:
    target = OUT / f'1020-logo-{key}.svg'
    target.write_text(svg(content), encoding='utf-8')
    (OUT / f'1020-logo-{key}-dark.svg').write_text(svg(content.replace('fill="#0d1c26"', 'fill="#fff"').replace('fill="#ad503d"', 'fill="#fff"').replace('stroke="#ad503d"', 'stroke="#fff"')), encoding='utf-8')
    print(target.name, target.stat().st_size)
