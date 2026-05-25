import { createA2aIndexResponse } from "../../../../src/seeker-web/a2a-card-routes";
import { withAnonymous } from "../../../../src/auth/with-anonymous";

function getHandler(): Response {
  return createA2aIndexResponse();
}

export const GET = withAnonymous(getHandler, {
  route: "/.well-known/a2a/index.json",
  reason: "Public A2A discovery index.",
});
