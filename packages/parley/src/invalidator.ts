import type { ParleyRunRepository } from "./repo.js";
import type { ParleyTerminalEvent } from "./types.js";

export async function invalidateParleyRun(input: {
  readonly run_id: string;
  readonly reason_code: string;
  readonly runRepository: ParleyRunRepository;
}): Promise<ParleyTerminalEvent> {
  const run = await input.runRepository.getRun(input.run_id);
  if (!run) throw new Error("parley_run_missing");
  await input.runRepository.transitionRun({
    run_id: run.run_id,
    from_state: run.status,
    to_state: "aborted",
    reason_code: input.reason_code,
  });
  return {
    event_name: "negotiation.run.terminated",
    event_version: 1,
    run_id: run.run_id,
    match_ticket_id: run.match_ticket_id,
    terminal_state: "aborted",
    reason_code: input.reason_code,
  };
}
