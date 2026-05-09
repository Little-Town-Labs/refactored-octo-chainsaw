// Deterministic clock for integration tests.
//
// Pass `clock.now` (a `() => number` returning unix-seconds) into any
// component that takes a `now: () => number` (e.g. `verifyServiceCredential`).
// Tests advance time explicitly to drive expiry/rotation paths
// without `setTimeout`-style flakiness.

export class FakeClock {
  private _unixSeconds: number;

  constructor(initialUnixSeconds: number) {
    this._unixSeconds = initialUnixSeconds;
  }

  now = (): number => this._unixSeconds;

  set(unixSeconds: number): void {
    this._unixSeconds = unixSeconds;
  }

  advance(seconds: number): void {
    this._unixSeconds += seconds;
  }
}
