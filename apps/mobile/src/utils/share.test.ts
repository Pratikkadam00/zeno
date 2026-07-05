import { describe, expect, it, vi } from "vitest";

const shareMock = vi.fn().mockResolvedValue(undefined);
vi.mock("react-native", () => ({ Share: { share: (...args: unknown[]) => shareMock(...args) } }));

const { SHARE_SIGNATURE, shareText } = await import("./share");

describe("shareText", () => {
  it("appends the brand signature to every shared message", async () => {
    await shareText("Zeno found $480/year in subscriptions.");
    expect(shareMock).toHaveBeenCalledWith({
      message: `Zeno found $480/year in subscriptions.\n\n${SHARE_SIGNATURE}`
    });
  });

  it("swallows a share-sheet dismissal (rejection) instead of throwing", async () => {
    shareMock.mockRejectedValueOnce(new Error("User did not share"));
    await expect(shareText("anything")).resolves.toBeUndefined();
  });
});
