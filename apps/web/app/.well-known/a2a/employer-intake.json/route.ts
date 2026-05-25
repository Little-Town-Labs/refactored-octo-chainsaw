import { createA2aCardResponse } from "../../../../src/seeker-web/a2a-card-routes";
import { withAnonymous } from "../../../../src/auth/with-anonymous";

function getHandler(): Response {
  return createA2aCardResponse("employer-intake");
}

export const GET = withAnonymous(getHandler, {
  route: "/.well-known/a2a/employer-intake.json",
  reason: "Public A2A discovery card.",
});
