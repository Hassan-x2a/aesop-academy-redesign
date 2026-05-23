// taxonomy-parser.js -- generated course catalogue (78 courses)

const V1 = (id) => `/ai-academy/modules/electives-hub.html?course=${id}`;

export const COURSE_CATALOGUE = [
  // --- V2 courses (7) ---
  { id: 'brainstorming-with-ai', path: '/ai-academy/modules/v2/brainstorming-with-ai/m1.html', difficulty: 'beginner' },
  { id: 'ethics', path: '/ai-academy/modules/v2/ai-ethics-decision-making/m1.html', difficulty: 'intermediate' },
  { id: 'building-with-ai', path: '/ai-academy/modules/v2/building-with-ai/m1.html', difficulty: 'intermediate' },
  { id: 'agents', path: '/ai-academy/modules/v2/building-ai-agents-use-cases/m1.html', difficulty: 'intermediate' },
  { id: 'leveraging-rag', path: '/ai-academy/modules/v2/leveraging-rag-ai-development/m1.html', difficulty: 'advanced' },
  { id: 'building-agentic-pipelines', path: '/ai-academy/modules/v2/building-agentic-pipelines/m1.html', difficulty: 'advanced' },
  { id: 'ai-command-center', path: '/ai-academy/modules/v2/ai-command-center/m1.html', difficulty: 'advanced' },

  // --- Beginner v1 (11) ---
  { id: "ai-and-creativity", name: "AI & Creativity", path: V1("ai-and-creativity"), difficulty: "beginner", modules: 8, desc: "Dive deep into generative AI for writing, art, music, and storytelling. Collaborate with AI as a creative partner." },
  { id: "ai-in-society", name: "AI in Society", path: V1("ai-in-society"), difficulty: "beginner", modules: 9, desc: "AI has quietly become a layer of public life. This course makes the invisible visible." },
  { id: "ai-misinformation", name: "AI and Misinformation", path: V1("ai-misinformation"), difficulty: "beginner", modules: 4, desc: "Learn to recognize, evaluate, and counter AI-generated misinformation." },
  { id: "ai-job-market-impact", name: "AIs Impact on Jobs", path: V1("ai-job-market-impact"), difficulty: "beginner", modules: 4, desc: "Examine how AI automation affects industries and job roles. Strategies for adapting your career." },
  { id: "ai-social-media", name: "AI in Social Media", path: V1("ai-social-media"), difficulty: "beginner", modules: 4, desc: "Understand how AI shapes your social media experience through content filtering and targeting." },
  { id: "ai-bias-and-fairness", name: "Understanding AI Bias and Fairness", path: V1("ai-bias-and-fairness"), difficulty: "beginner", modules: 4, desc: "Explore how AI systems develop bias and what fairness in AI really means." },
  { id: "future-of-work-ai", name: "AIs Impact on Future Work", path: V1("future-of-work-ai"), difficulty: "beginner", modules: 4, desc: "Discover which jobs AI will automate, augment, or create. Skills to thrive in an AI workplace." },
  { id: "gpt-vs-claude-vs-gemini", name: "GPT vs. Claude vs. Gemini", path: V1("gpt-vs-claude-vs-gemini"), difficulty: "beginner", modules: 9, desc: "Compare leading AI models - strengths, limitations, and real-world performance." },
  { id: "conversational-ai-chatbots", name: "Conversational AI and Chatbots", path: V1("conversational-ai-chatbots"), difficulty: "beginner", modules: 4, desc: "Understand how AI communicates with humans through text and speech." },
  { id: "ai-work-and-automation-realities", name: "AI, Jobs, and Your Career", path: V1("ai-work-and-automation-realities"), difficulty: "beginner", modules: 8, desc: "A realistic picture of how automation affects careers, industries, and daily work." },
  { id: "ai-and-the-future-of-work", name: "AI and the Future of Work", path: V1("ai-and-the-future-of-work"), difficulty: "beginner", modules: 8, desc: "Examine how AI is reshaping employment - which jobs are changing, which are disappearing." },

  // --- Intermediate v1 (44) ---
  { id: "ai-ethics", name: "AI Ethics & Decision-Making", path: V1("ai-ethics"), difficulty: "intermediate", modules: 9, desc: "Ethics used to be studied in universities. AI made it a topic debated in procurement meetings." },
  { id: "ai-governance", name: "AI Governance", path: V1("ai-governance"), difficulty: "intermediate", modules: 9, desc: "Every consequential technology faces its governance reckoning. AI is facing it now." },
  { id: "ai-careers-and-research", name: "AI Careers & Research", path: V1("ai-careers-and-research"), difficulty: "intermediate", modules: 6, desc: "Career paths in AI research, policy, design, and engineering. Real profiles and skill roadmaps." },
  { id: "ai-in-healthcare", name: "AI in Healthcare", path: V1("ai-in-healthcare"), difficulty: "intermediate", modules: 6, desc: "How AI is transforming medicine - from diagnostics to drug discovery - and the stakes involved." },
  { id: "ai-and-education", name: "AI & Education", path: V1("ai-and-education"), difficulty: "intermediate", modules: 7, desc: "How AI is reshaping teaching, learning, and academic integrity." },
  { id: "ai-and-climate", name: "AI & Climate", path: V1("ai-and-climate"), difficulty: "intermediate", modules: 6, desc: "The same technology straining the grid may be the best tool for understanding what to do about it." },
  { id: "ai-and-finance", name: "AI & Finance", path: V1("ai-and-finance"), difficulty: "intermediate", modules: 6, desc: "How AI is transforming banking, investing, lending, and financial risk." },
  { id: "ai-psychology-and-behavior", name: "AI Psychology & Behavior", path: V1("ai-psychology-and-behavior"), difficulty: "intermediate", modules: 6, desc: "The psychological dimensions of AI - how it shapes human behavior, trust, and wellbeing." },
  { id: "ai-safety-and-alignment", name: "Teaching AI to Do Good", path: V1("ai-safety-and-alignment"), difficulty: "intermediate", modules: 6, desc: "Why building AI systems that do what we actually want has become one of the defining challenges of our era." },
  { id: "ai-leadership", name: "AI Leadership", path: V1("ai-leadership"), difficulty: "intermediate", modules: 7, desc: "For managers and executives. How to lead organizations through AI adoption responsibly." },
  { id: "ai-and-media", name: "AI & Media", path: V1("ai-and-media"), difficulty: "intermediate", modules: 6, desc: "How AI is transforming journalism, content creation, and the information ecosystem." },
  { id: "ai-and-national-security", name: "AI & National Security", path: V1("ai-and-national-security"), difficulty: "intermediate", modules: 6, desc: "AIs role in defense, intelligence, cyber operations, and geopolitical competition." },
  { id: "ai-consciousness-and-philosophy", name: "AI Consciousness & Philosophy", path: V1("ai-consciousness-and-philosophy"), difficulty: "intermediate", modules: 6, desc: "Grapple with questions about intelligence, consciousness, and what AI reveals about being human." },
  { id: "the-future-of-intelligence", name: "The Future of Intelligence", path: V1("the-future-of-intelligence"), difficulty: "intermediate", modules: 6, desc: "Reading where machine intelligence is going - and why the trajectory matters more than todays headlines." },
  { id: "how-large-language-models-work", name: "How Large Language Models Work", path: V1("how-large-language-models-work"), difficulty: "intermediate", modules: 8, desc: "Demystify transformers, training, and why LLMs behave the way they do - without needing a PhD." },
  { id: "running-models-locally", name: "Running Models Locally", path: V1("running-models-locally"), difficulty: "intermediate", modules: 8, desc: "Run open-source models on your own hardware. Privacy, cost, and control explained." },
  { id: "image-generation-models", name: "Image Generation Models", path: V1("image-generation-models"), difficulty: "intermediate", modules: 8, desc: "The architecture behind AI image generation - use it deliberately rather than accidentally." },
  { id: "model-evaluation-and-benchmarks", name: "Model Evaluation and Benchmarks", path: V1("model-evaluation-and-benchmarks"), difficulty: "intermediate", modules: 8, desc: "How good is good enough - and who gets to decide? The science of evaluating AI systems." },
  { id: "the-alignment-problem", name: "The Alignment Problem", path: V1("the-alignment-problem"), difficulty: "intermediate", modules: 8, desc: "The defining technical-and-moral problem of the AI era. No one has fully solved it." },
  { id: "voice-and-real-time-ai", name: "Voice and Real-Time AI", path: V1("voice-and-real-time-ai"), difficulty: "intermediate", modules: 8, desc: "Voice is the oldest human interface. AI just made it the newest one too." },
  { id: "the-hardware-race", name: "The Hardware Race", path: V1("the-hardware-race"), difficulty: "intermediate", modules: 8, desc: "The chip competition powering the AI era - GPUs, TPUs, custom silicon, and why hardware is the defining constraint." },
  { id: "synthetic-data-and-self-improvement", name: "Synthetic Data and Self-Improvement", path: V1("synthetic-data-and-self-improvement"), difficulty: "intermediate", modules: 8, desc: "How AI systems use generated data to train themselves - and what that means for capability growth." },
  { id: "the-context-window-race", name: "The Context Window Race", path: V1("the-context-window-race"), difficulty: "intermediate", modules: 8, desc: "Why the size of what an AI can hold in mind at once matters more than almost anything else." },
  { id: "the-reasoning-revolution", name: "The Reasoning Revolution", path: V1("the-reasoning-revolution"), difficulty: "intermediate", modules: 8, desc: "Understanding how AI reasons - not just what it produces - is the literacy that defines this decade." },
  { id: "ai-in-science", name: "AI in Science", path: V1("ai-in-science"), difficulty: "intermediate", modules: 8, desc: "Science has always advanced by building better tools - and this one rewrites the rules of every laboratory." },
  { id: "ai-agents-in-the-wild", name: "AI Agents in the Wild", path: V1("ai-agents-in-the-wild"), difficulty: "intermediate", modules: 8, desc: "Real-world AI agent deployments - what works, what fails, and the current frontier of autonomous AI." },
  { id: "what-s-coming-next", name: "Whats Coming Next", path: V1("what-s-coming-next"), difficulty: "intermediate", modules: 8, desc: "Every era produces confident predictions about what a technology cannot do. This course examines them." },
  { id: "ai-autonomous-systems", name: "Autonomous AI Systems", path: V1("ai-autonomous-systems"), difficulty: "intermediate", modules: 4, desc: "AI systems operating independently in the physical world - vehicles, drones, and robots." },
  { id: "ai-in-game-design-i", name: "AI in Game Design I", path: V1("ai-in-game-design-i"), difficulty: "intermediate", modules: 8, desc: "How AI is transforming game design - procedural generation, NPC behavior, and creative tools." },
  { id: "ai-and-architecture", name: "AI and Architecture", path: V1("ai-and-architecture"), difficulty: "intermediate", modules: 8, desc: "Why generative AI in architecture matters more than any tool change in the past century." },
  { id: "ai-for-graphic-design", name: "AI for Graphic Design", path: V1("ai-for-graphic-design"), difficulty: "intermediate", modules: 8, desc: "AI in professional graphic design - logos, layout, typography, and brand systems." },
  { id: "ai-and-the-writer-s-voice", name: "AI and the Writers Voice", path: V1("ai-and-the-writer-s-voice"), difficulty: "intermediate", modules: 8, desc: "What survives - and must be defended - when language generation becomes cheap." },
  { id: "photography-and-ai", name: "Photography and AI", path: V1("photography-and-ai"), difficulty: "intermediate", modules: 8, desc: "How AI is transforming photography - intelligent cameras, AI editing, and synthetic photography." },
  { id: "performing-arts-and-ai", name: "Performing Arts and AI", path: V1("performing-arts-and-ai"), difficulty: "intermediate", modules: 8, desc: "How AI is entering theater, dance, and live performance as a creative collaborator." },
  { id: "storytelling-with-ai", name: "Storytelling with AI", path: V1("storytelling-with-ai"), difficulty: "intermediate", modules: 8, desc: "The oldest human practice is now entangled with the newest technology. What that means for writers." },
  { id: "ai-tools-for-solo-founders", name: "AI Tools for Solo Founders", path: V1("ai-tools-for-solo-founders"), difficulty: "intermediate", modules: 8, desc: "A practical guide to running a solo business with AI as your unfair advantage." },
  { id: "ai-for-marketing-and-growth", name: "AI for Marketing and Growth", path: V1("ai-for-marketing-and-growth"), difficulty: "intermediate", modules: 8, desc: "How AI is transforming marketing - campaign creation, targeting, personalization, and growth analytics." },
  { id: "ai-risk-for-business-leaders", name: "AI Risk for Business Leaders", path: V1("ai-risk-for-business-leaders"), difficulty: "intermediate", modules: 7, desc: "AI risks that matter for business - operational, reputational, legal, and strategic." },
  { id: "funding-and-pitching-ai-ventures", name: "Funding and Pitching AI Ventures", path: V1("funding-and-pitching-ai-ventures"), difficulty: "intermediate", modules: 8, desc: "How investors evaluate AI companies and what makes an AI pitch compelling." },
  { id: "ai-for-product-development", name: "AI for Product Development", path: V1("ai-for-product-development"), difficulty: "intermediate", modules: 8, desc: "AI mapped onto the full product lifecycle - from discovery through discontinuation." },
  { id: "building-an-ai-first-business", name: "Building an AI-First Business", path: V1("building-an-ai-first-business"), difficulty: "intermediate", modules: 8, desc: "Build a business where AI is central - not bolted on. Architecture, culture, and execution." },
  { id: "ai-for-small-business-managers", name: "AI for Small Business Managers", path: V1("ai-for-small-business-managers"), difficulty: "intermediate", modules: 8, desc: "Practical AI adoption for small business owners who need results, not hype." },
  { id: "prompt-engineering-for-developers", name: "Prompt Engineering for Developers", path: V1("prompt-engineering-for-developers"), difficulty: "intermediate", modules: 8, desc: "Master prompt engineering as a technical discipline - system prompts, few-shot, chain-of-thought, structured outputs." },
  { id: "v1-building-with-ai", name: "Building with AI (v1)", path: V1("building-with-ai"), difficulty: "intermediate", modules: 9, desc: "For three decades we built software by typing. That changed. This course is about building on the other side." },

  // --- Advanced v1 (16) ---
  { id: "building-ai-agents-i-use-cases", name: "Building AI Agents I - Use Cases", path: V1("building-ai-agents-i-use-cases"), difficulty: "advanced", modules: 8, desc: "Survey AI agent use cases - when agents add value, what architectures they use, and how to evaluate them." },
  { id: "building-ai-agents-ii-skills", name: "Building AI Agents II - Skills", path: V1("building-ai-agents-ii-skills"), difficulty: "advanced", modules: 8, desc: "Equip agents with memory, knowledge, and reasoning. Context storage, information access, multi-step planning." },
  { id: "building-ai-agents-iii-tools", name: "Building AI Agents III - Tools", path: V1("building-ai-agents-iii-tools"), difficulty: "advanced", modules: 8, desc: "Give agents real capabilities - web browsing, code execution, API calls, and MCP integration." },
  { id: "building-ai-agents-iv-openclaw", name: "Building AI Agents IV - OpenClaw", path: V1("building-ai-agents-iv-openclaw"), difficulty: "advanced", modules: 8, desc: "Build and deploy OpenClaw - a production-grade AI agent framework." },
  { id: "building-ai-agents-v-optimization", name: "Building AI Agents V - Optimization", path: V1("building-ai-agents-v-optimization"), difficulty: "advanced", modules: 8, desc: "Optimize agent systems for performance, cost, and reliability. Profiling, latency, token efficiency." },
  { id: "applied-ai-development", name: "Applied AI Development", path: V1("applied-ai-development"), difficulty: "advanced", modules: 8, desc: "Build real AI systems. From fine-tuning to deployment - hands-on, project-based, no fluff." },
  { id: "deploying-and-monitoring-ai", name: "Deploying and Monitoring AI", path: V1("deploying-and-monitoring-ai"), difficulty: "advanced", modules: 8, desc: "Shipping an AI model is not the finish line - it is the starting gun." },
  { id: "rag-systems-from-scratch", name: "RAG Systems from Scratch", path: V1("rag-systems-from-scratch"), difficulty: "advanced", modules: 8, desc: "Build RAG systems from the ground up - embeddings, vector databases, chunking, hybrid search." },
  { id: "working-with-the-anthropic-api", name: "Working with the Anthropic API", path: V1("working-with-the-anthropic-api"), difficulty: "advanced", modules: 8, desc: "Build production applications on Claude - Messages API, tool use, vision, streaming." },
  { id: "ai-security-and-red-teaming", name: "AI Security and Red-Teaming", path: V1("ai-security-and-red-teaming"), difficulty: "advanced", modules: 8, desc: "Build AI systems that hold up under adversarial pressure - prompt injection, jailbreaks, data leakage." },
  { id: "evaluation-and-testing-for-ai", name: "Evaluation and Testing for AI", path: V1("evaluation-and-testing-for-ai"), difficulty: "advanced", modules: 8, desc: "Testing infrastructure to ship AI confidently - evals, benchmarks, red-teaming, regression testing." },
  { id: "ai-code-review-fundamentals", name: "AI Code Review Fundamentals", path: V1("ai-code-review-fundamentals"), difficulty: "advanced", modules: 8, desc: "Read and validate AI-generated code. Spot hallucinated APIs, phantom dependencies, and logic errors." },
  { id: "security-auditing-ai-generated-code", name: "Security Auditing for AI-Generated Code", path: V1("security-auditing-ai-generated-code"), difficulty: "advanced", modules: 8, desc: "Find vulnerabilities AI code introduces - injection flaws, authentication gaps, insecure data handling." },
  { id: "code-audit-workflows-team-standards", name: "Code Audit Workflows and Team Standards", path: V1("code-audit-workflows-team-standards"), difficulty: "advanced", modules: 8, desc: "Systematic review processes for AI-assisted development teams. Quality gates at scale." },
  { id: "building-agents-vertex-ai", name: "Building Production Agents with Vertex AI", path: V1("building-agents-vertex-ai"), difficulty: "advanced", modules: 8, desc: "Orchestrated AI agents on managed cloud infrastructure - a genuine architectural break." },
  { id: "vertex-ai-data-agents", name: "Agentic Data Workflows on Google Cloud", path: V1("vertex-ai-data-agents"), difficulty: "advanced", modules: 8, desc: "Every powerful AI agent is only as useful as the data it can reach - this course closes that gap." },
];

export const TAG_AFFINITY = {
  python: ['building-with-ai', 'applied-ai-development', 'working-with-the-anthropic-api', 'rag-systems-from-scratch', 'building-ai-agents-iv-openclaw', 'building-ai-agents-iii-tools', 'leveraging-rag', 'building-agentic-pipelines', 'ai-command-center', 'building-ai-agents-v-optimization', 'deploying-and-monitoring-ai', 'building-agents-vertex-ai', 'vertex-ai-data-agents', 'evaluation-and-testing-for-ai', 'ai-code-review-fundamentals', 'security-auditing-ai-generated-code', 'code-audit-workflows-team-standards', 'prompt-engineering-for-developers', 'v1-building-with-ai'],
  nlp: ['leveraging-rag', 'how-large-language-models-work', 'the-reasoning-revolution', 'working-with-the-anthropic-api', 'prompt-engineering-for-developers', 'rag-systems-from-scratch', 'the-context-window-race', 'building-with-ai', 'agents', 'ai-command-center', 'storytelling-with-ai', 'ai-and-the-writer-s-voice', 'the-alignment-problem'],
  vision: ['image-generation-models', 'ai-for-graphic-design', 'photography-and-ai', 'ai-in-game-design-i', 'ai-and-architecture', 'performing-arts-and-ai', 'agents', 'building-with-ai'],
  ethics: ['ethics', 'ai-ethics', 'ai-bias-and-fairness', 'the-alignment-problem', 'ai-safety-and-alignment', 'ai-governance', 'ai-in-society', 'ai-misinformation', 'ai-and-education', 'ai-consciousness-and-philosophy', 'ai-and-media'],
  robotics: ['agents', 'building-ai-agents-i-use-cases', 'building-ai-agents-ii-skills', 'building-ai-agents-iii-tools', 'ai-autonomous-systems', 'ai-agents-in-the-wild', 'building-agentic-pipelines', 'ai-command-center', 'building-agents-vertex-ai'],
  business: ['building-with-ai', 'ai-for-marketing-and-growth', 'ai-tools-for-solo-founders', 'building-an-ai-first-business', 'ai-risk-for-business-leaders', 'ai-for-small-business-managers', 'ai-for-product-development', 'funding-and-pitching-ai-ventures', 'brainstorming-with-ai', 'ai-leadership', 'ai-work-and-automation-realities', 'v1-building-with-ai'],
  creative: ['brainstorming-with-ai', 'ai-and-creativity', 'storytelling-with-ai', 'ai-and-the-writer-s-voice', 'ai-for-graphic-design', 'performing-arts-and-ai', 'photography-and-ai', 'ai-in-game-design-i', 'ai-and-architecture', 'image-generation-models', 'agents'],
  data: ['leveraging-rag', 'rag-systems-from-scratch', 'model-evaluation-and-benchmarks', 'synthetic-data-and-self-improvement', 'evaluation-and-testing-for-ai', 'vertex-ai-data-agents', 'building-with-ai', 'building-agentic-pipelines', 'ai-in-science', 'deploying-and-monitoring-ai'],
  security: ['ai-security-and-red-teaming', 'security-auditing-ai-generated-code', 'ai-code-review-fundamentals', 'code-audit-workflows-team-standards', 'ai-and-national-security', 'ethics', 'evaluation-and-testing-for-ai', 'building-agentic-pipelines', 'ai-command-center'],
  policy: ['ai-governance', 'ai-ethics', 'ethics', 'ai-in-society', 'ai-and-national-security', 'the-alignment-problem', 'ai-safety-and-alignment', 'ai-risk-for-business-leaders', 'ai-consciousness-and-philosophy'],
  automation: ['building-agentic-pipelines', 'building-ai-agents-i-use-cases', 'building-ai-agents-ii-skills', 'building-ai-agents-iii-tools', 'building-ai-agents-iv-openclaw', 'building-ai-agents-v-optimization', 'ai-command-center', 'agents', 'deploying-and-monitoring-ai', 'building-agents-vertex-ai', 'vertex-ai-data-agents'],
  tools: ['gpt-vs-claude-vs-gemini', 'running-models-locally', 'working-with-the-anthropic-api', 'ai-tools-for-solo-founders', 'conversational-ai-chatbots', 'ai-command-center', 'building-with-ai', 'prompt-engineering-for-developers', 'agents'],
  careers: ['ai-and-the-future-of-work', 'ai-careers-and-research', 'ai-work-and-automation-realities', 'ai-job-market-impact', 'future-of-work-ai', 'ai-leadership', 'building-with-ai', 'ethics', 'brainstorming-with-ai'],
  society: ['ai-in-society', 'ai-bias-and-fairness', 'ai-and-education', 'ai-and-climate', 'ai-and-media', 'ai-misinformation', 'ai-social-media', 'ai-and-the-future-of-work', 'ai-and-finance', 'ai-in-healthcare', 'ai-and-national-security', 'ethics', 'ai-and-the-writer-s-voice', 'ai-psychology-and-behavior'],
};

export const PREREQUISITES = {
  'leveraging-rag': ['building-with-ai'],
  'building-agentic-pipelines': ['agents', 'building-with-ai'],
  'ai-command-center': ['agents', 'building-with-ai'],
  'building-ai-agents-ii-skills': ['building-ai-agents-i-use-cases'],
  'building-ai-agents-iii-tools': ['building-ai-agents-ii-skills'],
  'building-ai-agents-iv-openclaw': ['building-ai-agents-iii-tools'],
  'building-ai-agents-v-optimization': ['building-ai-agents-iv-openclaw'],
  'rag-systems-from-scratch': ['prompt-engineering-for-developers'],
  'deploying-and-monitoring-ai': ['applied-ai-development'],
  'working-with-the-anthropic-api': ['prompt-engineering-for-developers'],
  'evaluation-and-testing-for-ai': ['applied-ai-development'],
  'security-auditing-ai-generated-code': ['ai-code-review-fundamentals', 'ai-security-and-red-teaming'],
  'code-audit-workflows-team-standards': ['ai-code-review-fundamentals'],
  'building-agents-vertex-ai': ['building-ai-agents-i-use-cases'],
  'vertex-ai-data-agents': ['building-agents-vertex-ai'],
};

export const BAND_DIFFICULTY = {
  beginner: ['beginner', 'intermediate'],
  aware: ['beginner', 'intermediate'],
  intermediate: ['intermediate', 'advanced'],
  advanced: ['intermediate', 'advanced'],
};

export function getCourse(id) {
  return COURSE_CATALOGUE.find(function(c) { return c.id === id; });
}

export function getCoursesByDifficulty(difficulty) {
  return COURSE_CATALOGUE.filter(function(c) { return c.difficulty === difficulty; });
}
