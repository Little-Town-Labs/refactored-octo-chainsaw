# Threat Model: F12 AI Infrastructure

## Scope

F12 touches Constitution Articles I, I.A, I.C, and II. This threat model covers prompt/model publication, signed runtime manifests, prompt rendering, governed gateway invocation, cost controls, supply-chain evidence, review reads, and direct-provider bypass detection.

## Assets

- Prompt template content and variable contracts.
- Model profile selections, cost metadata, and provider allowlists.
- Signed AI runtime manifests and release evidence.
- Rendered prompt hashes, response hashes, usage metadata, and invocation records.
- Caller principal/scopes and run refs.
- Audit refs and supply-chain evidence.

## Trust Boundaries

- Release/operator publication path to registry records.
- Agent/Parley invocation path to `@spyglass/ai`.
- Prompt rendering boundary where trusted template variables meet untrusted text.
- Gateway adapter boundary between platform code and external model providers.
- Review-read boundary between compliance staff and private prompt/run evidence.

## STRIDE

| Threat | Risk | Control |
| --- | --- | --- |
| Spoofing caller identity | Agent invokes model under another principal | Require verifiable caller principal, scoped authorization, and audit refs before invocation |
| Tampering with prompt/model versions | Output cannot be reconstructed | Immutable `(id, version)` records, content hashes, signature refs, and mutation rejection tests |
| Repudiation of publication or invocation | Operator/agent denies AI action | Canonical audit events for publication, manifest release, invocation acceptance/refusal, and response receipt |
| Information disclosure through prompt content | Reviewer or counterparty sees unauthorized prompt/run data | Scoped review reads, prompt content access controls, safe refusal messages, and hash-only evidence where possible |
| Denial of service through provider outage | Runs stall or silently bypass policy | Manifest-authorized fallback only; otherwise fail closed with `gateway_unavailable` evidence |
| Elevation of privilege through direct provider imports | Agent bypasses cost/audit/supply-chain controls | Import-boundary tests and one exported invocation surface |
| Cost abuse through repeated invocations | Run exceeds budget before detection | Preflight ceilings, post-usage accounting, per-run/per-match/per-caller policies, and stable over-budget reason codes |
| Signature downgrade or invalid manifest use | Old or forged posture authorizes model calls | Manifest signature/hash verification and active-status checks before dispatch/invocation |

## LINDDUN

| Threat | Risk | Control |
| --- | --- | --- |
| Linkability | Invocation records overexpose candidate or employer context | Store refs and hashes; avoid raw transcript/private run data in review records |
| Identifiability | Prompt variables leak seeker or employer identity beyond need | Preserve F09 sentinel boundaries and rely on scoped caller/run refs |
| Non-repudiation privacy tension | Audit records expose too much personal data | Audit minimal refs, hashes, reason codes, and safe metadata rather than raw prompt/response content by default |
| Detectability | Unscoped actors infer model usage for sensitive matches | Review reads deny by default and return safe refusal codes |
| Disclosure | Rendered prompt includes unfiltered counterparty data | F12 preserves F09 boundaries and refuses unsafe/missing variable contracts |
| Unawareness | Operators cannot tell which model/prompt produced an output | Invocation records and manifests expose exact prompt/model/manifest refs |
| Non-compliance | Prompt/model changes bypass release controls | No hot reload, signed manifests, release-only publication, and schema/audit gates |

## Required Security Review Focus

- Verify direct-provider import boundary checks cover F13/F14 and Parley packages.
- Verify prompt rendering never strips or forges F09 sentinel boundaries.
- Verify manifest signature/hash failure refuses invocation.
- Verify budget preflight and usage-incomplete paths are auditable.
- Verify scoped review reads do not disclose raw prompt text or private run data unless explicitly authorized.
