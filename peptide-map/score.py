"""The ruling and the scorecard.

Each card gets one verdict, PASS, FAIL or JURY STILL OUT, from two tests, and every row of the scorecard carries the links
behind it or says "Not found". The rule is deliberately small and is printed on the page:

  test 1, a lawful path today:  PASS only for an approved product; OPEN for every tolerance (a draft policy, Category 1, a 503B
                                component, non-injectable only); FAIL where nothing permits it.
  test 2, human evidence:       PASS at grade A or B (the tool's own reading for the named compounds), OPEN at C, FAIL at D.
  ruling:                       both PASS -> PASS; either FAIL -> FAIL; anything between, which includes every tolerance -> JURY STILL OUT.

It is the tool's ruling from public records. It is not FDA's, and it says nothing about whether any peptide is safe or works.
"""
import re, urllib.parse

WORDS = {'pass': 'PASS', 'fail': 'FAIL', 'out': 'JURY STILL OUT'}
PATH_STATE = {'brand': 'pass', 'tolerated': 'open', 'listed': 'open', 'component': 'open', 'mixed': 'open', 'closed': 'fail', 'none': 'fail'}
PATH_SAY = {
    'brand': 'Yes, as the approved product, on a prescription. Compounded copies are a separate question.',
    'tolerated': 'Only by tolerance: a draft HHS policy lets 503A pharmacies, physicians and federal facilities compound it under conditions. Tolerance is never approval.',
    'listed': 'Only by tolerance: Category 1 on FDA\'s 503A list, which FDA does not intend to act against while it writes the rule. Never approval.',
    'component': 'Only in part: 503B Category 1 as a component of an approved drug. The 503A side rests on a legal reading, not an FDA listing.',
    'mixed': 'Only in part: non-injectable forms are Category 1; injectable has no lawful path.',
    'closed': 'No. No list category, tolerance or approved product permits it.',
    'none': 'No. There is no lawful route outside a clinical trial.',
}
PATH_SHORT = {'tolerated': 'lawful only by a draft tolerance', 'listed': 'lawful only by Category 1 tolerance', 'component': 'lawful only in part, as a 503B component', 'mixed': 'lawful only in part, for non-injectable forms'}
EV_STATE = {'solid': 'pass', 'thin': 'open', 'none': 'fail'}
GRADE_EV = {'A': 'solid', 'B': 'solid', 'C': 'thin', 'D': 'none'}   # the named compounds are read straight from their grade; the rest keep the standing's own reading, which also drops a grade C with no trial and under ten human papers to none
RULE = ('How the ruling is made, in two tests. A lawful path today that is an approval, meaning an approved product; every tolerance is only half a pass. '
        'And human evidence at trial level: grade A or B, or the tool\'s own reading for the compounds the regulators have named. '
        'Both pass: PASS. Either plainly fails, no lawful path or no human evidence: FAIL. Anything between, which includes every tolerance: JURY STILL OUT. '
        'This is the tool\'s ruling from public records, not FDA\'s, and not a statement that any peptide is safe or works.')


def link(label, url): return [label, url]


def path_links(c, urls):
    """the sources for the lawful-path claim: the card's own dated register rows where it has them, else where the claim can be checked"""
    if c['dates']: return [link(d['date'] + ': ' + d['what'], d['url']) for d in c['dates'][-3:]]
    if c['track'] == 'brand':
        m = re.search(r'An approved drug \(([^)]+)\)', c['a']); nm = urllib.parse.quote(m.group(1) if m else c['name'].split(' (')[0])
        return [link('Approved labels, DailyMed', 'https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=' + nm)]
    if c['track'] in ('closed', 'listed', 'component'):
        return [link('FDA 503A categories (page of 2026-05-14)', urls['a']), link('FDA 503B list (page of 2025-03-21)', urls['b'])]
    return []   # nothing in the register names it: the row says Not found


def counts_text(c):
    ix = {l: n for l, n, u in c['ix']}
    def n(label):
        v = ix.get(label)
        return 'not counted' if v is None else '{:,}'.format(v)
    return 'PubMed human studies %s, clinical trials %s, ClinicalTrials.gov registered trials %s.' % (n('PubMed, human studies'), n('PubMed, clinical trials'), n('ClinicalTrials.gov, registered trials'))


def evidence_test(c, ev, grade_text):
    top = [link(l, u) for l, n, u in c['ix'][:3]]
    g = c['grade']; txt = grade_text[g]
    return {'id': 'evidence', 'q': 'Is there human evidence?', 'state': EV_STATE[ev],
            'say': 'Grade %s, %s. %s' % (g, txt[0].lower() + txt[1:], counts_text(c)),
            'links': top, 'more': 'The other counts and the papers are in the record below.'}


def path_test(c, urls):
    return {'id': 'path', 'q': 'Can it lawfully reach a patient today?', 'state': PATH_STATE[c['track']], 'say': PATH_SAY[c['track']], 'links': path_links(c, urls)}


def watch_row(c, urls, over, radar):
    t = c['track']
    if t == 'brand': say = 'Yes: FDA regulates it as an approved drug.'
    elif t == 'tolerated': say = 'Yes: HHS says it will not act against 503A use while the draft stands. A draft policy; comments close 2026-11-13.'
    elif t == 'listed': say = 'Yes: it is on FDA\'s 503A Category 1 list.'
    elif t == 'component': say = 'Yes: it is on FDA\'s 503B Category 1 list, as a component of an approved drug.'
    elif t == 'mixed': say = 'Yes, for non-injectable forms only: Category 1.'
    elif radar: say = 'On FDA\'s radar: it is named in FDA\'s lists, votes or letters, and no path has opened.'
    else: say = 'Nobody looking: no FDA list, vote or letter in the register names it.'
    return {'id': 'watch', 'q': 'Is a regulator looking?', 'state': 'info', 'say': say, 'links': path_links(c, urls)}


def enforce_row(c):
    said = c['enforce']; unchecked = said.startswith('Letters naming this compound were not checked')
    ls = [link(d['date'] + ': ' + d['what'], d['url']) for d in c['dates'] if 'letter' in d['what'].lower()]
    return {'id': 'enforce', 'q': 'Has FDA acted against sellers?', 'state': 'info', 'say': 'Not checked for this entry.' if unchecked else said, 'links': ls, 'unchecked': unchecked}


def next_rows(c, up):
    out = []
    for it in up['items']:
        if c['id'] in it['compounds']:
            out.append({'when': it['date'] or it['when'], 'dated': bool(it['date']), 'what': it['what'], 'links': it['links'], 'verified': it['verified']})
    out.sort(key=lambda r: (not r['dated'], r['when']))
    return out


def verdict_line(c, t1, t2, v):
    n = c['name'].split(' (')[0]
    if v == 'pass': return '%s: an approved product, with human trials behind it.' % n
    if v == 'fail':
        if t2['state'] == 'pass': return '%s: human trials exist (grade %s), but there is no lawful path today.' % (n, c['grade'])
        if t2['state'] == 'open': return '%s: no lawful path today, and only early human studies.' % n
        return '%s: no lawful path today, and no human evidence found.' % n
    ev = {'pass': 'human trials exist', 'open': 'only early human studies', 'fail': 'no human evidence found'}[t2['state']]
    return '%s: %s, never approval; %s. The jury is still out.' % (n, PATH_SHORT.get(c['track'], 'lawful only in part'), ev)


def add_scores(cards, ev_of, oversight_of, urls, up, grade_text):
    for c in cards:
        ev = ev_of(c) if c['menu'] == 'more' else GRADE_EV[c['grade']]; over, radar = oversight_of(c)
        t1, t2 = path_test(c, urls), evidence_test(c, ev, grade_text)
        v = 'fail' if 'fail' in (t1['state'], t2['state']) else 'pass' if t1['state'] == t2['state'] == 'pass' else 'out'
        c['score'] = {'verdict': v, 'word': WORDS[v], 'line': verdict_line(c, t1, t2, v), 'tests': [t1, t2], 'info': [watch_row(c, urls, over, radar), enforce_row(c)], 'next': next_rows(c, up)}
    return {'rule': RULE, 'watchedOn': up['watchedOn'], 'watch': up['watch'], 'watchNote': up['watchNote']}
