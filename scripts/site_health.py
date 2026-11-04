#!/usr/bin/env python3
"""Daily check that celebud.com looks right to Google and to readers.

Fetches the key pages the way Googlebot and a normal browser do and fails
(non-zero exit) with a plain-English list of problems if anything is off:
wrong content type (the "text/plain" bug), missing/duplicate titles, pages
with no real text, a broken sitemap, ads.txt or robots.txt.
"""
import re
import sys
import urllib.request
from html.parser import HTMLParser

SITE = "https://celebud.com"
GOOGLEBOT = ("Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 "
             "(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 "
             "(compatible; Googlebot/2.1; +http://www.google.com/bot.html)")
ADSBOT = "Mediapartners-Google"
BROWSER = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
           "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
HOME_TITLE = "CelebUD - Latest Celebrity News, Entertainment & Exclusive Interviews"

problems: list[str] = []
passed: list[str] = []


class Text(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip = 0
        self.words = 0
        self.title = ""
        self.in_title = False
        self.h1 = ""
        self.in_h1 = False

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript"):
            self.skip += 1
        if tag == "title":
            self.in_title = True
        if tag == "h1":
            self.in_h1 = True

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript") and self.skip:
            self.skip -= 1
        if tag == "title":
            self.in_title = False
        if tag == "h1":
            self.in_h1 = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data
        if self.in_h1:
            self.h1 += data
        if not self.skip:
            self.words += len(data.split())


def get(path, ua):
    req = urllib.request.Request(SITE + path, headers={"User-Agent": ua, "Accept": "text/html,*/*"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status, r.headers.get("content-type", ""), r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("content-type", ""), e.read().decode("utf-8", "replace")
    except Exception as e:  # network error
        return 0, "", str(e)


def check_page(path, min_words, ua=GOOGLEBOT, who="Google"):
    status, ctype, body = get(path, ua)
    label = f"{path} (as {who})"
    if status != 200:
        problems.append(f"{label}: answered HTTP {status} instead of 200.")
        return
    if not ctype.lower().startswith("text/html"):
        problems.append(f"{label}: sent as '{ctype}' — Google needs text/html, or it treats the page as a plain text file.")
        return
    p = Text()
    p.feed(body)
    title = p.title.strip()
    if not title:
        problems.append(f"{label}: has no <title>.")
    elif path != "/" and title == HOME_TITLE:
        problems.append(f"{label}: shows the homepage title instead of its own — Google sees a duplicate of the homepage.")
    if p.words < min_words:
        problems.append(f"{label}: only {p.words} words of readable text (expected at least {min_words}) — looks empty to Google.")
    else:
        passed.append(f"{label}: OK — “{title[:70]}”, {p.words} words")


def main():
    # Sitemap: valid and lists real pages; also gives us live article URLs.
    status, ctype, xml = get("/sitemap.xml", GOOGLEBOT)
    locs = re.findall(r"<loc>\s*([^<]+?)\s*</loc>", xml)
    if status != 200 or ("<urlset" not in xml and "<sitemapindex" not in xml):
        problems.append(f"/sitemap.xml: broken (HTTP {status}, type '{ctype}').")
    elif len(locs) < 20:
        problems.append(f"/sitemap.xml: lists only {len(locs)} pages.")
    else:
        passed.append(f"/sitemap.xml: OK — {len(locs)} pages")

    articles = [u.replace(SITE, "").replace("https://www.celebud.com", "") for u in locs if "/article/" in u][:3]

    for path, words in [("/", 300), ("/about", 150), ("/contact", 60), ("/privacy", 300),
                        ("/editorial-standards", 150), ("/election-2027", 150)]:
        check_page(path, words)
    for path in articles:
        check_page(path, 250)
    if not articles:
        problems.append("No article URLs found in the sitemap to check.")
    # The AdSense crawler identifies itself differently from Googlebot.
    check_page(articles[0] if articles else "/", 250, ADSBOT, "AdSense crawler")
    # Readers get the same finished page (with the app on top).
    for path in ["/"] + articles[:1] + ["/about"]:
        status, ctype, body = get(path, BROWSER)
        if status != 200 or "id=\"root\"" not in body:
            problems.append(f"{path} (as a reader): the app did not load (HTTP {status}).")
        elif "id=\"ssr\"" not in body:
            problems.append(f"{path} (as a reader): arrived as an empty app shell instead of the finished page.")
        else:
            check_page(path, 60 if path == "/about" else 250, BROWSER, "a reader")

    status, _, ads = get("/ads.txt", GOOGLEBOT)
    if status != 200 or not re.search(r"google\.com,\s*pub-\d+,\s*DIRECT", ads):
        problems.append("/ads.txt: missing or does not list the AdSense publisher ID.")
    else:
        passed.append("/ads.txt: OK")

    status, _, robots = get("/robots.txt", GOOGLEBOT)
    if status != 200 or re.search(r"(?im)^\s*disallow:\s*/\s*$", robots):
        problems.append("/robots.txt: missing, or blocks the whole site.")
    else:
        passed.append("/robots.txt: OK")

    print("PASSED:\n  " + "\n  ".join(passed))
    if problems:
        print("\nPROBLEMS:\n  - " + "\n  - ".join(problems))
        with open("health-report.md", "w") as f:
            f.write("The daily check found problems with how celebud.com looks to Google:\n\n")
            f.write("\n".join(f"- {p}" for p in problems))
            f.write("\n\nWorking fine:\n\n" + "\n".join(f"- {p}" for p in passed) + "\n")
        sys.exit(1)
    print("\nAll checks passed.")


if __name__ == "__main__":
    main()
