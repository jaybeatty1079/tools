#!/usr/bin/env python3
"""The ruling and the scorecard, checked on the built page's own data (run build.py first): python3 tests/score_test.py

Three kinds of check. The rule on known cases whose answer anyone can look up. Invariants over all 65 cards, so a new compound cannot ship
with a gap. And the honesty rules: every row that makes a claim carries a link or says Not found, nothing in the page's words uses a dash,
and every upcoming item names a primary source and the day it was looked at."""
import json, os, re, sys
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(HERE, 'index.html'), encoding='utf-8').read()
D = json.loads(re.search(r'<script id="data" type="application/json">(.*?)</script>', html, re.S).group(1))
cards = {c['id']: c for c in D['cards']}
fails = []
def check(cond, msg):
    if not cond: fails.append(msg)

# 1. the rule on cases anyone can check
GOLD = {'semaglutide': 'pass', 'tirzepatide': 'pass', 'm-insulin': 'pass', 'm-teriparatide': 'pass',        # approved products, human trials
        'bpc-157': 'out', 'tb-500': 'out', 'nad': 'out', 'ghk-cu': 'out', 'sermorelin': 'out',               # lawful only by a tolerance, never an approval
        'ipamorelin': 'fail', 'cjc-1295': 'fail', 'retatrutide': 'fail', 'm-ll-37': 'fail', 'm-selank': 'fail'}  # nothing permits it
for i, v in GOLD.items(): check(cards[i]['score']['verdict'] == v, '%s should be %s, is %s' % (i, v, cards[i]['score']['verdict']))
check('human trials exist' in cards['retatrutide']['score']['line'] and 'no lawful path' in cards['retatrutide']['score']['line'], 'retatrutide: the evidence is there and the path is not, and the line should say both')

# 2. invariants over every card
for i, c in cards.items():
    s = c['score']; t1, t2 = s['tests']
    check(s['verdict'] in ('pass', 'fail', 'out') and s['word'] == {'pass': 'PASS', 'fail': 'FAIL', 'out': 'JURY STILL OUT'}[s['verdict']], i + ': verdict word')
    check((t1['state'] == 'pass' and t2['state'] == 'pass') == (s['verdict'] == 'pass'), i + ': PASS needs both tests to pass')
    check(('fail' in (t1['state'], t2['state'])) == (s['verdict'] == 'fail'), i + ': FAIL means a test failed')
    check(t1['state'] == {'brand': 'pass', 'closed': 'fail', 'none': 'fail'}.get(c['track'], 'open'), i + ': path state follows the track')
    check({'A': 'pass', 'B': 'pass', 'C': 'open', 'D': 'fail'}.get(c['grade']) == t2['state'] or c['menu'] == 'more', i + ': evidence state follows the grade for the named compounds')
    check(c['feature'] == {'yellow': 'loop', 'orange': 'tunnel', 'red': 'tunnel'}.get(c['standing']), i + ': feature follows the standing')
    check(all(isinstance(r['links'], list) for r in s['tests'] + s['info']), i + ': every row has a links list')
    check(len(t2['links']) == 3 and all(u.startswith('http') for _, u in t2['links']), i + ': the evidence test links the three main counts')
    for r in s['tests'] + s['info'] + s['next']:
        for _, u in r['links']: check(u.startswith('https://'), i + ': a link that is not https: ' + u)
    # a claim with no link must be one the page marks as missing, never silently bare
    if not t1['links']: check(c['track'] in ('none',) and 'dates' in c and not c['dates'], i + ': a path claim with no link should be a no-route compound with no register row')

# 3. the upcoming items and the watch list
up = {}
for c in cards.values():
    for n in c['score']['next']:
        check(n['verified'].startswith('2026-11-1'), 'upcoming item without a verified day: ' + n['what'][:40]); check(len(n['links']) >= 1, 'upcoming item without a source: ' + n['what'][:40]); up[n['what']] = 1
check(len(up) == 8, 'expected the eight curated upcoming items on cards, found %d' % len(up))
check(set(c for c in cards if cards[c]['score']['next']) >= {'bpc-157', 'ghk-cu', 'semaglutide', 'retatrutide', 'm-liraglutide', 'm-ll-37'}, 'upcoming items should reach the compounds they name')
check(len(D['score']['watch']) == 3 and all(w['url'].startswith('https://clinicaltrials.gov/') for w in D['score']['watch']), 'the watch list is three registered trials, each linked')

# 4. words: no dash in anything the page says
blob = json.dumps(D['score'], ensure_ascii=False) + json.dumps([c['score'] for c in cards.values()], ensure_ascii=False)
check('—' not in blob and '–' not in blob, 'a dash in the scorecard words')

counts = {v: sum(1 for c in cards.values() if c['score']['verdict'] == v) for v in ('pass', 'out', 'fail')}
check(counts == {'pass': 19, 'out': 12, 'fail': 34}, 'rulings over the 65 cards changed: %s' % counts)
if fails:
    print('\n'.join('FAIL ' + f for f in fails)); sys.exit(1)
print('score: all checks passed; rulings %s over %d cards, %d upcoming items, %d on the watch' % (counts, len(cards), len(up), len(D['score']['watch'])))
