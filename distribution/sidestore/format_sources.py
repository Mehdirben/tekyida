#!/usr/bin/env python3
"""
Tekyida SideStore / LiveContainer Source Feed Normalizer
Ensures that stable and beta feeds strictly adhere to their respective repository names,
identifiers, and release download URLs, while the app name remains simply "Tekyida".
"""

import json
import os
import sys

def format_feed(feed_file, feed_name, feed_id, app_name, release_tag, default_ver, desc, repo, run_number):
    existing = {}
    if os.path.exists(feed_file):
        try:
            with open(feed_file, 'r', encoding='utf-8') as f:
                existing = json.load(f)
        except Exception:
            existing = {}

    app_meta = (existing.get('apps') or [{}])[0]
    versions = app_meta.get('versions') or []
    download_url = f"https://github.com/{repo}/releases/download/{release_tag}/Tekyida.ipa" if release_tag else ""

    if versions and release_tag:
        versions[0]['downloadURL'] = download_url
        if default_ver == '1.0-beta':
            versions[0]['version'] = f"1.0-beta.{run_number}"
    elif not versions:
        versions = [{
            'version': default_ver,
            'buildVersion': str(run_number),
            'date': '2026-09-25T00:00:00Z',
            'minOSVersion': '17.0',
            'localizedDescription': desc,
            'downloadURL': download_url,
            'size': 0
        }]

    feed = {
        'name': feed_name,
        'identifier': feed_id,
        'apps': [{
            'bundleIdentifier': 'com.tekyida.app',
            'name': app_name,
            'developerName': 'Tekyida',
            'localizedDescription': desc,
            'iconURL': f"https://raw.githubusercontent.com/{repo}/main/distribution/fdroid/icon.png",
            'versions': versions
        }]
    }

    os.makedirs(os.path.dirname(feed_file), exist_ok=True)
    with open(feed_file, 'w', encoding='utf-8') as f:
        json.dump(feed, f, indent=2)

if __name__ == '__main__':
    if len(sys.argv) < 5:
        print("Usage: format_sources.py <repo> <run_number> <latest_stable_tag> <latest_beta_tag>")
        sys.exit(1)

    repo = sys.argv[1]
    run_number = sys.argv[2]
    stable_tag = sys.argv[3]
    beta_tag = sys.argv[4]

    # Format Stable: Repo is "Tekyida (Stable)", App is "Tekyida"
    format_feed(
        feed_file='site-pages/ios/apps.json',
        feed_name='Tekyida (Stable)',
        feed_id='com.tekyida.ios.source',
        app_name='Tekyida',
        release_tag=stable_tag,
        default_ver='1.0',
        desc='Modern IOU Tracker for iOS & Android',
        repo=repo,
        run_number=run_number
    )

    # Format Beta: Repo is "Tekyida (Beta)", App is "Tekyida"
    format_feed(
        feed_file='site-pages/ios/beta/apps.json',
        feed_name='Tekyida (Beta)',
        feed_id='com.tekyida.ios.source.beta',
        app_name='Tekyida',
        release_tag=beta_tag,
        default_ver='1.0-beta',
        desc='Tekyida Beta Preview Channel',
        repo=repo,
        run_number=run_number
    )

    print("SideStore sources formatted successfully.")
