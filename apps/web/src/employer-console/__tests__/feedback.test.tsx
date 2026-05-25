import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { EmployerConsoleFeedback, FieldErrors } from "../feedback";

describe("employer console feedback", () => {
  it("uses alert for errors and warnings", () => {
    render(<EmployerConsoleFeedback kind="error" title="Access denied" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Access denied");
  });

  it("uses status for empty states", () => {
    render(<EmployerConsoleFeedback kind="empty" title="No rows" />);
    expect(screen.getByRole("status")).toHaveTextContent("No rows");
  });

  it("links field errors to their inputs", () => {
    render(<FieldErrors errors={{ company_name: ["Required"] }} />);
    expect(screen.getByRole("link", { name: "company_name" })).toHaveAttribute(
      "href",
      "#company_name",
    );
  });
});
