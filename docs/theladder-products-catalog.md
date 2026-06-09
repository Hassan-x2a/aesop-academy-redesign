# The Ladder Products Catalog

Last researched: 2026-06-09

Purpose: curriculum backbone for a future `/theladder-products` page. The product track teaches learners how to use the AI products they are most likely to meet at work, school, and in public life.

## Selection Method

There is no single public source that can honestly prove the "250 most used products with AI" across consumer apps, enterprise suites, developer tools, infrastructure, healthcare, legal, security, education, and creative work. This catalog uses a weighted selection method:

- Consumer usage signal: products appearing in high-traffic and high-mobile-use AI app lists, especially a16z's Top 100 Gen AI Consumer Apps.
- Enterprise adoption signal: tools named in workplace AI adoption surveys and business spending/adoption reports.
- Ecosystem importance: products that are common integration targets or infrastructure layers for RAG, agents, analytics, and AI application development.
- Curriculum value: products that represent an important product type learners need to understand, even when usage is split across many similar vendors.

Course depth:

- `B`: beginner course only.
- `B/I`: beginner and intermediate.
- `B/I/A`: beginner, intermediate, and advanced.

## Research Sources

- a16z, [The Top 100 Gen AI Consumer Apps - 6th Edition](https://a16z.com/100-gen-ai-apps-6/)
- Ramp, [AI Index April 2026 update](https://ramp.com/leading-indicators/april-2026-ai-index)
- Wharton Human-AI Research and GBK Collective, [2025 AI Adoption Report](https://ai.wharton.upenn.edu/wp-content/uploads/2025/10/2025-Wharton-GBK-AI-Adoption-Report_Full-Report.pdf)
- OpenAI, [The state of enterprise AI 2025 report](https://openai.com/business/guides-and-resources/the-state-of-enterprise-ai-2025-report/)
- World Bank, [Who on Earth Is Using Generative AI? Global Trends and Shifts in 2025](https://documents1.worldbank.org/curated/en/099856110152535288/pdf/IDU-42736e6b-48fb-45e6-8638-cec68a650f40.pdf)
- Similarweb/Semrush-derived public rankings, used only as directional traffic signals where primary usage data is unavailable.

## Curriculum Categories

The 250 products are separated into these curriculum blocks:

| Rows | Curriculum Block | Count |
|---:|---|---:|
| 1-20 | General AI assistants and answer engines | 20 |
| 21-35 | Workplace productivity, writing, and project tools | 15 |
| 36-61 | Coding, app building, and developer tools | 26 |
| 62-82 | Search, research, knowledge, and RAG applications/frameworks | 21 |
| 83-107 | Databases, vector stores, and managed RAG infrastructure | 25 |
| 108-126 | Data analysis, BI, analytics, and ML platforms | 19 |
| 127-146 | Image, design, and presentation tools | 20 |
| 147-166 | Video, audio, voice, and meeting tools | 20 |
| 167-191 | Go-to-market, CRM, marketing, and customer support | 25 |
| 192-210 | Automation, agents, and workflow builders | 19 |
| 211-230 | Model APIs, cloud AI platforms, and inference infrastructure | 20 |
| 231-250 | Regulated and vertical AI: legal, health, finance, security | 20 |

| # | Product | Product Type | Why It Belongs | Course Depth |
|---:|---|---|---|---|
| 1 | ChatGPT | General AI assistant | Largest mainstream AI assistant and a core reference product for prompting, files, images, voice, agents, and analysis. | B/I/A |
| 2 | Claude | General AI assistant | Major workplace assistant, strong in writing, analysis, long context, coding, and enterprise workflows. | B/I/A |
| 3 | Google Gemini | General AI assistant | Deeply distributed through Google Search, Android, Workspace, and cloud products. | B/I/A |
| 4 | Microsoft Copilot | General AI assistant | Broad default AI entry point across Windows, Edge, Bing, and Microsoft accounts. | B/I/A |
| 5 | Perplexity | Answer engine | Popular AI search and citation workflow; useful for research literacy and verification. | B/I/A |
| 6 | Meta AI | General AI assistant | Embedded across Facebook, Instagram, WhatsApp, and Messenger, creating massive casual usage. | B/I |
| 7 | Grok | General AI assistant | Important X-native assistant with real-time social context and developer ecosystem relevance. | B/I |
| 8 | DeepSeek | General AI assistant | High-usage global assistant and model ecosystem, important for cost, open-weight, and reasoning comparisons. | B/I/A |
| 9 | Poe | Multi-model assistant | Teaches model comparison, bot marketplaces, and user-facing multi-model routing. | B/I |
| 10 | Character.AI | Companion/chat product | One of the defining consumer AI companion products and roleplay/chat pattern references. | B/I |
| 11 | Pi | Personal AI assistant | Important conversational coaching and supportive-assistant pattern. | B |
| 12 | You.com | AI search assistant | Search, chat, and research product with a long-running AI search footprint. | B/I |
| 13 | Phind | Developer search assistant | Strong developer search and answer workflow for technical troubleshooting. | B/I |
| 14 | Kimi | General AI assistant | Widely used Chinese-market assistant known for long-context document work. | B/I |
| 15 | Doubao | General AI assistant | ByteDance assistant with major China-market consumer adoption. | B/I |
| 16 | Qwen Chat | General AI assistant | Alibaba model app and ecosystem entry point for global open-model literacy. | B/I |
| 17 | Le Chat by Mistral | General AI assistant | European AI assistant tied to Mistral's model ecosystem and enterprise positioning. | B/I |
| 18 | HuggingChat | Open model assistant | Teaches open-model assistants, community models, and Hugging Face workflows. | B/I |
| 19 | Luzia | WhatsApp AI assistant | Large messaging-native assistant, useful for teaching mobile and chat-distributed AI. | B |
| 20 | Genspark | Agentic search assistant | Popular agentic research/search product and bridge to autonomous task workflows. | B/I |
| 21 | Microsoft 365 Copilot | Office productivity suite | The most important enterprise AI suite for Word, Excel, PowerPoint, Outlook, and Teams. | B/I/A |
| 22 | Gemini for Google Workspace | Office productivity suite | Core AI layer for Docs, Sheets, Slides, Gmail, Meet, and Drive. | B/I/A |
| 23 | Notion AI | Workspace/document assistant | Common knowledge-work AI product for notes, docs, databases, and team wikis. | B/I |
| 24 | Grammarly | Writing assistant | One of the most-used AI writing and communication products. | B/I |
| 25 | QuillBot | Writing and paraphrasing assistant | High-usage student and professional writing tool for paraphrase, grammar, and summarization. | B |
| 26 | Wordtune | Writing assistant | Useful for tone, rewrite, and workplace communication instruction. | B |
| 27 | Jasper | Marketing writing platform | Mature AI writing platform for brand voice, campaigns, and content teams. | B/I |
| 28 | Copy.ai | Marketing writing and workflow platform | Teaches GTM workflows, content generation, and sales/marketing automation patterns. | B/I |
| 29 | Writesonic | Content and SEO writing platform | Popular marketing copy, blog, and SEO generation tool. | B/I |
| 30 | Writer | Enterprise writing platform | Enterprise-grade writing, governance, brand voice, and custom AI apps. | B/I/A |
| 31 | Sudowrite | Creative writing assistant | Important fiction and creative writing AI product. | B/I |
| 32 | Coda AI | Docs and team workspace | Shows AI inside collaborative docs, tables, and lightweight apps. | B/I |
| 33 | ClickUp Brain | Project management AI | Common project-management AI for tasks, summaries, and team knowledge. | B/I |
| 34 | Asana Intelligence | Project management AI | Teaches AI for project planning, status, risk, and team coordination. | B/I |
| 35 | Zoom AI Companion | Meeting and collaboration assistant | Common AI meeting assistant for summaries, chat, and follow-up workflows. | B/I |
| 36 | GitHub Copilot | Coding assistant | Default AI coding product for many developers and organizations. | B/I/A |
| 37 | Cursor | AI code editor | Leading AI-native IDE for codebase chat, edits, agents, and software workflows. | B/I/A |
| 38 | Windsurf | AI code editor | Popular agentic coding IDE and representative of AI-native developer environments. | B/I/A |
| 39 | Claude Code | Agentic coding tool | Fast-growing terminal coding agent with strong enterprise adoption signal. | B/I/A |
| 40 | OpenAI Codex | Coding agent | Important OpenAI coding-agent product pattern for task delegation and repository work. | B/I/A |
| 41 | Replit Agent | App builder/coding agent | Popular browser-based build environment for learners and rapid prototypes. | B/I/A |
| 42 | Bolt.new | App builder | High-usage prompt-to-app builder for web apps and prototypes. | B/I |
| 43 | Lovable | App builder | Popular text-to-app product for no-code and low-code AI product creation. | B/I |
| 44 | v0 by Vercel | UI/app generator | Important frontend generation product tied to React and Vercel workflows. | B/I |
| 45 | Devin | Autonomous software engineering agent | Representative of autonomous coding-agent workflows and review practices. | B/I/A |
| 46 | Sourcegraph Cody | Codebase assistant | Enterprise code search, understanding, and codebase chat. | B/I |
| 47 | Amazon Q Developer | Coding and cloud assistant | Major AWS coding and cloud development AI product. | B/I/A |
| 48 | JetBrains AI Assistant | IDE assistant | Important for IntelliJ, PyCharm, WebStorm, and JetBrains-heavy teams. | B/I |
| 49 | Tabnine | Coding assistant | Long-running enterprise coding assistant with privacy and deployment options. | B/I |
| 50 | Qodo | Code quality assistant | Test generation, code review, and quality-focused AI workflow. | B/I |
| 51 | CodeRabbit | AI code review | Common pull-request review assistant for engineering teams. | B/I |
| 52 | Continue | Open-source coding assistant | Teaches local/open model coding workflows inside IDEs. | B/I/A |
| 53 | Aider | Terminal coding assistant | Important command-line pair-programming workflow for Git-based changes. | B/I/A |
| 54 | Blackbox AI | Coding assistant | Popular developer assistant for code search, generation, and chat. | B/I |
| 55 | Pieces | Developer memory assistant | Teaches personal code snippets, context, and developer knowledge management. | B/I |
| 56 | Augment Code | Codebase assistant | Enterprise codebase understanding and agentic development workflow. | B/I/A |
| 57 | Zed AI | AI-native code editor | Important modern editor with integrated assistant workflows. | B/I |
| 58 | Codeium Enterprise | Coding assistant | Enterprise coding assistant lineage and deployment model. | B/I |
| 59 | CodiumAI Cover-Agent | Test generation tool | Useful for teaching AI-assisted test generation and quality gates. | B/I |
| 60 | Mutable.ai | Code intelligence tool | Documentation, codebase understanding, and engineering knowledge workflows. | B/I |
| 61 | CodePen AI | Frontend coding assistant | Useful learner-facing sandbox for frontend prototyping. | B |
| 62 | NotebookLM | Research and study assistant | Widely used document-grounded learning and briefing product. | B/I/A |
| 63 | Elicit | Research assistant | Literature review, paper discovery, and evidence extraction workflow. | B/I |
| 64 | Consensus | Research answer engine | Scientific consensus search and citation-backed answer workflow. | B/I |
| 65 | Scite | Research citation assistant | Citation context, smart citations, and evidence evaluation. | B/I |
| 66 | Semantic Scholar | Scholarly search | AI-assisted academic discovery and paper recommendation. | B/I |
| 67 | ResearchRabbit | Research discovery | Visual paper discovery, author networks, and literature mapping. | B/I |
| 68 | Connected Papers | Research graph tool | Teaches citation graph exploration and literature navigation. | B/I |
| 69 | Glean | Enterprise search and knowledge assistant | Major workplace search and knowledge assistant across enterprise sources. | B/I/A |
| 70 | Hebbia | Enterprise knowledge/research platform | High-value enterprise document analysis and financial/legal research workflows. | B/I/A |
| 71 | Sana | Enterprise knowledge and learning platform | Knowledge assistant, internal learning, and enterprise AI search. | B/I |
| 72 | Guru | Knowledge management AI | Team knowledge base with AI answers and verification workflows. | B/I |
| 73 | Coveo | AI enterprise search | Search relevance, recommendations, and support/content retrieval. | B/I |
| 74 | Algolia NeuralSearch | Search/RAG product | Teaches semantic search in ecommerce and product discovery. | B/I |
| 75 | Elastic AI Search | Search/RAG product | Enterprise search, vector search, hybrid retrieval, and observability-adjacent use. | B/I/A |
| 76 | Pinecone Assistant | RAG application layer | Teaches managed retrieval, file grounding, and assistant construction. | B/I |
| 77 | Vectara | RAG platform | Retrieval-augmented generation, grounded answers, and hallucination controls. | B/I/A |
| 78 | Onyx | Open-source workplace search | Open-source enterprise search and RAG for internal tools. | B/I/A |
| 79 | Kagi Assistant | AI search assistant | Paid search plus assistant workflow for research and synthesis. | B/I |
| 80 | Exa | Web search API | Neural web search for AI agents and retrieval products. | B/I/A |
| 81 | LlamaIndex | RAG framework | Core framework for connecting data, indexes, retrieval, and agents. | B/I/A |
| 82 | LangChain | AI app framework | Major framework for chains, tools, agents, memory, and RAG patterns. | B/I/A |
| 83 | Pinecone | Vector database | Major managed vector database for production RAG. | B/I/A |
| 84 | Weaviate | Vector database | Popular open-source and managed vector database with hybrid search. | B/I/A |
| 85 | Milvus | Vector database | Major open-source vector database, often used at scale. | B/I/A |
| 86 | Zilliz Cloud | Managed vector database | Commercial managed Milvus ecosystem. | B/I/A |
| 87 | Qdrant | Vector database | Developer-friendly vector database for semantic search and RAG. | B/I/A |
| 88 | Chroma | Vector database | Common local and prototyping vector store for RAG learners. | B/I |
| 89 | pgvector | Postgres vector extension | Practical default for teams already using PostgreSQL. | B/I/A |
| 90 | Redis Vector Search | Vector search database | Common cache plus vector search option in production stacks. | B/I |
| 91 | Elasticsearch Vector Search | Search/vector platform | Hybrid search, dense vectors, and enterprise search workloads. | B/I/A |
| 92 | OpenSearch Vector Engine | Search/vector platform | Open-source search plus vector capabilities, often AWS-aligned. | B/I/A |
| 93 | MongoDB Atlas Vector Search | Document database vector search | Common for app teams using MongoDB and RAG over JSON documents. | B/I/A |
| 94 | Azure AI Search | Search/RAG platform | Enterprise search and RAG backbone for Microsoft cloud deployments. | B/I/A |
| 95 | Vertex AI Vector Search | Vector search platform | Google Cloud vector search for production AI applications. | B/I/A |
| 96 | Amazon Bedrock Knowledge Bases | Managed RAG platform | AWS-native RAG pipeline and retrieval orchestration. | B/I/A |
| 97 | Snowflake Cortex Search | Enterprise search/RAG | Search and retrieval over enterprise data in Snowflake. | B/I/A |
| 98 | Databricks Vector Search | Lakehouse vector search | Retrieval over lakehouse data and ML workflows. | B/I/A |
| 99 | Neo4j Vector Index | Graph/vector retrieval | GraphRAG and hybrid relationship-aware retrieval. | B/I/A |
| 100 | DataStax Astra DB | Vector database | Cassandra-backed vector search and RAG app backend. | B/I |
| 101 | SingleStore Kai | Vector/data platform | Fast SQL, vector search, and transactions for AI apps. | B/I |
| 102 | LanceDB | Vector database | Embedding and multimodal vector storage using Lance format. | B/I/A |
| 103 | FAISS | Vector search library | Foundational local vector indexing library for search education. | B/I/A |
| 104 | Vespa | Search and recommendation engine | Large-scale vector, text, recommendation, and ranking engine. | B/I/A |
| 105 | Turbopuffer | Vector search service | High-scale vector search infrastructure for AI applications. | B/I/A |
| 106 | Supabase Vector | Postgres vector platform | Accessible vector/RAG workflow for web app builders. | B/I |
| 107 | Marqo | Vector search engine | Multimodal search and recommendation engine. | B/I |
| 108 | ChatGPT Advanced Data Analysis | Data analysis assistant | Common spreadsheet, charting, Python, and statistical analysis workflow. | B/I/A |
| 109 | Claude data analysis | Data analysis assistant | Strong document, spreadsheet, and artifact-based analysis workflows. | B/I/A |
| 110 | Gemini in BigQuery | Data warehouse AI | Google data analytics assistant and SQL/data workflow. | B/I/A |
| 111 | Microsoft Copilot in Power BI | BI assistant | Natural language BI, dashboard generation, and data explanation. | B/I/A |
| 112 | Tableau Pulse | BI assistant | Business metric summaries, insight surfacing, and analytics workflows. | B/I |
| 113 | ThoughtSpot Spotter | BI assistant | Search-driven analytics and natural language data exploration. | B/I |
| 114 | Looker with Gemini | BI assistant | Google Cloud BI AI workflows and semantic model querying. | B/I |
| 115 | Databricks Assistant | Data/AI engineering assistant | SQL, notebooks, lakehouse engineering, and analytics support. | B/I/A |
| 116 | Snowflake Cortex Analyst | Data assistant | Natural language analytics over governed enterprise data. | B/I/A |
| 117 | Hex Magic | Data notebook assistant | Collaborative analytics notebooks with AI code, SQL, and charting. | B/I |
| 118 | Mode AI | Analytics assistant | BI and SQL analytics assistant for business teams. | B/I |
| 119 | Julius AI | Data analysis assistant | Popular consumer/professional data analysis tool for files and charts. | B/I |
| 120 | Akkio | No-code analytics/ML | Predictive analytics and business data workflows for nontechnical users. | B/I |
| 121 | Obviously AI | No-code ML | Predictive analytics and no-code model building for business users. | B/I |
| 122 | DataRobot | Enterprise AI/ML platform | Mature enterprise AutoML, predictive AI, and governance. | B/I/A |
| 123 | H2O.ai | AI/ML platform | Open and enterprise ML, AutoML, and predictive modeling. | B/I/A |
| 124 | Dataiku | Enterprise AI platform | Enterprise analytics, ML, GenAI apps, and governed workflows. | B/I/A |
| 125 | Alteryx AiDIN | Analytics automation | Analytics automation, data prep, and AI-assisted workflows. | B/I |
| 126 | KNIME AI | Analytics workflow platform | Visual analytics, data science workflows, and AI extensions. | B/I |
| 127 | Canva Magic Studio | Design platform | Mass-market AI design, presentation, image, and marketing workflow. | B/I/A |
| 128 | Adobe Firefly | Creative generation platform | Major commercial creative AI family across Adobe products. | B/I/A |
| 129 | Photoshop Generative Fill | Image editing AI | Mainstream professional image editing workflow with generative AI. | B/I |
| 130 | Illustrator generative AI | Vector/design AI | Important for vector design, brand work, and commercial illustration. | B/I |
| 131 | Midjourney | Image generation | Defining image generation product with strong creative community usage. | B/I/A |
| 132 | ChatGPT Images | Image generation | Mainstream image generation inside the largest assistant workflow. | B/I |
| 133 | DreamStudio | Image generation | Stability AI product for Stable Diffusion workflows. | B/I |
| 134 | Leonardo AI | Image/design generation | Popular creative generation product integrated into Canva ecosystem. | B/I |
| 135 | Ideogram | Image/text generation | Strong for image generation with typography and design layouts. | B/I |
| 136 | Freepik AI | Design asset generation | Widely used stock/design asset platform with AI generation. | B/I |
| 137 | Krea | Real-time creative generation | Image generation, enhancement, and real-time creative workflows. | B/I |
| 138 | Recraft | Brand/design generation | Vector, icon, illustration, and brand-oriented generation. | B/I |
| 139 | Photoroom | Product photo editing | Popular ecommerce and marketplace image editing workflow. | B/I |
| 140 | remove.bg | Background removal | Common AI image utility used by non-designers and ecommerce teams. | B |
| 141 | Picsart AI | Consumer design/editing | Large consumer creative editing platform with AI tools. | B/I |
| 142 | Clipdrop | Image editing utilities | Useful suite for cleanup, relight, upscale, and generative fill. | B |
| 143 | Magnific | Image upscaling/enhancement | Known creative upscaling and enhancement workflow. | B/I |
| 144 | Topaz Photo AI | Photo enhancement | Professional photo denoise, sharpen, and upscale workflow. | B/I |
| 145 | Microsoft Designer | Design generation | Mainstream design generator connected to Microsoft accounts and Copilot. | B |
| 146 | Gamma | Presentation generation | Popular AI presentation and web doc generation product. | B/I |
| 147 | Runway | Video generation/editing | Leading AI video creation and editing product. | B/I/A |
| 148 | Sora | Video generation | Important OpenAI video generation product and cultural reference point. | B/I |
| 149 | Pika | Video generation | Popular consumer/prosumer AI video generation tool. | B/I |
| 150 | Luma Dream Machine | Video generation | Important AI video and 3D-adjacent generation product. | B/I |
| 151 | Kling | Video generation | High-profile AI video product with global adoption signal. | B/I |
| 152 | Hailuo AI | Video generation | MiniMax video generation product with strong consumer interest. | B/I |
| 153 | Google Veo | Video generation | Major Google video generation model/product line. | B/I |
| 154 | Synthesia | AI video avatars | Enterprise training, enablement, and avatar video generation. | B/I |
| 155 | HeyGen | AI video avatars | Popular avatar, translation, and marketing video product. | B/I |
| 156 | Descript | Audio/video editing | Transcript-first editing, overdub, clips, and podcast/video workflow. | B/I/A |
| 157 | CapCut | Video editing | Mass-market video editing product with AI-assisted creation. | B/I |
| 158 | OpusClip | Short-form video repurposing | Popular AI clipping and social video workflow. | B/I |
| 159 | ElevenLabs | Voice generation | Leading voice synthesis, dubbing, and audio generation platform. | B/I/A |
| 160 | Suno | Music generation | Popular consumer AI music generation product. | B/I |
| 161 | Udio | Music generation | Popular AI music generation product and rights discussion case. | B/I |
| 162 | Murf | Voice generation | Voiceover generation for business, training, and content. | B/I |
| 163 | Speechify | Text-to-speech | High-usage reading, accessibility, and voice product. | B/I |
| 164 | Otter.ai | Meeting transcription | Common meeting transcription and summary product. | B/I |
| 165 | Fireflies.ai | Meeting assistant | Popular meeting notes, summaries, and CRM follow-up workflow. | B/I |
| 166 | Fathom | Meeting assistant | Meeting recording, summary, and action item workflow. | B/I |
| 167 | HubSpot AI | CRM/marketing/sales AI | Common SMB CRM with AI content, sales, and support features. | B/I/A |
| 168 | Salesforce Einstein | CRM AI | Enterprise CRM AI for sales, service, marketing, and analytics. | B/I/A |
| 169 | Gong | Revenue intelligence | AI call analysis, coaching, pipeline, and revenue workflows. | B/I |
| 170 | Clari | Revenue forecasting | Pipeline inspection, forecasting, and revenue operations AI. | B/I |
| 171 | Apollo AI | Sales prospecting | Prospecting, enrichment, sequences, and sales automation. | B/I |
| 172 | Outreach Kaia | Sales engagement AI | Sales call assistant and sales workflow automation. | B/I |
| 173 | Salesloft Rhythm | Sales engagement AI | Sales engagement, prioritization, and forecasting AI. | B/I |
| 174 | 6sense Revenue AI | Account-based marketing AI | Intent data, predictive account selection, and ABM workflows. | B/I |
| 175 | Demandbase One | Account-based marketing AI | Enterprise ABM, intent, personalization, and advertising. | B/I |
| 176 | Drift | Conversational marketing | AI chat, qualification, and buyer engagement workflows. | B/I |
| 177 | Intercom Fin | Customer support AI | Widely used support chatbot and help-center answer product. | B/I |
| 178 | Zendesk AI | Customer support AI | Major support platform with AI triage, agent assist, and bots. | B/I/A |
| 179 | Freshdesk Freddy AI | Customer support AI | SMB and midmarket support AI for tickets and answers. | B/I |
| 180 | Ada | Customer support automation | AI customer service automation and bot workflows. | B/I |
| 181 | Forethought | Customer support AI | Support automation, triage, and knowledge retrieval. | B/I |
| 182 | Sierra | Customer service agent | High-profile AI customer service agent platform. | B/I |
| 183 | ServiceNow Now Assist | Enterprise service AI | ITSM, HR, customer service, and workflow AI. | B/I/A |
| 184 | Genesys Cloud AI | Contact center AI | Contact center routing, agent assist, and customer experience AI. | B/I |
| 185 | NICE Enlighten | Contact center AI | Enterprise contact center analytics and agent assist. | B/I |
| 186 | Mailchimp AI | Marketing automation AI | Email marketing, content, segmentation, and campaign support. | B/I |
| 187 | Klaviyo AI | Ecommerce marketing AI | Ecommerce email/SMS personalization and predictive marketing. | B/I |
| 188 | Hootsuite OwlyWriter AI | Social media AI | Social content generation and management workflow. | B |
| 189 | Semrush ContentShake AI | SEO/content AI | SEO content planning and drafting workflow. | B/I |
| 190 | Surfer SEO | SEO content AI | Search-optimized content planning and writing. | B/I |
| 191 | Clay | GTM data automation | Enrichment, prospecting, and AI research workflows for sales teams. | B/I/A |
| 192 | Zapier AI | Workflow automation AI | Mainstream no-code automation with AI actions and agents. | B/I/A |
| 193 | Make AI | Workflow automation AI | Visual automation and integration workflows with AI modules. | B/I |
| 194 | n8n | Workflow automation | Open-source automation and agent workflows. | B/I/A |
| 195 | Microsoft Copilot Studio | Agent/workflow builder | Enterprise agent creation and Microsoft ecosystem automation. | B/I/A |
| 196 | Google Agentspace | Enterprise agent/search platform | Google enterprise agents, search, and workplace AI direction. | B/I |
| 197 | Salesforce Agentforce | Enterprise agent platform | CRM-native agents for sales, service, marketing, and commerce. | B/I/A |
| 198 | UiPath Autopilot | RPA/automation AI | AI-assisted robotic process automation and workflow mining. | B/I/A |
| 199 | Automation Anywhere | RPA/automation AI | Enterprise process automation and AI agent workflows. | B/I |
| 200 | Workato | Integration automation AI | Enterprise integration, workflow automation, and AI actions. | B/I |
| 201 | Lindy | Personal/team AI agents | Popular agent builder for administrative and sales workflows. | B/I |
| 202 | Relevance AI | Agent builder | No-code/low-code agent teams and workflow automation. | B/I |
| 203 | CrewAI | Agent framework | Multi-agent orchestration framework for developer workflows. | B/I/A |
| 204 | LangGraph | Agent framework | Graph-based agent orchestration for production AI workflows. | B/I/A |
| 205 | Dust | Enterprise AI assistants | Internal assistants, knowledge integrations, and custom workflows. | B/I |
| 206 | Gumloop | Workflow automation AI | Visual AI automation for teams and operations. | B/I |
| 207 | Manus | General agent | Consumer/general autonomous task agent and agentic UX example. | B/I |
| 208 | Airtable AI | Work app/database AI | AI inside lightweight databases and operational apps. | B/I |
| 209 | Retool AI | Internal tools AI | AI features and agents for internal business software. | B/I/A |
| 210 | Voiceflow | Conversational agent builder | Chatbot and voice assistant design/build platform. | B/I |
| 211 | OpenAI API | Model/API platform | Core model API ecosystem for chat, agents, vision, audio, and embeddings. | B/I/A |
| 212 | Anthropic Claude API | Model/API platform | Major enterprise model API, long context, tool use, and coding workflows. | B/I/A |
| 213 | Google Vertex AI | Cloud AI platform | Google model hosting, Gemini APIs, agents, tuning, and MLOps. | B/I/A |
| 214 | Azure AI Foundry | Cloud AI platform | Microsoft enterprise AI app, model, agent, and governance platform. | B/I/A |
| 215 | Amazon Bedrock | Cloud AI platform | AWS managed model marketplace, agents, knowledge bases, and guardrails. | B/I/A |
| 216 | Cohere | Model/API platform | Enterprise LLMs, embeddings, reranking, and retrieval workflows. | B/I/A |
| 217 | Mistral AI API | Model/API platform | European model provider with open and commercial model offerings. | B/I/A |
| 218 | xAI API | Model/API platform | Grok model access and X-adjacent AI ecosystem. | B/I |
| 219 | DeepSeek API | Model/API platform | Low-cost reasoning/coding model ecosystem and open-model comparison. | B/I |
| 220 | Together AI | Model hosting/API platform | Open model inference, fine-tuning, and deployment platform. | B/I/A |
| 221 | Fireworks AI | Model serving/API platform | Fast inference and deployment for open models. | B/I/A |
| 222 | GroqCloud | Inference platform | High-speed inference platform and model API. | B/I |
| 223 | Hugging Face | Model hub/platform | Central open model, dataset, Spaces, and inference ecosystem. | B/I/A |
| 224 | Replicate | Model API platform | Hosted open-source model APIs and creative/model experimentation. | B/I |
| 225 | OpenRouter | Model routing API | Multi-model routing, comparison, and application fallback strategy. | B/I/A |
| 226 | Cerebras Inference | Inference platform | High-speed inference API and hardware-backed model serving. | B/I |
| 227 | Databricks Mosaic AI | Enterprise AI platform | Model serving, training, governance, and lakehouse AI. | B/I/A |
| 228 | IBM watsonx | Enterprise AI platform | Enterprise AI, governance, model deployment, and regulated workflows. | B/I/A |
| 229 | NVIDIA NIM | Model deployment platform | Enterprise model deployment and GPU-optimized inference microservices. | B/I/A |
| 230 | AI21 Labs | Model/API platform | Enterprise language models and writing/reading APIs. | B/I |
| 231 | Harvey | Legal AI | Leading legal AI assistant for law firms and legal teams. | B/I/A |
| 232 | CoCounsel | Legal AI | Legal research, document review, and professional legal workflow. | B/I/A |
| 233 | Lexis+ AI | Legal research AI | Mainstream legal research and drafting AI in LexisNexis ecosystem. | B/I/A |
| 234 | Westlaw Precision AI | Legal research AI | Thomson Reuters legal research and drafting AI workflow. | B/I/A |
| 235 | Ironclad AI | Contract lifecycle AI | Contract review, clause analysis, and legal operations. | B/I |
| 236 | Abridge | Healthcare documentation AI | Clinical note generation and ambient medical documentation. | B/I/A |
| 237 | Nabla | Healthcare documentation AI | Ambient clinical assistant and note automation. | B/I |
| 238 | Nuance DAX Copilot | Healthcare documentation AI | Microsoft/Nuance ambient clinical documentation product. | B/I/A |
| 239 | Ambience Healthcare | Healthcare documentation AI | Clinical AI operating system and documentation workflows. | B/I |
| 240 | Suki | Healthcare assistant | Physician documentation and workflow assistant. | B/I |
| 241 | AlphaSense | Market intelligence AI | Enterprise research, earnings, filings, and market intelligence. | B/I/A |
| 242 | Bloomberg Terminal AI | Finance AI | Financial research, news, and market intelligence AI workflows. | B/I/A |
| 243 | Ramp Intelligence | Finance operations AI | Spend management, policy automation, procurement, and finance operations AI. | B/I |
| 244 | Brex AI | Finance operations AI | Corporate card, expense, travel, and spend management AI. | B/I |
| 245 | Microsoft Security Copilot | Security AI | Enterprise security investigation, summarization, and response. | B/I/A |
| 246 | CrowdStrike Charlotte AI | Security AI | Security operations and endpoint threat investigation assistant. | B/I/A |
| 247 | SentinelOne Purple AI | Security AI | Security analysis, hunting, and SOC assistance. | B/I/A |
| 248 | Darktrace | Cybersecurity AI | Network detection, response, and security analytics AI. | B/I |
| 249 | Vectra AI | Cybersecurity AI | Network detection and response using AI-driven threat analysis. | B/I |
| 250 | Snyk AI | Developer security AI | AI-assisted code security, dependency, and vulnerability workflows. | B/I |

## Page Design Notes for `/theladder-products`

- The page should not copy the 15-tier Ladder. It should be a catalog pathway: category rail, product cards, and course depth filters.
- A learner should be able to start with a product they already use, then branch into concept courses that explain what is happening underneath.
- Product courses should use the same assignment-lab pattern as the Ladder: every course includes a debate, skill drill, or build task.
- `B/I/A` products should become three separate course nodes. `B/I` products should become two nodes. `B` products should remain single orientation courses.
- The catalog should support updates because product adoption changes quickly.

## Initial Build Recommendation

Start `/theladder-products` with these filters:

- Product type
- Beginner/intermediate/advanced
- Consumer, workplace, developer, enterprise, regulated
- Free/paid/enterprise
- Uses files, uses web, uses images, uses voice/video, uses databases, uses agents
- Requires account, requires payment, requires business approval

First release should expose all 250 products as cards, but only fully write the first 25 course outlines. The rest can be marked "planned" until the course scaffold is generated.
