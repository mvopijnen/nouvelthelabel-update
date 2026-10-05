#!/usr/bin/env python3
"""Summarize three completed runs per profile; never substitute a missing run."""
import json
import statistics
import sys
from pathlib import Path

directory = Path(sys.argv[1] if len(sys.argv) > 1 else 'artifacts/performance-baseline')
metrics = {
    'FCP_ms': 'first-contentful-paint', 'LCP_ms': 'largest-contentful-paint',
    'TBT_ms': 'total-blocking-time', 'CLS': 'cumulative-layout-shift',
    'SpeedIndex_ms': 'speed-index',
}
summary = {'kind': 'lab baseline, public unmodified storefront', 'after': None, 'profiles': {}}
for profile in ('mobile', 'desktop'):
    runs = []
    configurations = []
    for number in (1, 2, 3):
        report = json.loads((directory / f'{profile}-{number}.json').read_text())
        if report.get('runtimeError'):
            raise RuntimeError(f'{profile}-{number}: failed Lighthouse run')
        configurations.append(report['configSettings'])
        audits = report['audits']
        runs.append({
            'run': number, 'fetchTime': report['fetchTime'], 'url': report['finalDisplayedUrl'],
            'score': report['categories']['performance']['score'] * 100,
            **{name: audits[audit]['numericValue'] for name, audit in metrics.items()},
            'lcpSubparts_ms': {row['subpart']: row['duration'] for row in audits['lcp-breakdown-insight']['details']['items'][0]['items']},
            'heroTransfers': [{key: row.get(key) for key in ('url', 'transferSize', 'statusCode', 'isLinkPreload')} for row in audits['network-requests']['details']['items'] if 'Atelier_sieraden_1_new.webp' in row['url']],
            'hiddenMobileImageTransfers': [{key: row.get(key) for key in ('url', 'transferSize', 'statusCode')} for row in audits['network-requests']['details']['items'] if 'Minimalist_Essentials_homepage_new_2_nieuw.webp' in row['url']],
            'warnings': report['runWarnings'],
        })
    assert all(value == configurations[0] for value in configurations), 'Profile settings changed between runs'
    assert len({run['url'] for run in runs}) == 1, 'Different measurement URLs'
    summary['profiles'][profile] = {
        'lighthouseVersion': report['lighthouseVersion'],
        'configuration': configurations[0], 'runs': runs,
        'median': {key: statistics.median(run[key] for run in runs) for key in ('score', *metrics)},
    }
output = directory / 'summary.json'
output.write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps({name: data['median'] for name, data in summary['profiles'].items()}, indent=2))
