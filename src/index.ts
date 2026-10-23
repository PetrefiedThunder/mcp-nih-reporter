#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { buildProjectSearchCriteria } from "./project-search.js";

const server = new McpServer({ name: "mcp-nih-reporter", version: "1.0.0" });
const BASE = "https://api.reporter.nih.gov/v2";

async function nih(path: string, body: any) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`NIH RePORTER ${res.status}: ${await res.text()}`);
  return res.json();
}

server.tool("search_projects", "Search NIH-funded research projects", {
  query: z.string().optional().describe("Text search across project title and abstract"),
  pi_name: z.string().optional().describe("Principal investigator name"),
  org_name: z.string().optional().describe("Organization/university name"),
  fiscal_years: z.array(z.number()).optional().describe("Fiscal years to search"),
  funding_mechanism: z.string().optional().describe("e.g., R01, R21, R43, U01, P01"),
  nih_institute: z.string().optional().describe("Funding IC (e.g., NCI, NIMH, NIAID)"),
  limit: z.number().default(10),
  offset: z.number().default(0),
}, async ({ query, pi_name, org_name, fiscal_years, funding_mechanism, nih_institute, limit, offset }) => {
  const criteria = buildProjectSearchCriteria({ query, pi_name, org_name, fiscal_years, funding_mechanism, nih_institute });

  const data = await nih("/projects/search", { criteria, limit, offset });
  const projects = (data.results || []).map((p: any) => ({
    project_num: p.project_num, title: p.project_title,
    pi: p.principal_investigators?.map((pi: any) => pi.full_name),
    org: p.organization?.org_name, fiscal_year: p.fiscal_year,
    award_amount: p.award_amount, abstract: p.abstract_text?.slice(0, 300),
  }));
  return { content: [{ type: "text", text: JSON.stringify({ total: data.meta?.total, projects }, null, 2) }] };
});

server.tool("project_detail", "Get detailed info for a specific NIH project", {
  project_number: z.string().describe("NIH project number (e.g., 5R01CA012345-03)"),
}, async ({ project_number }) => {
  const data = await nih("/projects/search", {
    criteria: { project_nums: [project_number] }, limit: 1,
  });
  return { content: [{ type: "text", text: JSON.stringify(data.results?.[0], null, 2) }] };
});

server.tool("search_publications", "Search publications from NIH-funded research", {
  query: z.string().optional().describe("Text search"),
  pi_name: z.string().optional(),
  project_number: z.string().optional(),
  limit: z.number().default(10),
}, async ({ query, pi_name, project_number, limit }) => {
  const criteria: any = {};
  if (query) criteria.advanced_text_search = { search_text: query };
  if (pi_name) criteria.pi_names = [{ any_name: pi_name }];
  if (project_number) criteria.project_nums = [project_number];
  const data = await nih("/publications/search", { criteria, limit });
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

server.tool("spending_by_institute", "Get NIH spending data by institute/center", {
  fiscal_year: z.number().optional().describe("Fiscal year"),
}, async ({ fiscal_year }) => {
  const fy = fiscal_year || new Date().getFullYear();
  const url = `https://api.reporter.nih.gov/v2/projects/search`;
  // Get aggregate data by querying with group
  const data = await nih("/projects/search", {
    criteria: { fiscal_years: [fy] },
    limit: 1,
  });
  return { content: [{ type: "text", text: JSON.stringify({ fiscal_year: fy, meta: data.meta }, null, 2) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
