import { ReqForm } from "../../../../../../src/employer-console/req-form";

export default function NewEmployerReqPage() {
  return (
    <section aria-labelledby="new-req-heading">
      <h1 id="new-req-heading">Create requisition</h1>
      <ReqForm />
    </section>
  );
}
