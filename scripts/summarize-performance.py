#!/usr/bin/env python3
"""Validate six real runs and their metadata before computing any median."""
import json
import math
import re
import statistics
import sys
from pathlib import Path

PROFILES = json.loads(Path(__file__).with_name('performance-profiles.json').read_text())
METRICS = {'FCP_ms':'first-contentful-paint','LCP_ms':'largest-contentful-paint','TBT_ms':'total-blocking-time','CLS':'cumulative-layout-shift','SpeedIndex_ms':'speed-index'}

def require(condition, message):
    if not condition:
        raise ValueError(message)

def summarize(directory):
    directory = Path(directory)
    summary = {'kind':'lab measurement; no field data', 'profiles':{}}
    batches = set()
    for profile, expected in PROFILES.items():
        runs, configurations = [], []
        for number in (1,2,3):
            label = f'{profile}-{number}'
            report = json.loads((directory / f'{label}.json').read_text())
            metadata = json.loads((directory / f'{label}.meta.json').read_text())
            require(not report.get('runtimeError'), f'{label}: failed run')
            config = report['configSettings']
            screen = config['screenEmulation']
            require(config['formFactor'] == expected['formFactor'], f'{label}: wrong formFactor')
            for key in ('width','height','mobile','deviceScaleFactor'):
                require(screen[key] == expected[key] and type(screen[key]) is type(expected[key]), f'{label}: wrong viewport {key}')
            require(screen.get('disabled') is False, f'{label}: screen emulation disabled')
            for ua in (config['emulatedUserAgent'],report['environment']['networkUserAgent']):
                require(isinstance(ua,str) and bool(ua) and bool(re.search(r'Android|Mobile|iPhone|iPad',ua,re.I)) == expected['mobile'], f'{label}: wrong user-agent')
            require(metadata.get('schemaVersion') == 1 and metadata['profile'] == profile and metadata['run'] == number, f'{label}: invalid metadata identity')
            pairs = {'formFactor':expected['formFactor'],'viewportWidth':expected['width'],'viewportHeight':expected['height'],'mobile':expected['mobile'],'userAgent':report['environment']['networkUserAgent'],'emulatedUserAgent':config['emulatedUserAgent'],'lighthouseVersion':report['lighthouseVersion'],'fetchTime':report['fetchTime'],'finalURL':report['finalDisplayedUrl'],'throttling':config['throttling'],'throttlingMethod':config['throttlingMethod']}
            for key,value in pairs.items():
                require(metadata.get(key) == value, f'{label}: inconsistent {key} metadata')
            for key,audit in METRICS.items():
                value = report['audits'][audit]['numericValue']
                require(isinstance(value,(int,float)) and math.isfinite(value) and value >= 0, f'{label}: invalid {key}')
                require(metadata.get(key) == value, f'{label}: inconsistent {key}')
            require(metadata['score'] == report['categories']['performance']['score'] * 100, f'{label}: inconsistent score')
            require(bool(metadata.get('batchId')), f'{label}: missing batch identifier')
            batches.add(metadata['batchId'])
            configurations.append(config)
            runs.append(metadata)
        require(all(value == configurations[0] for value in configurations), f'{profile}: settings changed between runs')
        require(len({run['url'] for run in runs}) == 1, f'{profile}: requested URL changed between runs')
        require(len({run['finalURL'] for run in runs}) == 1, f'{profile}: final URL changed between runs')
        require(len({run['lighthouseVersion'] for run in runs}) == 1, f'{profile}: Lighthouse versions differ')
        summary['profiles'][profile] = {'valid':True,'configuration':configurations[0],'runs':runs,'median':{key:statistics.median(run[key] for run in runs) for key in ('score', *METRICS)}}
    require(len(batches) == 1, 'Runs do not belong to the same batch')
    summary['batchId'] = batches.pop()
    (directory / 'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    return summary

if __name__ == '__main__':
    result = summarize(sys.argv[1] if len(sys.argv)>1 else 'artifacts/performance-baseline')
    print(json.dumps({profile:value['median'] for profile,value in result['profiles'].items()},indent=2))
