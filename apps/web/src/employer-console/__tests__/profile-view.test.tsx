import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { EmployerProfileView } from "../employer-profile-view";
import type { EmployerProfileViewModel } from "../types";

jest.mock("../employer-profile-action", () => ({
  saveEmployerProfile: jest.fn(),
}));

const profile: EmployerProfileViewModel = {
  org_id: "11111111-1111-4111-8111-000000000101",
  profile_id: null,
  company_name: "Acme",
  company_summary: "Builds hiring tools",
  mission: "Match well",
  culture: "Clear",
  benefits: "Health",
  workplace_policy: "Remote",
  updated_at: null,
};

describe("<EmployerProfileView />", () => {
  it("renders organization context and editable profile fields", () => {
    render(<EmployerProfileView profile={profile} canEdit />);
    expect(screen.getByRole("heading", { name: /employer profile/i })).toBeInTheDocument();
    expect(screen.getByText(profile.org_id)).toBeInTheDocument();
    expect(screen.getByLabelText(/company name/i)).toHaveValue("Acme");
    expect(screen.getByRole("button", { name: /save profile/i })).toBeInTheDocument();
  });

  it("renders read-only profile for non-admin members", () => {
    render(<EmployerProfileView profile={profile} canEdit={false} />);
    expect(screen.getByRole("group", { name: /company profile/i })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /save profile/i })).not.toBeInTheDocument();
  });

  it("renders an accessible error summary", () => {
    render(
      <EmployerProfileView profile={profile} canEdit errors={{ company_summary: ["Required"] }} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/company_summary/i);
  });
});
