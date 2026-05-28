# Pi Persona Eval Contracts

PTH09 introduces typed library contracts for deterministic Pi-compatible persona eval execution.

## Persona Contract

- persona id
- role
- label
- synthetic traits
- risk tags
- prompt seed ref

## Encounter Contract

- encounter id
- scenario id
- seeker persona id
- employer persona id
- encounter category
- prompt refs
- expected outcome

## Driver Contract

- driver id
- provider ref
- model ref
- encounter execution method
- normalized result containing transcript, tool traces, model metadata, usage, latency, cost, outcome, and evaluator summary

## Transcript Contract

- transcript ref
- safe excerpt metadata
- message count
- artifact refs

Raw transcript content that contains secrets, credentials, protected-class data, or private seeker content is rejected before persistence.

## Tool Trace Contract

- tool-call id
- tool name
- intent
- decision
- reason code

## Result Store Contract

- persona eval runs persist `agent_invocations`
- run artifacts may include `agent_transcript`
- invocation metadata records persona ids, encounter id, model/provider metadata, usage, latency, cost, outcome, and evaluator summary
