---
name: Feature idea (lightweight)
about: Capture a feature idea for triage. Non-trivial features eventually go through the spec-kit workflow.
title: "idea: "
labels: feature, triage
---

## The idea

<!-- What's the feature? What user problem does it solve? -->

## Who's it for

<!-- Seeker, employer, operator, agent? -->

## Roadmap fit

The roadmap (`.specify/roadmap.md`) has 27 features through v0. If
this idea fits one of them, name it. If it's a new feature
post-v0, that's fine — it goes in the parking lot until v0 lands.

- [ ] Fits an existing roadmap feature: <!-- e.g., F20 -->
- [ ] New feature for v1+
- [ ] Not sure yet

## Constitutional implications

Does this idea touch the foundational articles? (Best-effort guess
is fine; reviewers will refine.)

- [ ] §I (CIA / privacy / AAA / DiD)
- [ ] §I.A Parley primitives
- [ ] §I.B Phased jurisdictional posture
- [ ] §II Agent-Native
- [ ] §III Dual-audience surfaces
- [ ] None obvious

## Next step

Non-trivial features go through the spec-kit workflow rather than
landing as direct PRs:

```
/speckit-specify <id>-<slug>
/speckit-clarify
/speckit-plan
/speckit-tasks
/speckit-analyze
/speckit-implement
```

This issue captures the idea; the spec is where it gets fleshed
out. See `CONTRIBUTING.md` § Spec-kit workflow.
