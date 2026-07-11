# AI Infrastructure Runbook

## Scope

F12 governs prompt versions, model profile versions, AI runtime manifests,
model invocation records, cost controls, and AI supply-chain evidence.
F13/F14 advocate agents consume these refs; they do not publish or mutate
AI infrastructure.

## Provider Gateway Setup

Spyglass currently uses OpenRouter for live model calls. Provider access
still runs through `@spyglass/ai`; advocate and Parley packages must not
call OpenRouter or any model provider directly.

Required production secret:

```text
OPENROUTER_API_KEY
```

The shared production environment gate rejects a missing or whitespace-only
key when server-side bootstrap calls `getEnv()`. Development and test paths
remain keyless when they use deterministic fake gateways.

Optional provider settings:

```text
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_APP_URL=https://spyglass-bay.vercel.app
OPENROUTER_APP_TITLE=Spyglass
```

`OPENROUTER_BASE_URL` defaults to `https://openrouter.ai/api/v1`.
`OPENROUTER_APP_URL` and `OPENROUTER_APP_TITLE` are sent as optional
OpenRouter attribution headers.

Model profiles that use this live path should set provider `openrouter`
and use the approved OpenRouter model slug as the model identity. Runtime
manifests must include `openrouter` in `provider_allowlist`; otherwise
F12 supply-chain checks refuse the invocation before the gateway adapter
runs.

`AI_GATEWAY_API_KEY` is legacy Vercel AI Gateway configuration retained
only for older deployment state. Do not add it for new OpenRouter-backed
environments.

## Publish Prompt Version

1. Prepare the prompt content and variable contract.
2. Confirm the prompt does not embed rubric weights or scoring policy.
3. Publish a new immutable `(prompt_id, version)` with content hash,
   release manifest ref, signature ref, operator principal, and audit ref.
4. Never edit a published prompt row. Publish a new version instead.

## Publish Model Profile Version

1. Confirm provider/model identity and capability class.
2. Attach cost metadata and supply-chain evidence such as model card or
   provider attestation refs.
3. Publish a new immutable `(model_profile_id, version)` with signature
   and audit evidence.
4. Retire or supersede old versions without deleting them.

## Release Runtime Manifest

1. Select published prompt and model profile refs.
2. Set caller scopes, provider allowlist, cost controls, and fallback
   posture.
3. Sign the manifest and publish it with `no_hot_reload=true`.
4. Dispatch and invocation must use the manifest refs selected at
   release or dispatch time.

## Invocation Review

Reviewers with `ai:review` scope can reconstruct:

- prompt/model/manifest refs,
- request and response hashes,
- usage metadata,
- cost evidence,
- refusal reason codes,
- audit refs.

Raw prompt content and private run data stay scoped and are not exposed
through unscoped review reads.

## Incident Handling

- Invalid manifest signature: revoke the manifest and refuse affected
  invocations until a signed replacement is active.
- OpenRouter outage: use only manifest-authorized fallback behavior.
  Otherwise fail closed with `gateway_unavailable`; the invocation record is
  finalized as `failed` so audit and retry workflows do not retain an
  indefinite `accepted` record.
- OpenRouter key exposure: delete the compromised key in OpenRouter,
  create a replacement key, update deployment secrets, redeploy, and
  review invocation records for unexpected traffic.
- Cost spike: inspect invocation records, cost evidence, and caller/run
  refs; block future traffic by retiring the manifest or lowering cost
  ceilings.
- Direct provider import finding: treat as a supply-chain bypass, remove
  the import, rerun boundary tests, and include it in `/security-review`.
