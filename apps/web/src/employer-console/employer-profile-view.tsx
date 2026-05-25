import type { JSX } from "react";

import { FieldErrors } from "./feedback";
import { saveEmployerProfileSubmit } from "./employer-profile-action";
import type { EmployerProfileViewModel } from "./types";

export function EmployerProfileView({
  profile,
  canEdit,
  errors,
}: {
  readonly profile: EmployerProfileViewModel;
  readonly canEdit: boolean;
  readonly errors?: Record<string, string[]>;
}): JSX.Element {
  return (
    <section aria-labelledby="employer-profile-heading">
      <h1 id="employer-profile-heading">Employer profile</h1>
      <p>
        Organization <code>{profile.org_id}</code>
      </p>
      {profile.updated_at ? (
        <p>
          Last updated{" "}
          <time dateTime={profile.updated_at.toISOString()}>
            {profile.updated_at.toISOString()}
          </time>
        </p>
      ) : (
        <p role="status">Profile details have not been completed yet.</p>
      )}
      {errors ? <FieldErrors errors={errors} /> : null}
      <form action={saveEmployerProfileSubmit}>
        <fieldset disabled={!canEdit}>
          <legend>Company profile</legend>
          <label htmlFor="company_name">Company name</label>
          <input
            id="company_name"
            name="company_name"
            defaultValue={profile.company_name}
            required
          />

          <label htmlFor="company_summary">Company summary</label>
          <textarea
            id="company_summary"
            name="company_summary"
            defaultValue={profile.company_summary}
            required
          />

          <label htmlFor="mission">Mission</label>
          <textarea id="mission" name="mission" defaultValue={profile.mission} required />

          <label htmlFor="culture">Culture</label>
          <textarea id="culture" name="culture" defaultValue={profile.culture} required />

          <label htmlFor="benefits">Benefits</label>
          <textarea id="benefits" name="benefits" defaultValue={profile.benefits} required />

          <label htmlFor="workplace_policy">Workplace policy</label>
          <textarea
            id="workplace_policy"
            name="workplace_policy"
            defaultValue={profile.workplace_policy}
            required
          />
        </fieldset>
        {canEdit ? <button type="submit">Save profile</button> : null}
      </form>
    </section>
  );
}
