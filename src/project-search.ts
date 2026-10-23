export function buildProjectSearchCriteria(input: {
  query?: string;
  pi_name?: string;
  org_name?: string;
  fiscal_years?: number[];
  funding_mechanism?: string;
  nih_institute?: string;
}) {
  const criteria: Record<string, unknown> = {};
  if (input.query) criteria.advanced_text_search = { operator: "and", search_field: "projecttitle,terms", search_text: input.query };
  if (input.pi_name) criteria.pi_names = [{ any_name: input.pi_name }];
  if (input.org_name) criteria.org_names = [{ any_name: input.org_name }];
  if (input.fiscal_years) criteria.fiscal_years = input.fiscal_years;
  if (input.funding_mechanism) criteria.activity_codes = [input.funding_mechanism];
  if (input.nih_institute) criteria.agencies = [input.nih_institute];
  return criteria;
}
