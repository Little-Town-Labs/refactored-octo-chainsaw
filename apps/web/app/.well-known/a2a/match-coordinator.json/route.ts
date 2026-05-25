import { createA2aCardResponse } from "../../../../src/seeker-web/a2a-card-routes";
import { withAnonymous } from "../../../../src/auth/with-anonymous";

function getHandler(): Response {
  return createA2aCardResponse("match-coordinator");
}

export const GET = withAnonymous(getHandler, {
  route: "/.well-known/a2a/match-coordinator.json",
  reason: "Public A2A discovery card.",
});
