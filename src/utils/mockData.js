/** ─── Mock threads ─────────────────────────────────────────────────────────── */

export const MOCK_THREADS = [
  {
    id: 'th_001',
    title: 'Senior React Developer @ TechCorp',
    created_at: '2026-05-14T10:00:00Z',
    message_count: 6,
  },
  {
    id: 'th_002',
    title: 'Full Stack Engineer @ StartupXYZ',
    created_at: '2026-05-10T14:30:00Z',
    message_count: 4,
  },
]

/** ─── Mock message history per thread ─────────────────────────────────────── */

export const MOCK_MESSAGES = {
  th_001: [
    {
      id: 'msg_001',
      role: 'user',
      content: 'Tell me about your experience with React and TypeScript.',
      created_at: '2026-05-14T10:05:00Z',
    },
    {
      id: 'msg_002',
      role: 'assistant',
      content:
        "Strong opening question! Highlight your 4+ years with React and TypeScript. Mention key wins: migrating a large codebase from JavaScript to TypeScript (mention the type safety and refactoring benefits), your experience with React hooks and custom hook patterns, and any performance optimization work like memoization or code splitting. If you've built component libraries or design systems, bring that up — it shows architectural thinking.",
      created_at: '2026-05-14T10:05:04Z',
    },
    {
      id: 'msg_003',
      role: 'user',
      content: 'How do you handle state management in large applications?',
      created_at: '2026-05-14T10:12:00Z',
    },
    {
      id: 'msg_004',
      role: 'assistant',
      content:
        "Great topic for a senior role. Frame your answer around choosing the right tool for the scale: local state with useState/useReducer for component-level concerns, React Context for low-frequency global data (theme, auth), and a dedicated store like Zustand or Redux Toolkit for complex shared state. Emphasize that over-engineering with global state for simple apps is a red flag you avoid. If you've used React Query or SWR for server state, mention it — separating server and client state is a modern best practice that impresses interviewers.",
      created_at: '2026-05-14T10:12:05Z',
    },
    {
      id: 'msg_005',
      role: 'user',
      content: 'What is your experience with testing React components?',
      created_at: '2026-05-14T10:20:00Z',
    },
    {
      id: 'msg_006',
      role: 'assistant',
      content:
        "Solid area to demonstrate. Mention: React Testing Library (user-centric testing that focuses on behavior not implementation), Jest for unit tests, and Playwright or Cypress for E2E. Emphasize your testing philosophy: test what users see and do, not internal component state. Talk about the testing pyramid — more unit tests, fewer integration, fewest E2E. If you've set up CI pipelines with automated test runs, that's a big plus for a senior engineer role.",
      created_at: '2026-05-14T10:20:04Z',
    },
  ],

  th_002: [
    {
      id: 'msg_007',
      role: 'user',
      content: 'Walk me through a challenging project you led end to end.',
      created_at: '2026-05-10T14:35:00Z',
    },
    {
      id: 'msg_008',
      role: 'assistant',
      content:
        "Use the STAR method: Situation, Task, Action, Result. Pick a project where you had real ownership. Structure it as: the business problem and its impact, your technical decisions (and why you made them over alternatives), challenges you hit and how you adapted, and a quantifiable result (e.g. 40% reduction in load time, shipped on schedule despite X constraint). For a full-stack role, choose a project that shows both frontend and backend depth — an API you designed, a DB schema you modeled, and a UI you built end to end.",
      created_at: '2026-05-10T14:35:05Z',
    },
    {
      id: 'msg_009',
      role: 'user',
      content: 'How comfortable are you with Node.js and backend development?',
      created_at: '2026-05-10T14:42:00Z',
    },
    {
      id: 'msg_010',
      role: 'assistant',
      content:
        "Be specific and honest about your level. If you're comfortable: mention frameworks (Express, Fastify, NestJS), database work (SQL with Postgres/MySQL, or NoSQL with MongoDB), and API design experience (REST, and optionally GraphQL). Highlight any experience with authentication (JWT, OAuth), background jobs, or WebSocket work. For a startup role, also mention comfort with cloud services (AWS, GCP, or Azure) — even basic EC2, S3, and Lambda knowledge is valued. If you're stronger on frontend, frame it as: 'I'm T-shaped — deep in frontend, capable across the full stack.'",
      created_at: '2026-05-10T14:42:06Z',
    },
  ],
}

/** ─── Pool of contextual AI responses for mock send ─────────────────────── */

const AI_RESPONSE_POOL = [
  (text) =>
    `Great question to answer strategically. Based on what was asked ("${text.slice(0, 60)}..."), frame your response around concrete examples from your experience. Lead with the outcome first — what you achieved — then explain how. Interviewers remember results, not process.`,

  (text) =>
    `This is testing your depth. For "${text.slice(0, 50)}...", avoid generic answers. Be specific: name the tools, name the scale, name the constraint you were working under. Specificity signals seniority. If you have a real example, use numbers — team size, user count, performance gains, timeline.`,

  (text) =>
    `Strong opportunity here. When asked about "${text.slice(0, 50)}...", structure your answer in 30 seconds: (1) your direct experience with it, (2) a specific example or decision you made, (3) what you'd do differently or learned. Keep it tight — they'll ask follow-ups if they want more.`,

  (text) =>
    `This question often trips people up. For "${text.slice(0, 50)}...", the best answer shows you understand the trade-offs, not just the happy path. Mention what can go wrong, how you've handled edge cases, and why you chose one approach over an alternative. That's senior-level thinking.`,

  (text) =>
    `Behavioral question detected. Use STAR format: Situation (1 sentence), Task (what you were responsible for), Action (what you specifically did — use "I" not "we"), Result (measurable outcome). For "${text.slice(0, 45)}...", pick an example where YOU had clear ownership and the result was positive.`,

  () =>
    `Pause briefly before answering — it shows confidence, not uncertainty. Give a focused 60–90 second answer, then stop. Don't ramble. If they want more, they'll ask. Let the silence work for you after you finish.`,
]

export function getMockAiResponse(transcriptionText) {
  const idx = Math.floor(Math.random() * AI_RESPONSE_POOL.length)
  return AI_RESPONSE_POOL[idx](transcriptionText)
}

/** Extract a rough title from a job description */
export function extractTitleFromJD(jd) {
  const firstLine = jd.split('\n').find((l) => l.trim().length > 3)?.trim()
  if (!firstLine) return 'Untitled Interview'
  return firstLine.length > 50 ? firstLine.slice(0, 47) + '…' : firstLine
}
