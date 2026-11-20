import os, random
import sys
ROOT=sys.argv[1] if len(sys.argv)>1 else "out"
os.makedirs(ROOT,exist_ok=True)
W,H=1280,720
FH=450  # field container height
def pt(f,d): return 160*(1-d)+(960+320*d)*f, 50+400*d
OFF=[("WR",.48,.10,11),("WR",.45,.22,1),("OL",.48,.38,52),("OL",.48,.44,64),("OL",.48,.50,70),("OL",.48,.56,75),("OL",.48,.62,77),("TE",.48,.69,88),("QB",.43,.50,7),("RB",.36,.50,22),("WR",.48,.90,84)]
DEF=[("DL",.53,.41,90),("DL",.53,.47,94),("DL",.53,.53,97),("DL",.53,.59,99),("LB",.60,.35,50),("LB",.60,.50,55),("LB",.60,.65,58),("CB",.54,.10,21),("CB",.54,.90,24),("S",.72,.30,30),("S",.72,.70,33)]
PEL=dict(jersey="#0E7C86",helmet="#F28C28",pants="#F4F1E8",num="#FFFFFF")
COM=dict(jersey="#5B2A86",helmet="#F2C14E",pants="#2B1640",num="#FFFFFF")
yards=["40","50","40","30","20","10"]

def field_svg(t):
    s=[f'<svg width="1280" height="450" viewBox="0 0 1280 450" style="position:absolute; left:0; top:0" aria-hidden="true">']
    s.append(t["stands"])
    # grass stripes
    for i in range(10):
        f0,f1=i/10,(i+1)/10
        c=t["grass"][i%2]
        x0t,_=pt(f0,0);x1t,_=pt(f1,0);x1b,_=pt(f1,1);x0b,_=pt(f0,1)
        s.append(f'<polygon points="{x0t:.0f},50 {x1t:.0f},50 {x1b:.0f},450 {x0b:.0f},450" fill="{c}"/>')
    for i in range(11):
        f=i/10; xt,_=pt(f,0); xb,_=pt(f,1)
        s.append(f'<line x1="{xt:.0f}" y1="50" x2="{xb:.0f}" y2="450" stroke="{t["line"]}" stroke-width="{t["lw"]}" opacity="0.85"/>')
    s.append(f'<line x1="160" y1="50" x2="0" y2="450" stroke="{t["line"]}" stroke-width="{t["lw"]+2}"/>')
    s.append(f'<line x1="1120" y1="50" x2="1280" y2="450" stroke="{t["line"]}" stroke-width="{t["lw"]+2}"/>')
    s.append(f'<line x1="160" y1="50" x2="1120" y2="50" stroke="{t["line"]}" stroke-width="{t["lw"]+1}"/>')
    # LOS and first down
    for f,c in ((0.5,"#3B82F6"),(0.62,"#FACC15")):
        xt,_=pt(f,0);xb,_=pt(f,1)
        s.append(f'<line x1="{xt:.0f}" y1="50" x2="{xb:.0f}" y2="450" stroke="{c}" stroke-width="{t["lw"]+2}"/>')
    for k in range(51):
        f=k/50
        for dd in (0.36,0.64):
            x1,y1=pt(f,dd-0.012); x2,y2=pt(f,dd+0.012)
            s.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{t["line"]}" stroke-width="1.5" opacity="0.7"/>')
        for dd in (0.02,0.98):
            x1,y1=pt(f,dd-0.012); x2,y2=pt(f,dd+0.012)
            s.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{t["line"]}" stroke-width="1.5" opacity="0.7"/>')
    for i,y in enumerate(yards):
        f=i*0.2; x,_=pt(f,.07)
        s.append(f'<text x="{x:.0f}" y="88" text-anchor="middle" font-family="{t["numfont"]}" font-size="{int(t["ynum"]*0.6)}" fill="#FFFFFF" opacity="0.7" font-weight="700" transform="rotate(180 {x:.0f} 82)">{y}</text>')
    s.append('<defs><linearGradient id="depth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000000" stop-opacity="0.22"/><stop offset="0.5" stop-color="#000000" stop-opacity="0"/></linearGradient></defs>')
    s.append('<polygon points="160,50 1120,50 1280,450 0,450" fill="url(#depth)"/>')
    s.append(t.get("wall",""))
    for i,y in enumerate(yards):
        f=i*0.2; x,_=pt(f,.93)
        s.append(f'<text x="{x:.0f}" y="438" text-anchor="middle" font-family="{t["numfont"]}" font-size="{t["ynum"]}" fill="#FFFFFF" opacity="0.8" font-weight="700">{y}</text>')
    s.append('</svg>')
    return "\n".join(s)


def player(t,team,f,d,num,z,pos,face):
    x,y=pt(f,d); sc=t["base"]+0.5*d
    o=t["o"]; sh=t["shade"]
    line=pos in ("OL","DL")
    legh=t["legh"]-(5 if line else 0); lgap=t["leggap"]+(6 if line else 0)
    lean=(-7 if face>0 else 7) if line else 0
    mside="right" if face>0 else "left"
    return f'''<div style="position: absolute; left: {x:.0f}px; top: {y:.0f}px; transform: translate(-50%, -100%) scale({sc:.2f}); transform-origin: 50% 100%; z-index: {z}; display: flex; flex-direction: column; align-items: center">
<div style="position: relative; width: {t['hw']}px; height: {t['hh']}px; box-sizing: border-box; border-radius: {t['hr']}; background: {team['helmet']}; {o} {sh} transform: skewX({lean}deg)">
<div style="position: absolute; left: 50%; top: 0; width: 5px; height: 60%; margin-left: -2px; background: #FFFFFF; opacity: 0.9"></div>
<div style="position: absolute; {mside}: -5px; top: 45%; width: 9px; height: 9px; box-sizing: border-box; border: 2px solid {t['mask']}; border-{mside}: 3px solid {t['mask']}; border-radius: {t['mr']}"></div>
</div>
<div style="display: flex; align-items: flex-start; margin-top: {t['bodytop']}px; transform: skewX({lean}deg)">
<div style="width: {t['aw']}px; height: {t['ah']}px; margin-top: 3px; margin-right: -3px; box-sizing: border-box; border-radius: {t['ar']}; background: {team['jersey']}; {o}"></div>
<div style="position: relative; z-index: 1; width: {t['bw']}px; height: {t['bh']}px; box-sizing: border-box; border-radius: {t['br']}; background: {team['jersey']}; {o} {sh} display: flex; align-items: center; justify-content: center; font-family: {t['nf']}; font-size: {t['ns']}px; line-height: 1; color: {team['num']}">{num}</div>
<div style="width: {t['aw']}px; height: {t['ah']}px; margin-top: 3px; margin-left: -3px; box-sizing: border-box; border-radius: {t['ar']}; background: {team['jersey']}; {o}"></div>
</div>
<div style="display: flex; gap: {lgap}px; margin-top: {t['legtop']}px"><div style="width: {t['lw2']}px; height: {legh}px; box-sizing: border-box; border-radius: {t['lr']}; background: {team['pants']}; {o}"></div><div style="width: {t['lw2']}px; height: {legh}px; box-sizing: border-box; border-radius: {t['lr']}; background: {team['pants']}; {o}"></div></div>
<div style="display: flex; gap: {lgap+2}px; margin-top: -1px"><div style="width: {t['lw2']+4}px; height: 5px; border-radius: {t['lr']}; background: {t['shoe']}"></div><div style="width: {t['lw2']+4}px; height: 5px; border-radius: {t['lr']}; background: {t['shoe']}"></div></div>
<div style="{t['shadow']}"></div>
</div>'''

def players(t):
    allp=[(d,PEL,f,num,p,1) for p,f,d,num in OFF]+[(d,COM,f,num,p,-1) for p,f,d,num in DEF]
    allp.sort(key=lambda a:a[0])
    out=[player(t,team,f,d,num,10+int(d*100),p,face) for d,team,f,num,p,face in allp]
    bx,by=pt(.495,.5)
    out.append(f'<div style="position: absolute; left: {bx:.0f}px; top: {by-8:.0f}px; width: 18px; height: 11px; border-radius: 50%; background: #8B4A1C; border: 2px solid #3A1D0A; z-index: 60; display: flex; align-items: center; justify-content: center"><div style="width: 8px; height: 2px; background: #FFFFFF"></div></div>')
    return "\n".join(out)

PLAYS=["Run Inside","Run Outside","Short Pass","Deep Pass","Play Action"]

def page(t, title):
    btns="\n".join(f'<button type="button" style="{t["btn"]}">{p}</button>' for p in PLAYS)
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="{t['fonts']}">
<style>
body{{margin:0}}
a{{color:#ffffff}}a:hover{{color:#dddddd}}
</style>
</helmet>
<div style="width: 1280px; height: 720px; position: relative; overflow: hidden; background: {t['bg']}; font-family: {t['body_font']}">
{t['scoreboard']}
<div style="position: absolute; left: 0; top: 90px; width: 1280px; height: 450px; overflow: hidden">
{field_svg(t)}
{players(t)}
</div>
<div style="position: absolute; left: 0; top: 540px; width: 1280px; height: 180px; box-sizing: border-box; padding: 18px 28px; {t['panel']}; display: flex; flex-direction: column; gap: 14px">
<div style="display: flex; justify-content: space-between; align-items: center">
<div style="{t['label']}">Coach Pelicans · Offense · Call the play</div>
<div style="{t['chip']}">Skill points: 6</div>
</div>
<div style="display: flex; gap: 14px">
{btns}
</div>
<div style="display: flex; justify-content: flex-end">
<button type="button" style="{t['exit']}">Exit / Start Over</button>
</div>
</div>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":1280,"height":720}}}}'>
class Component extends DCLogic {{
renderVals() {{
return {{}};
}}
}}
</script>
</body>
</html>'''

def crowd(colors,bg,seed,square=False):
    random.seed(seed); s=[f'<rect x="0" y="0" width="1280" height="50" fill="{bg}"/>']
    for r in range(3):
        for i in range(70):
            x=i*18.5+(r%2)*9+random.uniform(-2,2); y=10+r*13
            c=random.choice(colors)
            if square: s.append(f'<rect x="{x:.0f}" y="{y}" width="9" height="9" fill="{c}"/>')
            else: s.append(f'<circle cx="{x:.0f}" cy="{y}" r="5" fill="{c}"/>')
    return "".join(s)

def scoreboard(st):
    return f'''<div style="position: absolute; left: 0; top: 0; width: 1280px; height: 90px; box-sizing: border-box; padding: 0 28px; {st['bar']}; display: flex; align-items: center; justify-content: space-between">
<div style="display: flex; align-items: center; gap: 14px"><div style="{st['tag']}; background: #0E7C86">PELICANS</div><div style="{st['score']}">14</div></div>
<div style="display: flex; flex-direction: column; align-items: center; gap: 6px"><div style="{st['mid']}">2nd &amp; 6 · Ball on COM 35</div><div style="{st['sub']}">Quarter 2 · Play 7 of 12</div></div>
<div style="display: flex; align-items: center; gap: 14px"><div style="{st['score']}">10</div><div style="{st['tag']}; background: #5B2A86">COMETS</div></div>
</div>'''

# A cartoon
ink="#1B1B2F"
A=dict(
 fonts="https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito:wght@700;800&display=swap",
 body_font="'Nunito', sans-serif", bg="#7FD1F5",
 stands=crowd(["#F28C28","#0E7C86","#5B2A86","#F2C14E","#FFFFFF","#E5484D"],"#3B4A6B",1),
 grass=["#4CB944","#43A83C"], line="#FFFFFF", lw=4, numfont="Lilita One, sans-serif", ynum=34, base=0.85,
 helmet=f"width: 30px; height: 28px; border-radius: 50% 50% 40% 40%; border: 3px solid {ink}; box-sizing: border-box;",
 body=f"width: 36px; height: 34px; border-radius: 10px; border: 3px solid {ink}; box-sizing: border-box; margin-top: -3px; display: flex; align-items: center; justify-content: center; font-family: 'Lilita One', sans-serif; font-size: 17px; line-height: 1;",
 leg=f"width: 11px; height: 14px; border: 3px solid {ink}; border-top: none; box-sizing: border-box; border-radius: 0 0 4px 4px;",
 leggap=4, shadow="width: 40px; height: 8px; border-radius: 50%; background: rgba(0,0,0,0.25); margin-top: -2px;",
 panel=f"background: #FFF6DC; border-top: 5px solid {ink}",
 label=f"font-family: 'Lilita One', sans-serif; font-size: 24px; color: {ink}",
 chip=f"font-family: 'Lilita One', sans-serif; font-size: 20px; color: {ink}; background: #F2C14E; border: 3px solid {ink}; border-radius: 999px; padding: 6px 16px",
 btn=f"flex: 1; height: 60px; font-family: 'Lilita One', sans-serif; font-size: 22px; color: #FFFFFF; background: #0E7C86; border: 3px solid {ink}; border-radius: 14px; box-shadow: 0 5px 0 {ink}; cursor: pointer",
 exit=f"font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 15px; color: {ink}; background: #FFFFFF; border: 3px solid {ink}; border-radius: 10px; padding: 6px 14px; min-height: 44px; cursor: pointer",
)
A["scoreboard"]=scoreboard(dict(bar=f"background: #FFF6DC; border-bottom: 5px solid {ink}",
 tag=f"font-family: 'Lilita One', sans-serif; font-size: 24px; color: #FFFFFF; border: 3px solid {ink}; border-radius: 12px; padding: 6px 14px",
 score=f"font-family: 'Lilita One', sans-serif; font-size: 52px; color: {ink}",
 mid=f"font-family: 'Lilita One', sans-serif; font-size: 26px; color: {ink}",
 sub=f"font-size: 16px; color: #4A4A5E"))

# B retro arcade
px="'Press Start 2P', monospace"
B=dict(
 fonts="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap",
 body_font=px, bg="#101018",
 stands=crowd(["#F28C28","#0E7C86","#9B5DE5","#F2C14E","#E0E0E0"],"#22223A",2,square=True),
 grass=["#2E8B2E","#267A26"], line="#E8E8E8", lw=3, numfont="Press Start 2P, monospace", ynum=22, base=0.8,
 helmet="width: 24px; height: 20px; box-shadow: 0 0 0 3px #000000;",
 body=f"width: 30px; height: 28px; margin-top: 3px; box-shadow: 0 0 0 3px #000000; display: flex; align-items: center; justify-content: center; font-family: {px}; font-size: 10px; line-height: 1;",
 leg="width: 10px; height: 12px; margin-top: 3px; box-shadow: 0 0 0 3px #000000;",
 leggap=4, shadow="width: 34px; height: 6px; background: rgba(0,0,0,0.35); margin-top: 2px;",
 panel="background: #101018; border-top: 4px solid #F2C14E",
 label=f"font-family: {px}; font-size: 14px; color: #F2C14E",
 chip=f"font-family: {px}; font-size: 12px; color: #101018; background: #F2C14E; padding: 10px 14px",
 btn=f"flex: 1; height: 60px; font-family: {px}; font-size: 12px; color: #FFFFFF; background: #1F4FA8; border: 4px solid #FFFFFF; cursor: pointer",
 exit=f"font-family: {px}; font-size: 10px; color: #FFFFFF; background: #101018; border: 3px solid #9A9AB0; padding: 8px 12px; min-height: 44px; cursor: pointer",
)
B["scoreboard"]=scoreboard(dict(bar="background: #000000; border-bottom: 4px solid #F2C14E",
 tag=f"font-family: {px}; font-size: 14px; color: #FFFFFF; padding: 10px 12px",
 score=f"font-family: {px}; font-size: 36px; color: #FF9F1C",
 mid=f"font-family: {px}; font-size: 14px; color: #FFFFFF",
 sub=f"font-family: {px}; font-size: 10px; color: #B8B8CC"))

# C TV broadcast
bc="'Barlow Condensed', sans-serif"
C=dict(
 fonts="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@500;600&display=swap",
 body_font="'Inter', sans-serif", bg="#0B1526",
 stands='<rect x="0" y="0" width="1280" height="50" fill="#14233D"/>'+"".join(f'<rect x="{i*128+6}" y="30" width="116" height="16" rx="2" fill="{["#1E3A5F","#24476F"][i%2]}"/>' for i in range(10)),
 grass=["#3E8E41","#37803A"], line="#F4F4F4", lw=2.5, numfont="Barlow Condensed, sans-serif", ynum=36, base=0.7,
 helmet="width: 22px; height: 21px; border-radius: 50% 50% 42% 42%; box-shadow: inset -3px -3px 0 rgba(0,0,0,0.25);",
 body="width: 28px; height: 28px; border-radius: 7px 7px 4px 4px; margin-top: -1px; box-shadow: inset -4px -4px 0 rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 15px; line-height: 1;",
 leg="width: 9px; height: 13px; border-radius: 0 0 3px 3px;",
 leggap=3, shadow="width: 32px; height: 7px; border-radius: 50%; background: rgba(0,0,0,0.3); filter: blur(1px);",
 panel="background: #0B1526; border-top: 1px solid #2A3B57",
 label=f"font-family: {bc}; font-weight: 700; font-size: 22px; letter-spacing: 1px; text-transform: uppercase; color: #E6ECF5",
 chip=f"font-family: {bc}; font-weight: 700; font-size: 18px; color: #0B1526; background: #FACC15; border-radius: 6px; padding: 6px 14px",
 btn=f"flex: 1; height: 60px; font-family: {bc}; font-weight: 700; font-size: 22px; letter-spacing: 0.5px; text-transform: uppercase; color: #FFFFFF; background: #1D4ED8; border: none; border-radius: 8px; cursor: pointer",
 exit="font-family: 'Inter', sans-serif; font-weight: 600; font-size: 14px; color: #C8D3E3; background: transparent; border: 1px solid #4A5D7C; border-radius: 6px; padding: 8px 14px; min-height: 44px; cursor: pointer",
)
C["scoreboard"]=scoreboard(dict(bar="background: #0B1526; border-bottom: 3px solid #FACC15",
 tag=f"font-family: {bc}; font-weight: 800; font-size: 26px; letter-spacing: 1px; color: #FFFFFF; padding: 4px 14px; border-radius: 4px",
 score=f"font-family: {bc}; font-weight: 800; font-size: 50px; color: #FFFFFF",
 mid=f"font-family: {bc}; font-weight: 700; font-size: 26px; color: #FACC15",
 sub="font-size: 14px; color: #A9B6CA"))


ink="#1B1B2F"
A.update(o=f"border: 3px solid {ink};", shade="box-shadow: inset -4px -4px 0 rgba(0,0,0,0.18);", hw=32,hh=29,hr="50% 50% 42% 42%",mask="#C9CED6",mr="0 6px 6px 0",
 bodytop=-3,aw=12,ah=24,ar="6px",bw=38,bh=34,br="12px 12px 8px 8px",nf="'Lilita One', sans-serif",ns=19,legtop=-3,lw2=13,legh=16,lr="0 0 5px 5px",shoe="#1B1B2F",leggap=3,
 shadow="width: 46px; height: 9px; border-radius: 50%; background: rgba(0,0,0,0.28); margin-top: -3px;",
 wall='<rect x="0" y="40" width="1280" height="10" fill="#F2C14E"/>'+''.join(f'<rect x="{i*160+20}" y="42" width="120" height="6" rx="3" fill="#E5484D"/>' for i in range(8)))
B.update(o="box-shadow: 0 0 0 3px #000000;", shade="", hw=26,hh=22,hr="3px",mask="#000000",mr="0",
 bodytop=3,aw=10,ah=20,ar="0",bw=30,bh=28,br="2px",nf="'Press Start 2P', monospace",ns=10,legtop=3,lw2=11,legh=13,lr="0",shoe="#000000",leggap=4,
 shadow="width: 38px; height: 6px; background: rgba(0,0,0,0.4); margin-top: 3px;",
 wall='<rect x="0" y="42" width="1280" height="8" fill="#000000"/>'+''.join(f'<rect x="{i*64+4}" y="44" width="28" height="4" fill="#F2C14E"/>' for i in range(20)))
C.update(o="", shade="box-shadow: inset -4px -5px 0 rgba(0,0,0,0.22), inset 3px 3px 0 rgba(255,255,255,0.18);", hw=24,hh=22,hr="50% 50% 42% 42%",mask="#D9DEE5",mr="0 5px 5px 0",
 bodytop=-1,aw=9,ah=21,ar="5px",bw=30,bh=29,br="9px 9px 5px 5px",nf="'Barlow Condensed', sans-serif",ns=17,legtop=0,lw2=10,legh=14,lr="0 0 4px 4px",shoe="#111111",leggap=3,
 shadow="width: 38px; height: 8px; border-radius: 50%; background: rgba(0,0,0,0.35); filter: blur(1.5px); margin-top: -1px;",
 wall='<rect x="0" y="40" width="1280" height="10" fill="#0B1526"/>'+''.join(f'<rect x="{i*128+10}" y="42" width="108" height="6" rx="1" fill="{["#1D4ED8","#FACC15"][i%2]}"/>' for i in range(10)))

for name,t,title in (("Main.dc.html",A,"Look A: Chunky Cartoon"),("Retro.dc.html",B,"Look B: Retro Arcade"),("Broadcast.dc.html",C,"Look C: TV Broadcast")):
    open(os.path.join(ROOT,name),"w").write(page(t,title))
import json
canvas={"v":3,"createdOnFiles":{"v":1,"at":"2026-11-20T16:15:00Z"},"title":"Huddle Up: Field Screen Looks","launch":{"view":"canvas"},"pages":[],
 "boards":{"Main.dc.html":{"x":0,"y":0,"w":1280,"h":720,"title":"Look A: Chunky Cartoon"},
           "Retro.dc.html":{"x":1360,"y":0,"w":1280,"h":720,"title":"Look B: Retro Arcade"},
           "Broadcast.dc.html":{"x":2720,"y":0,"w":1280,"h":720,"title":"Look C: TV Broadcast"}},
 "order":["Main.dc.html","Retro.dc.html","Broadcast.dc.html"],
 "notes":{"t":{"x":0,"y":-300,"text":"Huddle Up: three looks for the field screen","kind":"title1","maxW":4000}},"designSystems":[]}
open(os.path.join(ROOT,"canvas.json"),"w").write(json.dumps(canvas))
print("ok")
