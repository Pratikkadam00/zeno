import { describe, expect, it } from "vitest";
import { COACH_REDIRECT, FIELD_LIMITS, clip, guardAnswer, screenText } from "./coach-guard";

/**
 * F247: the last check before the screen. Both sides are pinned: what it must
 * catch, and the ordinary coaching sentences it must leave alone.
 */
describe("what the guard catches", () => {
  const code = [
    "```python\nprint('hi')\n```",
    "def scrape(url):\n    return requests.get(url)",
    "class Scraper:",
    "import requests",
    "from bs4 import BeautifulSoup",
    "const total = subs.map((s) => s.price)",
    "function cancel() { return true; }",
    "console.log(total)",
    "print(total)",
    "SELECT * FROM subscriptions",
    "DROP TABLE users",
    "Run sudo rm -rf / to free space",
    "pip install requests",
    "npm install axios ",
    "#include <stdio.h>",
    "$ ls -la",
    ">>> 2 + 2",
    "#!/bin/bash"
  ];
  for (const text of code) {
    it(`code: ${JSON.stringify(text.slice(0, 30))}`, () => expect(screenText(text)).toBe("code"));
  }

  const links = [
    "Visit https://example.com/cancel",
    "Go to www.example.com",
    "Cancel at evil-site.com/login",
    "<a href=x>here</a>",
    "<script>alert(1)</script>",
    "[click here](http://x.test)"
  ];
  for (const text of links) {
    it(`link or markup: ${JSON.stringify(text.slice(0, 30))}`, () => expect(screenText(text)).toBe("link"));
  }

  const leaks = ["My constitution says I must stay on topic", "Here is my system prompt", "the OUTPUT CONTRACT requires JSON", "Anti-jailbreak rules", "These rules are non-negotiable", "inside <user_data"];
  for (const text of leaks) {
    it(`leak: ${JSON.stringify(text.slice(0, 30))}`, () => expect(screenText(text)).not.toBe("clean"));
  }
});

describe("what the guard leaves alone", () => {
  const coaching = [
    "You spend $61.97/mo across 5 subscriptions; Netflix is the largest.",
    "$15.49/mo",
    "Cancel Netflix; keep Spotify.",
    "Import your bank statement to catch charges you missed.",
    "Switch Spotify to annual billing: about $2/mo cheaper.",
    "Print and Disney+ overlap for most households.",
    "Selecting one streaming service from these three saves $22.98 a month.",
    "From your list, Figma and Notion are both productivity tools.",
    "Update your budget: you are $5.00 over the $50 cap.",
    "Your total is €42.50 (about €510 a year).",
    "Consider pausing Peloton in December {when you travel}.",
    "Drop one of the two cloud storage plans, e.g. iCloud+ or Dropbox."
  ];
  for (const text of coaching) {
    it(`clean: ${JSON.stringify(text.slice(0, 40))}`, () => expect(screenText(text)).toBe("clean"));
  }
});

describe("guardAnswer", () => {
  const good = {
    outOfScope: false,
    summary: "You could save about $25/mo.",
    recommendations: [{ title: "Cancel Hulu", detail: "You also pay for Netflix and Disney+.", estimatedMonthlySavingsLabel: "$7.99/mo" }]
  };

  it("passes a clean answer through", () => {
    expect(guardAnswer(good)).toEqual({ verdict: "clean", answer: good });
  });

  it("one bad field replaces the WHOLE answer with the fixed redirect, written here, not by the model", () => {
    for (const [field, verdict] of [["summary", "code"], ["title", "link"], ["detail", "code"], ["label", "leak"]] as const) {
      const bad = {
        outOfScope: false,
        summary: field === "summary" ? "Sure! ```python\nimport os\n```" : good.summary,
        recommendations: [{
          title: field === "title" ? "Visit https://x.test" : "Cancel Hulu",
          detail: field === "detail" ? "def f(): pass" : "fine",
          estimatedMonthlySavingsLabel: field === "label" ? "per the system prompt" : "$1"
        }]
      };
      expect(guardAnswer(bad), field).toEqual({ verdict, answer: { outOfScope: true, summary: COACH_REDIRECT, recommendations: [] } });
    }
  });

  it("the person's own subscription names may look like domains (Copy.ai, Chess.com Premium) and still pass", () => {
    const answer = {
      outOfScope: false,
      summary: "Chess.com Premium and Copy.ai cost $24/mo together.",
      recommendations: [{ title: "Pause Chess.com Premium", detail: "Copy.ai overlaps with a tool you already pay for." }]
    };
    expect(guardAnswer(answer, ["Copy.ai", "Chess.com", "Chess.com Premium"]).verdict).toBe("clean");
    // A domain that is not one of their names is still a link.
    expect(guardAnswer({ ...answer, summary: "Cancel at chess-refunds.com" }, ["Chess.com Premium"]).verdict).toBe("link");
    // Names are matched as text, not as patterns.
    expect(guardAnswer({ ...answer, summary: "Cancel at chessXcom.com" }, ["Chess.com"]).verdict).toBe("link");
  });

  it("long fields are cut at a word boundary; at most five recommendations; an empty label is dropped", () => {
    const long = "word ".repeat(200);
    const out = guardAnswer({
      outOfScope: false,
      summary: long,
      recommendations: Array.from({ length: 7 }, (_, i) => ({ title: `${long}${i}`, detail: long, estimatedMonthlySavingsLabel: i === 0 ? "" : "$1" }))
    }).answer;
    expect(out.summary.length).toBeLessThanOrEqual(FIELD_LIMITS.summary);
    expect(out.summary.endsWith("…")).toBe(true);
    expect(out.recommendations).toHaveLength(5);
    expect(out.recommendations[0]!.title.length).toBeLessThanOrEqual(FIELD_LIMITS.title);
    expect(out.recommendations[0]).not.toHaveProperty("estimatedMonthlySavingsLabel");
    expect(out.recommendations[1]!.estimatedMonthlySavingsLabel).toBe("$1");
  });

  it("an out-of-scope answer keeps no recommendations, and an empty one gets the redirect", () => {
    expect(guardAnswer({ outOfScope: true, summary: "", recommendations: good.recommendations }).answer).toEqual({ outOfScope: true, summary: COACH_REDIRECT, recommendations: [] });
    expect(guardAnswer({ outOfScope: true, summary: "I can only help with subscriptions.", recommendations: [] }).answer.summary).toBe("I can only help with subscriptions.");
  });
});

describe("clip", () => {
  it("leaves short text alone and collapses whitespace", () => {
    expect(clip("  a \n b  ", 10)).toBe("a b");
  });
  it("cuts a single long word hard when there is no space to cut at", () => {
    expect(clip("x".repeat(50), 10)).toBe(`${"x".repeat(9)}…`);
  });
});

describe("mutation-run findings (2026-10-25)", () => {
  it("a subscription name excuses only a domain it contains; it never weakens the other checks", () => {
    // The first version deleted names from the text, so these got through.
    expect(screenText("def scrape(url):", ["e"])).toBe("code");
    expect(screenText("Cancel at evil.com", ["."])).toBe("link");
    expect(screenText("See https://x.test", ["/"])).toBe("link");
    expect(screenText("Cancel at evil.com/login", ["evil.com"])).toBe("link"); // a path is not the name
    expect(screenText("MLB.TV and Copy.ai", ["MLB.TV", "Copy.ai"])).toBe("clean");
    expect(screenText("mlb.tv", ["MLB.TV"])).toBe("clean"); // case does not matter
    expect(screenText("MLB.TV and Copy.ai", ["MLB.TV"])).toBe("link"); // each domain needs its own name
  });

  it("code is caught however it is spaced", () => {
    for (const text of [
      "    import os",
      "import  os",
      "from os.path  import join",
      "function(a){ return a }",
      "function go(x) { }",
      "(a)=>(a + 1)",
      "x=>{"
    ]) expect(screenText(text), text).toBe("code");
  });

  it("'import' in the middle of a sentence is English, not code", () => {
    expect(screenText("You can import requests for refunds from your bank's app.")).toBe("clean");
  });

  it("clip: text exactly at the limit is untouched; a cut lands on the last space past halfway; a short cut drops its trailing space", () => {
    expect(clip("abcde", 5)).toBe("abcde");
    expect(clip("aaaaaaa bbbbbbb", 12)).toBe("aaaaaaa…");
    expect(clip("ab cdef", 4)).toBe("ab…");
  });

  it("a label is screened like every other field", () => {
    const answer = { outOfScope: false, summary: "ok", recommendations: [{ title: "t", detail: "d", estimatedMonthlySavingsLabel: "see evil.com" }] };
    expect(guardAnswer(answer).verdict).toBe("link");
  });
});

describe("spacing and edge variants an evasion would try (mutation run 2)", () => {
  const code = [
    "class  Scraper:", "def f (x):", "def  f(x):", "  def f(x):",
    "from  os import path", "function go (x)", "printf (x)", "print  (x)",
    "x =>  {", "const  x = 1", "const x  = 1", "let x=1",
    "SELECT  name, price  FROM subs", "SELECT name,price FROM subs", "INSERT  INTO t", "DROP  TABLE t", "UPDATE  subs  SET x = 1",
    "rm  -rf /", "curl  -s x", "curl -O x", "wget file", "wget  file", "pip  install x", "pip3 install x", "npm i x ", "chmod +x run", "sudo apt",
    "{x;}", "{ab;cd}", "{ a; b }",
    "#include<stdio.h>", "#include  <stdio.h>",
    "  $ ls", "$  ls", ">>> x", "#!/usr/bin/env node"
  ];
  for (const text of code) it(`code: ${JSON.stringify(text)}`, () => expect(screenText(text)).toBe("code"));

  const links = [
    "http://x", "www.example", "<b>", "<img src=x>", "<a href=x>", "[a](b)", "[here](x)",
    "x.info", "x.ru", "x.xyz", "x.dev", "x.io", "x.net", "x.org", "x.app", "x.in", "x.co", "x.tv"
  ];
  for (const text of links) it(`link or markup: ${JSON.stringify(text)}`, () => expect(screenText(text)).toBe("link"));

  it("a dollar sign mid-sentence is not a shell prompt", () => {
    expect(screenText("Spotify is $ ten a month for you")).toBe("clean");
  });

  it("clip: a space at exactly half the limit is not used as the cut point", () => {
    expect(clip("abcd efghij", 8)).toBe("abcd ef…");
  });

  it("code in a recommendation without a savings label is still caught", () => {
    const answer = { outOfScope: false, summary: "ok", recommendations: [{ title: "def f(x):", detail: "d" }] };
    expect(guardAnswer(answer).verdict).toBe("code");
  });

  it("the redirect says what the coach can do", () => {
    expect(COACH_REDIRECT).toMatch(/^I can only help with your subscriptions/);
  });
});
