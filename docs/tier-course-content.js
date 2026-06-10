/**
 * Tier Course Content Framework
 *
 * Each tier has chapters covering vocabulary topics.
 * Examiner references this content when creating certification challenges.
 */

const tierCourseContent = {
  T01: {
    id: 'T01',
    title: 'AI Orientation',
    description: 'Foundational understanding of artificial intelligence: what it is, how it works, and common applications.',
    chapters: [
      {
        id: 'T01-C01',
        title: 'What is Artificial Intelligence?',
        vocabulary: ['artificial intelligence', 'machine learning', 'generative AI'],
        description: 'AI is technology that performs tasks that typically require human intelligence. It includes machine learning (learning from data) and generative AI (creating new content). Understand the distinction between these categories and what makes something "AI" vs. traditional software.',
        learningObjectives: [
          'Define artificial intelligence and distinguish it from traditional automation',
          'Understand the difference between narrow AI (task-specific) and general approaches',
          'Recognize machine learning as a subset of AI that learns from data'
        ],
        keyPoints: [
          'AI systems learn patterns from data rather than following pre-programmed rules',
          'Generative AI can create new content (text, images, code) based on training',
          'Not all automation is AI; rule-based systems are not AI'
        ]
      },
      {
        id: 'T01-C02',
        title: 'Models, Chatbots, and Assistants',
        vocabulary: ['model', 'chatbot', 'assistant'],
        description: 'An AI model is a trained system that makes predictions or generates output. Chatbots and assistants are applications of AI models designed for conversation and task support. Understand how models are created, what makes them useful, and their limitations.',
        learningObjectives: [
          'Understand what an AI model is and how it differs from a program',
          'Explain the role of chatbots and assistants in business and personal use',
          'Recognize limitations and appropriate use cases for each type'
        ],
        keyPoints: [
          'Models are created through training on large datasets',
          'Chatbots respond to user input; assistants actively help with tasks',
          'Each model has specific training and cannot know about events after training'
        ]
      },
      {
        id: 'T01-C03',
        title: 'Prompts, Responses, and Context',
        vocabulary: ['prompt', 'response', 'context'],
        description: 'A prompt is an instruction or question you give to an AI system. The response is what it generates. Context includes previous conversation, system instructions, and relevant background. Learn how to craft effective prompts and understand why context matters.',
        learningObjectives: [
          'Write clear, specific prompts that guide AI output',
          'Understand how previous conversation (context) influences responses',
          'Recognize when more or different context improves results'
        ],
        keyPoints: [
          'Detailed prompts usually produce better results than vague ones',
          'Context from earlier in conversation carries forward',
          'AI systems do not remember conversations between sessions unless you provide history'
        ]
      },
      {
        id: 'T01-C04',
        title: 'Training Data, Tokens, and Inference',
        vocabulary: ['training data', 'token', 'inference'],
        description: 'Training data is the material used to teach an AI model. Tokens are the small units (words, parts of words) that models process. Inference is the process of using a trained model to generate output. Understand these mechanics without needing deep technical knowledge.',
        learningObjectives: [
          'Explain what training data is and why its quality matters',
          'Understand tokens as the basic units of AI processing',
          'Define inference as the act of asking a model for output'
        ],
        keyPoints: [
          'Models cannot learn from data they were not trained on',
          'Tokens limit how much context a model can consider at once',
          'Inference is fast; training is slow and expensive'
        ]
      },
      {
        id: 'T01-C05',
        title: 'Hallucinations and Common Misconceptions',
        vocabulary: ['hallucination'],
        description: 'AI systems sometimes generate false or invented information while sounding confident. This is called "hallucination." Learn why it happens, how to detect it, and strategies to reduce it.',
        learningObjectives: [
          'Recognize that AI can confidently state false information',
          'Explain why hallucination occurs in generative AI',
          'Identify techniques to verify AI output and reduce hallucination risk'
        ],
        keyPoints: [
          'AI finds patterns in data but does not "know" truth',
          'Hallucinations are a known limitation, not a bug to be "fixed"',
          'Always verify factual claims from AI with authoritative sources'
        ]
      },
      {
        id: 'T01-C06',
        title: 'Multimodal AI and Privacy',
        vocabulary: ['multimodal', 'privacy'],
        description: 'Multimodal AI processes multiple types of input (text, images, audio) together. Privacy concerns arise when AI is trained on or given access to sensitive data. Understand what these mean for organizations and individuals.',
        learningObjectives: [
          'Describe multimodal AI and its applications',
          'Identify privacy risks when using AI with sensitive data',
          'Understand data retention and compliance implications'
        ],
        keyPoints: [
          'Multimodal models can connect concepts across different data types',
          'Data sent to AI systems may be retained for improvement or auditing',
          'Private customer data should not be sent to public AI systems without consideration'
        ]
      }
    ],
    assessmentRubric: {
      dimension1: 'Conceptual accuracy of AI fundamentals (what AI is and is not)',
      dimension2: 'Vocabulary fluency (correct use of AI terminology)',
      dimension3: 'Practical judgment (recognizing appropriate AI use and limitations)',
      dimension4: 'Risk awareness (understanding hallucinations, privacy, reliability)'
    }
  },

  T02: {
    id: 'T02',
    title: 'Prompting Mastery',
    description: 'Advanced techniques for prompt engineering: designing prompts that consistently produce better, more reliable output.',
    chapters: [
      {
        id: 'T02-C01',
        title: 'Prompt Structure and Clarity',
        vocabulary: ['system prompt', 'user prompt', 'instruction', 'constraint'],
        description: 'System prompts set the AI\'s role and behavior. User prompts are instructions from you. Learn how to structure both for clarity, specificity, and consistent results.',
        learningObjectives: [
          'Distinguish between system prompts (behavior) and user prompts (instructions)',
          'Write clear instructions with explicit constraints',
          'Test and refine prompts for reproducibility'
        ],
        keyPoints: [
          'System prompts define the AI\'s character and rules',
          'Constraints (length, format, style) shape output quality',
          'Ambiguous prompts produce inconsistent results'
        ]
      },
      {
        id: 'T02-C02',
        title: 'Role Prompts, Examples, and Few-Shot Learning',
        vocabulary: ['role prompt', 'example', 'few-shot'],
        description: 'Role prompts assign the AI a specific persona. Examples show what you want. Few-shot learning means providing examples to demonstrate patterns. These techniques dramatically improve output quality.',
        learningObjectives: [
          'Use role prompts to guide behavior and expertise level',
          'Provide effective examples that clarify expectations',
          'Design few-shot prompts that demonstrate patterns'
        ],
        keyPoints: [
          'Role prompts like "You are a technical writer" shape the style and depth',
          'Examples are more powerful than abstract instructions',
          'Three to five good examples usually suffice for pattern learning'
        ]
      },
      {
        id: 'T02-C03',
        title: 'Output Format and Tone Control',
        vocabulary: ['output format', 'tone', 'persona'],
        description: 'Specify exactly how you want output formatted (JSON, markdown, plain text). Control tone (professional, casual, technical). Use persona descriptions to guide voice and style.',
        learningObjectives: [
          'Specify output format and structure for downstream processing',
          'Control tone and voice through explicit instruction',
          'Use persona to manage complexity and familiarity'
        ],
        keyPoints: [
          'Format matters: JSON for parsing, markdown for reading, etc.',
          'Tone words ("professional," "conversational," "academic") guide voice',
          'Persona shapes both content and delivery style'
        ]
      },
      {
        id: 'T02-C04',
        title: 'Grounding and Source Citation',
        vocabulary: ['grounding', 'source', 'citation'],
        description: 'Grounding means connecting AI output to specific sources or facts. Citation means attributing information to its origin. Learn how to demand evidence and verify claims.',
        learningObjectives: [
          'Require AI to cite sources for factual claims',
          'Use grounding to reduce hallucination',
          'Verify citations are accurate and complete'
        ],
        keyPoints: [
          'AI with access to sources is more reliable than AI reasoning alone',
          'Ask for citations to verify output before use',
          'Grounding reduces but does not eliminate hallucination'
        ]
      }
    ],
    assessmentRubric: {
      dimension1: 'Prompt clarity and specificity',
      dimension2: 'Understanding of role, tone, and format control',
      dimension3: 'Effective use of examples and few-shot techniques',
      dimension4: 'Ability to verify and ground output'
    }
  },

  T03: {
    id: 'T03',
    title: 'Research and Verification',
    description: 'Using AI as a research tool while maintaining critical thinking and source verification.',
    chapters: [
      {
        id: 'T03-C01',
        title: 'Primary Sources, Secondary Sources, and Claims',
        vocabulary: ['primary source', 'secondary source', 'claim', 'evidence'],
        description: 'Primary sources are original evidence (data, research). Secondary sources interpret or summarize primary sources. A claim is an assertion; evidence is what supports it. Learn to distinguish and evaluate each.',
        learningObjectives: [
          'Distinguish primary and secondary sources',
          'Identify claims and the evidence that supports them',
          'Evaluate evidence quality and relevance'
        ],
        keyPoints: [
          'Primary sources are stronger evidence than interpretations',
          'Claims without evidence should be treated as speculation',
          'AI can summarize but cannot replace critical evaluation'
        ]
      },
      {
        id: 'T03-C02',
        title: 'Summary, Synthesis, and Literature Review',
        vocabulary: ['summary', 'synthesis', 'literature review'],
        description: 'Summarization condenses existing information. Synthesis combines multiple sources into new insight. Literature review surveys what is known. Understand when to use each.',
        learningObjectives: [
          'Summarize material accurately and concisely',
          'Synthesize multiple sources to build new understanding',
          'Conduct literature reviews to map the knowledge landscape'
        ],
        keyPoints: [
          'AI summaries are helpful but should be verified against originals',
          'Synthesis requires human judgment to connect and evaluate sources',
          'Literature reviews benefit from AI but need human expertise to interpret'
        ]
      },
      {
        id: 'T03-C03',
        title: 'Fact-Checking, Recency, and Credibility',
        vocabulary: ['fact-checking', 'recency', 'credibility'],
        description: 'Fact-checking verifies claims against reliable sources. Recency matters because information changes. Credibility evaluates whether a source is trustworthy. All three are essential.',
        learningObjectives: [
          'Use fact-checking techniques to verify AI output',
          'Assess whether information is current and relevant',
          'Evaluate source credibility and bias'
        ],
        keyPoints: [
          'AI training data has a cutoff date; it does not know recent events',
          'Credibility depends on expertise, independence, and track record',
          'Cross-check important facts across multiple credible sources'
        ]
      },
      {
        id: 'T03-C04',
        title: 'Bias, Media Literacy, and Epistemic Humility',
        vocabulary: ['bias', 'media literacy', 'epistemic humility'],
        description: 'Bias is systematic favor toward certain conclusions. Media literacy is the ability to critically evaluate information. Epistemic humility is knowing the limits of your knowledge. All are essential for responsible research.',
        learningObjectives: [
          'Recognize sources of bias in data, AI training, and interpretation',
          'Develop critical thinking about information sources',
          'Acknowledge what you do not know and what is uncertain'
        ],
        keyPoints: [
          'AI amplifies biases present in training data',
          'All sources have perspective; recognize and account for it',
          'Saying "I don\'t know" is often more valuable than guessing'
        ]
      }
    ],
    assessmentRubric: {
      dimension1: 'Understanding of source types and credibility',
      dimension2: 'Ability to distinguish claims from evidence',
      dimension3: 'Critical evaluation of AI-generated research',
      dimension4: 'Intellectual humility and bias awareness'
    }
  }
};

module.exports = tierCourseContent;
