import { describe, expect, it } from "vitest";
import { buildProjectSearchCriteria } from "./project-search.js";

describe("buildProjectSearchCriteria", () => {
  it("returns no criteria when every filter is absent", () => {
    expect(buildProjectSearchCriteria({})).toEqual({});
  });

  it("maps each provided filter onto the project search criteria fields", () => {
    expect(buildProjectSearchCriteria({
      query: "kinase",
      pi_name: "Jane Chen",
      org_name: "State University",
      fiscal_years: [2023, 2024],
      funding_mechanism: "R01",
      nih_institute: "NCI",
    })).toEqual({
      advanced_text_search: {
        operator: "and",
        search_field: "projecttitle,terms",
        search_text: "kinase",
      },
      pi_names: [{ any_name: "Jane Chen" }],
      org_names: [{ any_name: "State University" }],
      fiscal_years: [2023, 2024],
      activity_codes: ["R01"],
      agencies: ["NCI"],
    });
  });

  it("drops empty string filters and keeps an empty fiscal year list", () => {
    expect(buildProjectSearchCriteria({
      query: "",
      pi_name: "",
      org_name: "",
      funding_mechanism: "",
      nih_institute: "",
      fiscal_years: [],
    })).toEqual({ fiscal_years: [] });
  });
});
