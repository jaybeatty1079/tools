import json,shutil
s=open('build/app.js').read()
out=json.load(open('data_target_prices_py1.json')); parts=json.load(open('data_participants.json'))
# PY2: attach CMS's PY2 preliminary price (t2) to each PY1 row; DRGs new in PY2 (523-525) get target 0 for PY1 and a t2
py2={(r['drg'],r['region']):r for r in json.load(open('data_target_prices_py2.json'))}
for r in out: r['t2']=py2[(r['drg'],r['region'])]['target'] if (r['drg'],r['region']) in py2 else None
have={(r['drg'],r['region']) for r in out}
for k,r in py2.items():
    if k not in have: out.append({'cat':r['cat'],'drg':r['drg'],'region':r['region'],'benchmark':0,'trend':0,'discount':r['discount'],'target':0,'t2':r['target']})
assert sum(1 for r in out if r['t2'] is not None)==len(py2)==288, 'PY2 rows did not all attach'
import os; os.makedirs('/Users/jaybeatty/Claude/jaybeatty-site/team-calculator/data',exist_ok=True)
for f in ('data_target_prices_py1.json','data_target_prices_py2.json','data_target_prices_py2_all.json'): shutil.copy(f,'/Users/jaybeatty/Claude/jaybeatty-site/team-calculator/data/'+f)
json.dump(out,open('/Users/jaybeatty/Claude/jaybeatty-site/team-calculator/data/data_target_prices.json','w'),separators=(',',':'))  # merged table the page and tests use
slim=[{'type':p['type'],'ccn':p['ccn'],'name':p['name'],'cbsa_name':p['cbsa_name'],'state':p['state'],'new':str(p['new']).strip().upper()=='Y'} for p in parts]
t=open('build/template.html').read().replace('__TP__',json.dumps(out,separators=(',',':'))).replace('__PARTS__',json.dumps(slim,separators=(',',':'))).replace('__CASES__',open('data_cases.json').read()).replace('__HM__',open('data_hospital_slim.json').read()).replace('__ENGINE__',open('build/engine.js').read()).replace('__APP__',s)
open('team-calculator.html','w').write(t)
import shutil; shutil.copy('team-calculator.html','/Users/jaybeatty/Claude/site-redesign/team-calculator.html'); shutil.copy('team-calculator.html','/Users/jaybeatty/Claude/jaybeatty-site/team-calculator/index.html')
for f in ('app.js','engine.js','template.html','assemble.py'): shutil.copy('build/'+f,'/Users/jaybeatty/Claude/jaybeatty-site/team-calculator/build/'+f)
import os; os.makedirs('/Users/jaybeatty/Claude/jaybeatty-site/team-calculator/tests',exist_ok=True)
for f in os.listdir('tests') if os.path.isdir('tests') else []: shutil.copy('tests/'+f,'/Users/jaybeatty/Claude/jaybeatty-site/team-calculator/tests/'+f)
print('built',len(t)//1024,'KB')

# artifact variant: no document wrappers, no print button
import re
art=t
art=re.sub(r'^<!doctype html>\s*<html lang="en">\s*<head>\s*','',art)
art=art.replace('<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n','')
art=art.replace('</head>\n<body>\n','').replace('</body>\n</html>\n','').replace('</body>\n</html>','')
art=art.replace('<button class="btn small" type="button" onclick="window.print()">Print this scenario</button>','')
open('build/artifact.html','w').write(art); print('artifact variant',len(art)//1024,'KB', art[:60].replace('\n',' '))
