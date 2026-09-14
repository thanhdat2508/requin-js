import { describe, expect, it } from "vitest";
import {
  handleCalculateExpiresAt,
  hasSession,
  isSessionExpired,
} from "../lib/helper";
import { EXPIRE_GAP } from "../constants/time";

describe("Helper functions", () => {
  it("calculates expiresAt correctly from expiresIn", () => {
    const expiresIn = 3600;
    const now = Math.round(Date.now() / 1000);
    const calculated = handleCalculateExpiresAt(expiresIn);
    expect(calculated).toBeGreaterThanOrEqual(now + expiresIn - 1);
    expect(calculated).toBeLessThanOrEqual(now + expiresIn + 1);
  });

  it("checks if session is expired based on EXPIRE_GAP", () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const expiredTimestamp = nowSec - 10;
    const soonExpiringTimestamp =
      nowSec + Math.floor(EXPIRE_GAP / 1000) - 5; // within expire gap
    const validFutureTimestamp =
      nowSec + Math.floor(EXPIRE_GAP / 1000) + 100; // far in future

    expect(isSessionExpired(expiredTimestamp)).toBe(true);
    expect(isSessionExpired(soonExpiringTimestamp)).toBe(true);
    expect(isSessionExpired(validFutureTimestamp)).toBe(false);
    expect(isSessionExpired(undefined)).toBe(false);
  });

  it("identifies valid session data in hasSession", () => {
    expect(
      hasSession({
        access_token: "token",
        refresh_token: "ref_token",
        user: { id: "u1" } as any,
      }),
    ).toBe(true);

    expect(
      hasSession({
        access_token: "token",
      }),
    ).toBe(false);
  });
});
