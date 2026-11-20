/**
 * Everything the site says about its owner lives here. Titles, companies
 * and dates of the career follow the LinkedIn profile.
 * Edit this file, run `npm run build`, and every page, the shell's
 * virtual filesystem, the feed and the sitemap follow.
 */

export const site = {
  url: "https://robertomanfreda.github.io",
  name: "Roberto Manfreda",
  user: "roberto",
  /** Hostname in every prompt: user@host. */
  host: "lab",
  timezone: "Europe/Rome",
  /** First developer role (YYYY-MM-DD). Drives "9+ years", the uptime counter and "On since" in the contact section. */
  careerStart: "2017-01-01",
  role: "DevOps Engineer",
  focus: "Platform & Performance Engineering",
  employer: "Aruba Software S.r.l.",
  location: "Potenza, Italy",
  tagline: "Software engineer. DevOps engineer. Performance tester. Bug bounty hunter.",
  description:
    "Roberto Manfreda — software and DevOps engineer building a performance-testing platform at Aruba Software, and a solo bug bounty hunter. Platforms, performance, application security.",
  /** Leave empty to keep the address off the site. */
  email: "robertomanfreda@protonmail.com",
  links: {
    github: "https://github.com/robertomanfreda",
    linkedin: "https://www.linkedin.com/in/roberto-manfreda/",
    stackoverflow: "https://stackoverflow.com/users/9935369/roberto-manfreda",
    source: "https://github.com/robertomanfreda/robertomanfreda.github.io"
  }
} as const;

export const about = [
  "I build platforms for a living and spend my nights finding out how they break.",
  "By day I design and develop a performance-testing platform currently at Aruba Software. Before that I was tech lead on distributed systems and the Kubernetes clusters they run on.",
  "After hours I hunt bugs, solo, on bounty programs. It is the same instinct pointed the other way: push on a system until it shows you what it really does."
];

export const facts: Array<[string, string]> = [
  ["role", `${site.role} · ${site.focus}`],
  ["org", site.employer],
  ["base", `${site.location} · remote`],
  ["speaks", "Italian (native) · English (C1)"],
  ["school", "Classical studies · Liceo Q. Orazio Flacco, Potenza"]
];

export type Area = { id: string; title: string; text: string };

/** The fields of work, one per role in the tagline. */
export const areas: Area[] = [
  {
    id: "software",
    title: "Software engineering",
    text: "Backend services, integrations between systems, and the tooling a team needs around them."
  },
  {
    id: "platform",
    title: "Platform & DevOps",
    text: "Kubernetes clusters, delivery pipelines and infrastructure as code. Getting a commit to production the same way every time."
  },
  {
    id: "performance",
    title: "Performance engineering",
    text: "Load testing, tuning and observability. Finding where a system bends before its users do."
  },
  {
    id: "security",
    title: "Application security",
    text: "Bug bounty hunting, penetration testing, and security checks built into the delivery pipeline."
  }
];

export type Role = {
  title: string;
  org: string;
  /** YYYY-MM */
  from: string;
  /** YYYY-MM, or omitted for the current role */
  to?: string;
  /** Consultancy the role was held through, shown as "consultant through …". */
  via?: string;
  /** Short engagements that happened during this role; drawn as side branches. */
  side?: Role[];
};

export const career: Role[] = [
  {
    title: "DevOps Engineer",
    org: "Aruba Software S.r.l.",
    from: "2026-04"
  },
  {
    title: "Technical Lead",
    org: "Sisal",
    from: "2022-12",
    to: "2026-03",
    via: "Alten",
    side: [
      {
        title: "Enterprise Architecture",
        org: "Zucchetti",
        from: "2025-05",
        to: "2025-05",
        via: "Alten"
      },
      {
        title: "Technical Collaboration",
        org: "TicketOne",
        from: "2025-01",
        to: "2025-01",
        via: "Alten"
      }
    ]
  },
  {
    title: "DevOps Engineer",
    org: "Aruba S.p.A.",
    from: "2022-07",
    to: "2022-11",
    via: "Alten"
  },
  {
    title: "Software Engineer",
    org: "Olivetti",
    from: "2022-03",
    to: "2022-07",
    via: "Alten"
  },
  {
    title: "Senior Software Engineer",
    org: "Sisal",
    from: "2019-11",
    to: "2022-02",
    via: "Alten",
    side: [
      {
        title: "Penetration Testing",
        org: "Alten",
        from: "2021-09",
        to: "2021-09"
      }
    ]
  },
  {
    title: "Software Maintenance Engineer",
    org: "SNAI",
    from: "2019-08",
    to: "2019-10",
    via: "Alten"
  },
  {
    title: "Software Engineer",
    org: "Microgame",
    from: "2019-01",
    to: "2019-07",
    via: "Alten"
  },
  {
    title: "Software Engineer",
    org: "GVC Group",
    from: "2018-07",
    to: "2018-12",
    via: "Alten"
  },
  {
    title: "Freelance Android Developer",
    org: "Google Play",
    from: "2017-01",
    to: "2018-12"
  },
  {
    title: "Software Developer",
    org: "JDK S.r.l.",
    from: "2018-03",
    to: "2018-06"
  },
  {
    title: "Web Designer",
    org: "Venum 3.0",
    from: "2016-09",
    to: "2017-02"
  }
];

/** `finger` prints this under "Plan:". */
export const plan = [
  "Building at Aruba Software.",
  "Hunting bugs after hours. Write-ups land here after disclosure."
];

export const windows = [
  { id: "whoami", label: "whoami" },
  { id: "scope", label: "scope" },
  { id: "career", label: "career" },
  { id: "projects", label: "projects" },
  { id: "writeups", label: "writeups" },
  { id: "contact", label: "contact" }
] as const;

export type WindowId = (typeof windows)[number]["id"];

/** The site mark: public/favicon.svg sampled into 52 by 26 characters. `#` and `+` are the letter, `:` its edge, `.` the tile. */
export const mark = [
  "      ........................................",
  "   ..............................................",
  "  ................................................",
  " .........########+:...............................",
  ".........:#############+:...........................",
  ".........:##################+:......................",
  ".........:#######################+:.................",
  ".........:######:.:+#################++:............",
  ".........:######:......:+#################..........",
  ".........:######:..........::+############:.........",
  ".........:######:...............:+########:.........",
  ".........:######:............:+###########:.........",
  ".........:######:.......:+################:.........",
  ".........:######:..:++################++:...........",
  ".........:########################+:................",
  ".........:###################+:.....................",
  ".........:###############+..........................",
  ".........:################+:........................",
  ".........:######++###########+:.....................",
  ".........:######:..:+###########+...................",
  ".........:######:.....:############+................",
  ".........:######:........+############+.............",
  " .........######............+##########+:..........",
  "  ................................................",
  "   ..............................................",
  "      ........................................"
];
