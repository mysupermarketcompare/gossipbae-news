const API_KEY = 'e7debf4aab5dd4bc15c9c410d00b40bf'; // Your API key
const BASE_URL = 'https://gnews.io/api/v4';

const fetchCategoryNews = async (category = 'entertainment', page = 1, pageSize = 10) => {
  try {
    const response = await axios.get(`${BASE_URL}/top-headlines`, {
      params: {
        topic: category,
        lang: 'en',
        country: 'us',
        max: pageSize,
        page: page,
        token: API_KEY,
      },
    });

    console.log(`Fetched page ${page} of ${category} news:`, response.data.articles);
    
    // Add an 'id' property to each article
    const articlesWithIds = response.data.articles.map((article, index) => ({
      ...article,
      id: `${category}-${page}-${index}`,
    }));

    return articlesWithIds;
  } catch (error) {
    console.error(`Error fetching ${category} news:`, error.message);
    throw error;
  }
};

// Export the function so it can be imported in script.js
window.fetchCategoryNews = fetchCategoryNews;

// Define available categories
const categories = ['entertainment', 'sports', 'business', 'technology', 'science', 'health'];

// Export categories so they can be used in script.js
window.newsCategories = categories;