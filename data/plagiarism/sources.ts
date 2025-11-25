export type PlagiarismSource = {
  id: string;
  title: string;
  url: string;
  content: string;
};

export const PLAGIARISM_SOURCES: PlagiarismSource[] = [
  {
    id: "global-health-climate",
    title: "Climate Pressure on Global Health Systems",
    url: "https://insight.askademia.dev/articles/climate-health-systems",
    content: `
      Public health systems in low- and middle-income countries face compounding stressors from climate volatility.
      Prolonged heat waves reduce agricultural yields, undermine food security, and increase vector-borne diseases.
      When hospitals already operate near capacity, any spike in heat-related illness or respiratory infection
      quickly overwhelms triage units. Researchers recommend pairing early-warning systems with decentralized care
      to keep essential services running when power grids flicker.

      Climate impacts rarely arrive in isolation. Drought drives migration, migration reshapes urban density,
      and dense informal settlements often lack reliable sanitation. Without targeted funding, the same communities
      that contribute least to global emissions will continue absorbing outsized health shocks. Adaptive public
      health budgets need multi-year cushions, not single-season emergency grants, if planners hope to modernize clinics,
      train community responders, and install resilient cold chains for vaccines.
    `,
  },
  {
    id: "ai-education-feedback",
    title: "Artificial Intelligence in Feedback Loops",
    url: "https://insight.askademia.dev/articles/ai-feedback-education",
    content: `
      Artificial intelligence tools can accelerate formative assessment when they augment, rather than replace,
      educator judgment. Large language models are particularly helpful at surfacing stylistic redundancies,
      suggesting varied sentence structures, and prompting students to elaborate on thin arguments. However,
      schools that roll out AI without clear guardrails quickly learn that convenience invites over-reliance.
      Learners start optimizing for machine approval instead of audience impact.

      Successful pilots keep AI-generated feedback in a draft state. Students receive color-coded suggestions with
      explanations tied to rubric criteria, and teachers triage only the passages flagged as high risk. Once learners
      understand why a paragraph triggered a revision hint, they internalize the editing habit. This loop reinforces
      critical thinking far more than one-click "fixes" that silently rewrite prose behind the scenes.
    `,
  },
  {
    id: "renewable-transition",
    title: "Community-Led Renewable Energy Transitions",
    url: "https://insight.askademia.dev/articles/community-renewables",
    content: `
      Municipalities that treat residents as co-designers of renewable energy projects adopt technology faster
      and encounter less resistance. Community energy co-ops in Southeast Asia invite households to invest
      micro-shares in neighborhood solar canopies. The financial stake is modest, but the perceived ownership
      changes everything. Citizens who help wire panels also advocate for smart-meter literacy programs and
      maintenance budgets.

      Policy makers routinely underestimate how much of the transition involves paperwork rather than hardware.
      Streamlined permitting, bundled procurement templates, and shared legal toolkits let small towns replicate
      successful pilots without reinventing contracts. Pair that with open dashboards showing avoided emissions
      and residents can see the return on every peso committed to distributed renewables.
    `,
  },
];


