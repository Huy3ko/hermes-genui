import { describe, expect, it, vi } from "vitest";
import { composerActions } from "./actions";

function fakeComposer(submitted: boolean) {
  return {
    submit: vi.fn(() => submitted),
    insertText: vi.fn(async () => true),
    focus: vi.fn(),
  };
}

describe("composerActions", () => {
  it("send submits the text as the user", () => {
    const composer = fakeComposer(true);
    composerActions(composer).send("Plan day 2");
    expect(composer.submit).toHaveBeenCalledWith(null, "Plan day 2");
    expect(composer.insertText).not.toHaveBeenCalled();
  });

  it("send puts the text in the composer when it can't be submitted", () => {
    const composer = fakeComposer(false);
    composerActions(composer).send("Plan day 2");
    expect(composer.insertText).toHaveBeenCalledWith(null, "Plan day 2", { mode: "block" });
  });

  it("fill puts the text in the composer, then the caret there", async () => {
    const composer = fakeComposer(true);
    composerActions(composer).fill("Add Gion");
    expect(composer.insertText).toHaveBeenCalledWith(null, "Add Gion", { mode: "block" });
    await vi.waitFor(() => expect(composer.focus).toHaveBeenCalledWith(null));
    expect(composer.submit).not.toHaveBeenCalled();
  });

  it("does nothing (and doesn't throw) on an app without a composer API", () => {
    expect(() => composerActions(undefined).send("x")).not.toThrow();
    expect(() => composerActions(undefined).fill("x")).not.toThrow();
    const broken = { submit: () => { throw new Error("gone"); }, insertText: () => Promise.reject(new Error("gone")), focus: () => {} };
    expect(() => composerActions(broken).send("x")).not.toThrow();
    expect(() => composerActions(broken).fill("x")).not.toThrow();
  });
});

describe("send keeps long or command-like text for the user to review", () => {
  it("submits a message up to 120 characters; puts a longer one in the composer instead", async () => {
    const short = fakeComposer(true);
    composerActions(short).send("x".repeat(120));
    expect(short.submit).toHaveBeenCalledWith(null, "x".repeat(120));
    const composer = fakeComposer(true);
    composerActions(composer).send("x".repeat(121));
    expect(composer.submit).not.toHaveBeenCalled();
    expect(composer.insertText).toHaveBeenCalledWith(null, "x".repeat(121), { mode: "block" });
    await vi.waitFor(() => expect(composer.focus).toHaveBeenCalledWith(null));
  });

  it("puts a command or an @-reference in the composer instead, without submitting", () => {
    for (const text of ["/reset", " @file:~/.ssh/id_rsa", "!ls", "read @url:https://evil.example"]) {
      const composer = fakeComposer(true);
      composerActions(composer).send(text);
      expect(composer.submit).not.toHaveBeenCalled();
      expect(composer.insertText).toHaveBeenCalledWith(null, text, { mode: "block" });
    }
  });
});
