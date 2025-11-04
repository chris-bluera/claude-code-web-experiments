const axios = require('axios');
require('dotenv').config();

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

class AIService {
  constructor(apiKey = null) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY;
    this.defaultModel = process.env.DEFAULT_AI_MODEL || 'anthropic/claude-3.5-sonnet';
    this.embeddingModel = process.env.DEFAULT_EMBEDDING_MODEL || 'openai/text-embedding-ada-002';
  }

  /**
   * Make a request to OpenRouter API
   */
  async makeRequest(endpoint, data, apiKey = null) {
    const key = apiKey || this.apiKey;
    if (!key) {
      throw new Error('OpenRouter API key is required');
    }

    try {
      const response = await axios.post(`${OPENROUTER_BASE_URL}${endpoint}`, data, {
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/ai-bookmark-organizer',
          'X-Title': 'AI Bookmark Organizer'
        }
      });
      return response.data;
    } catch (error) {
      console.error('OpenRouter API error:', error.response?.data || error.message);
      throw new Error(`AI service error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Generate chat completion
   */
  async chat(messages, model = null, apiKey = null, options = {}) {
    const data = {
      model: model || this.defaultModel,
      messages: messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1000,
      ...options
    };

    const response = await this.makeRequest('/chat/completions', data, apiKey);
    return response.choices[0].message.content;
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(text, apiKey = null) {
    const data = {
      model: this.embeddingModel,
      input: text
    };

    const response = await this.makeRequest('/embeddings', data, apiKey);
    return response.data[0].embedding;
  }

  /**
   * Analyze a bookmark and suggest categorization
   */
  async analyzeBookmark(bookmark, existingCategories = [], existingSimilarBookmarks = [], apiKey = null) {
    const categoryList = existingCategories.length > 0
      ? existingCategories.map(c => `- ${c.name}: ${c.description || 'No description'}`).join('\n')
      : '- No existing categories';

    const similarList = existingSimilarBookmarks.length > 0
      ? existingSimilarBookmarks.map(b => `- "${b.title}" in category "${b.category_name}"`).join('\n')
      : '- No similar bookmarks found';

    const prompt = `You are helping organize a bookmark. Analyze the following bookmark and suggest the best category for it.

Bookmark Information:
- URL: ${bookmark.url}
- Title: ${bookmark.title}
- Description: ${bookmark.description || 'N/A'}
- Page Content Summary: ${bookmark.contentSummary || 'N/A'}

Existing Categories:
${categoryList}

Similar Existing Bookmarks:
${similarList}

Please provide:
1. Recommended category (choose from existing or suggest a new one)
2. Brief explanation (1-2 sentences)
3. 3-5 relevant tags
4. A one-sentence summary of the bookmark

Respond in JSON format:
{
  "category": "category name",
  "isNewCategory": true/false,
  "explanation": "why this category fits",
  "tags": ["tag1", "tag2", "tag3"],
  "summary": "one sentence summary"
}`;

    const messages = [
      { role: 'user', content: prompt }
    ];

    const response = await this.chat(messages, null, apiKey, { temperature: 0.3 });

    // Parse JSON response
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Failed to parse AI response:', response);
      throw new Error('Failed to parse AI analysis');
    }
  }

  /**
   * Chat about bookmark organization
   */
  async chatAboutOrganization(conversationHistory, bookmark, categories, apiKey = null) {
    const systemMessage = {
      role: 'system',
      content: `You are an AI assistant helping organize bookmarks. The user is discussing where to place this bookmark:

Bookmark: "${bookmark.title}"
URL: ${bookmark.url}
Description: ${bookmark.description || 'N/A'}

Available categories: ${categories.map(c => c.name).join(', ')}

Help the user decide on the best organization. Be concise and helpful. You can suggest creating new categories if needed.`
    };

    const messages = [systemMessage, ...conversationHistory];
    return await this.chat(messages, null, apiKey, { temperature: 0.7, maxTokens: 500 });
  }

  /**
   * Semantic search query understanding
   */
  async enhanceSearchQuery(query, apiKey = null) {
    const messages = [
      {
        role: 'user',
        content: `Given this bookmark search query: "${query}"

Provide alternative phrasings and related terms that might help find relevant bookmarks. Include synonyms and related concepts.

Respond in JSON format:
{
  "expandedQuery": "enhanced search query with synonyms",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}`
      }
    ];

    const response = await this.chat(messages, null, apiKey, { temperature: 0.3, maxTokens: 200 });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Failed to parse search enhancement:', response);
      return { expandedQuery: query, keywords: [query] };
    }
  }

  /**
   * Generate summary from page content
   */
  async summarizeContent(content, maxLength = 200, apiKey = null) {
    const messages = [
      {
        role: 'user',
        content: `Summarize the following content in one sentence (max ${maxLength} characters):\n\n${content.substring(0, 2000)}`
      }
    ];

    return await this.chat(messages, null, apiKey, { temperature: 0.3, maxTokens: 100 });
  }
}

module.exports = AIService;
