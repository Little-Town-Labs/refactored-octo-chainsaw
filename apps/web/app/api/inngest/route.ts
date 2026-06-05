import { serve } from "inngest/next";

import { inngest } from "../../../src/inngest/client";
import { functions } from "../../../src/inngest/functions";
import { withAnonymous } from "../../../src/auth/with-anonymous";

const inngestHandlers = serve({
  client: inngest,
  functions,
});

const anonymousOptions = {
  route: "/api/inngest",
  reason: "Authenticated by Inngest signing key and SDK request verification.",
};

export const GET = withAnonymous(inngestHandlers.GET, anonymousOptions);
export const POST = withAnonymous(inngestHandlers.POST, anonymousOptions);
export const PUT = withAnonymous(inngestHandlers.PUT, anonymousOptions);
