# Contract: Eval Trends

## `extractProductEvalTrendPoints(snapshots)`

Input:

```ts
readonly ProductResultStoreSnapshot[]
```

Output:

```ts
readonly ProductEvalTrendPoint[]
```

Behavior:

- Returns one point per agent invocation with recognizable eval metadata.
- Ignores older or unrelated snapshots without eval metadata.
- Does not throw for malformed optional metadata.
- Does not include transcript, prompt, or raw tool payload data.

## `summarizeProductEvalTrends(points)`

Input:

```ts
readonly ProductEvalTrendPoint[]
```

Output:

```ts
ProductEvalTrendSummary
```

Behavior:

- Aggregates cost, latency, tokens, outcomes, providers, models, and refusal counts.
- Summary is informational and does not alter suite status.
