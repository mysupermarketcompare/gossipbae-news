let currentPage = 1;
let currentCategory = 'entertainment';
const articlesPerPage = 20;
const newsCache = {};
const MAX_RETRIES = 3;
const RATE_LIMIT = 100;

let requestCount = 0;
let lastRequestTime = 0;
let isLoading = false;

function getRelativeTime(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) {
        return 'Just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 2592000) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
        const months = Math.floor(diffInSeconds / 2592000);
        return `${months} month${months > 1 ? 's' : ''} ago`;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const filterButtonsContainer = document.querySelector('.filter-buttons');
    const categorySelect = document.getElementById('category-select');
    const loadingSpinner = document.getElementById('loading-spinner');
    const mainContent = document.getElementById('main-content');
    const errorDisplay = document.getElementById('error-display');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');

    // Create filter buttons and select options
    window.newsCategories.forEach(category => {
        // Create button
        const button = document.createElement('button');
        button.className = `btn btn-filter${category === currentCategory ? ' active' : ''}`;
        button.dataset.filter = category;
        button.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        filterButtonsContainer.appendChild(button);

        // Create option
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        if (category === currentCategory) {
            option.selected = true;
        }
        categorySelect.appendChild(option);
    });

    // Event listener for buttons
    filterButtonsContainer.addEventListener('click', function(event) {
        if (event.target.classList.contains('btn-filter')) {
            filterButtonsContainer.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            
            const filter = event.target.dataset.filter;
            currentCategory = filter;
            categorySelect.value = filter; // Update select to match
            currentPage = 1;
            clearNewsContainer();
            fetchNews(filter);
        }
    });

    // Event listener for select
    categorySelect.addEventListener('change', function() {
        const filter = this.value;
        currentCategory = filter;
        filterButtonsContainer.querySelectorAll('.btn-filter').forEach(btn => {
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        currentPage = 1;
        clearNewsContainer();
        fetchNews(filter);
    });

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const searchTerm = searchInput.value.trim();
        if (searchTerm) {
            fetchSearchResults(searchTerm);
        }
    });

    function showLoading() {
        loadingSpinner.style.display = 'block';
        mainContent.style.opacity = '0.5';
    }

    function hideLoading() {
        loadingSpinner.style.display = 'none';
        mainContent.style.opacity = '1';
    }

    function displayError(message) {
        errorDisplay.style.display = 'block';
        errorDisplay.querySelector('.alert').textContent = message;
    }

    async function fetchNews(category = currentCategory, loadMore = false) {
        if (isLoading) return;
        isLoading = true;
        console.log('Fetching news:', category, loadMore); // Debug log
        if (!loadMore) {
            currentPage = 1;
            clearNewsContainer();
        }
        showLoading();
        try {
            if (requestCount >= RATE_LIMIT && Date.now() - lastRequestTime < 60 * 60 * 1000) {
                throw new Error('Rate limit exceeded. Please try again later.');
            }

            let articles;
            const cacheKey = `${category}_${currentPage}`;
            if (newsCache[cacheKey] && Date.now() - newsCache[cacheKey].timestamp < 5 * 60 * 1000) {
                articles = newsCache[cacheKey].data;
            } else {
                articles = await window.fetchCategoryNews(category, currentPage, articlesPerPage);
                newsCache[cacheKey] = { data: articles, timestamp: Date.now() };
            }

            console.log('Fetched articles:', articles); // Debug log

            if (articles && articles.length > 0) {
                displayNews(articles, loadMore);
                currentPage++;
                requestCount++;
                lastRequestTime = Date.now();
            } else {
                console.log('No articles found'); // Debug log
                if (!loadMore) {
                    displayError("No articles found for this category.");
                }
            }
        } catch (error) {
            console.error('Error fetching news:', error);
            displayError("Oops! We couldn't fetch the latest news. Please try again later.");
        } finally {
            hideLoading();
            isLoading = false;
        }
    }

    function displayNews(articles, loadMore = false) {
        console.log('Displaying news:', articles); // Debug log
        const newsContainer = document.querySelector('.col-lg-8');
        if (!loadMore) {
            newsContainer.innerHTML = `
                <h2 class="section-title">${currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1)} News</h2>
            `;
        }

        const existingArticles = new Set(Array.from(newsContainer.querySelectorAll('.news-item')).map(item => item.dataset.id));

        articles.forEach(article => {
            console.log('Processing article:', article); // Debug log
            if (!existingArticles.has(article.id)) {
               const newsItem = `
    <a href="${article.url}" class="news-item" data-id="${article.id}" target="_blank" rel="noopener noreferrer">
        <div class="news-item-image">
            <img src="${article.image || 'https://via.placeholder.com/400x300'}" alt="${article.title}">
        </div>
        <div class="news-item-content">
            <h3>${article.title}</h3>
            <p>${article.description}</p>
            <div class="news-item-footer">
                <div>
                    <small>Posted ${getRelativeTime(article.publishedAt)}</small>
                    <span class="news-source">${article.source.name}</span>
                </div>
                <div class="news-item-actions">
                    <div class="social-share-buttons">
                         <button class="btn share-twitter">
                            <svg class="share-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                         </button>
                         <button class="btn share-facebook">
                            <svg class="share-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                         </button>
                    </div>
                </div>
            </div>
        </div>
    </a>
`;
                newsContainer.innerHTML += newsItem;
            }
        });
    }

    function addEventListeners() {
        const newsContainer = document.querySelector('.col-lg-8');
        newsContainer.addEventListener('click', function(event) {
            if (event.target.closest('.share-twitter, .share-facebook')) {
                handleShare(event);
            }
        });
    }

    function handleShare(event) {
        event.preventDefault();
        event.stopPropagation();
        
        const button = event.target.closest('.share-twitter, .share-facebook');
        const newsItem = button.closest('.news-item');
        const url = newsItem.href;
        const title = newsItem.querySelector('h3').textContent;
        
        let shareUrl;
        if (button.classList.contains('share-twitter')) {
            shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
        } else if (button.classList.contains('share-facebook')) {
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        }
        
        window.open(shareUrl, '_blank', 'width=600,height=400');
    }

    function clearNewsContainer() {
        const newsContainer = document.querySelector('.col-lg-8');
        newsContainer.innerHTML = '';
    }

    async function fetchSearchResults(query) {
        showLoading();
        try {
            const response = await axios.get(`${BASE_URL}/search`, {
                params: {
                    q: query,
                    lang: 'en',
                    country: 'us',
                    max: articlesPerPage,
                    token: API_KEY,
                },
            });
            clearNewsContainer();
            if (response.data.articles && response.data.articles.length > 0) {
                displaySearchResults(response.data.articles, query);
            } else {
                displayError("No results found for your search query.");
            }
        } catch (error) {
            console.error('Error fetching search results:', error);
            displayError("Oops! We couldn't fetch the search results. Please try again later.");
        } finally {
            hideLoading();
        }
    }

    function displaySearchResults(articles, query) {
        const newsContainer = document.querySelector('.col-lg-8');
        newsContainer.innerHTML = `
            <h2 class="section-title">Search Results for "${query}"</h2>
        `;
        
        articles.forEach(article => {
            const newsItem = `
                <a href="${article.url}" class="news-item" data-id="${article.id || Date.now()}" target="_blank" rel="noopener noreferrer">
                    <div class="news-item-image">
                        <img src="${article.image || 'https://via.placeholder.com/400x300'}" alt="${article.title}">
                    </div>
                    <div class="news-item-content">
                        <h3>${article.title}</h3>
                        <p>${article.description}</p>
                        <div class="news-item-footer">
                            <div>
                                <small>Posted ${getRelativeTime(article.publishedAt)}</small>
                                <span class="news-source">${article.source.name}</span>
                            </div>
                            <div class="news-item-actions">
                                <div class="social-share-buttons">
                                    <button class="btn share-twitter">
                                        <svg class="share-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                        </svg>
                                    </button>
                                    <button class="btn share-facebook">
                                        <svg class="share-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </a>
            `;
            newsContainer.innerHTML += newsItem;
        });
    }

    function implementInfiniteScroll() {
        window.addEventListener('scroll', () => {
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
                if (!isLoading) {
                    fetchNews(currentCategory, true);
                }
            }
        });
    }

    implementInfiniteScroll();
    fetchNews(currentCategory);
    addEventListeners();
});

function decodeHTMLEntities(text) {
    const textArea = document.createElement('textarea');
    textArea.innerHTML = text;
    return textArea.value;
}

document.getElementById('cta-button').addEventListener('click', function() {
    confetti({
        particleCount: 150,
        spread: 70,
        origin: {
            y: 0.6
        }
    });

    // Track CTA button click
    gtag('event', 'cta_click', {
        'event_category': 'Engagement',
        'event_label': 'CTA Button'
    });
});

function trackScrollDepth() {
    let scrollDepths = [25, 50, 75, 100];
    let sentDepths = new Set();

    window.addEventListener('scroll', function() {
        const scrollPercentage = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
        
        scrollDepths.forEach(depth => {
            if (scrollPercentage >= depth && !sentDepths.has(depth)) {
                gtag('event', 'scroll_depth', {
                    'event_category': 'Engagement',
                    'event_label': `${depth}%`,
                    'value': depth
                });
                sentDepths.add(depth);
            }
        });
    });
}

// Add this function to handle initial page view tracking
function trackInitialPageView() {
    gtag('event', 'page_view', {
        'page_title': document.title,
        'page_location': window.location.href,
        'page_path': window.location.pathname
    });
}

// Call these functions when the page loads
document.addEventListener('DOMContentLoaded', function() {
    implementInfiniteScroll();
    fetchNews(currentCategory);
    addEventListeners();
    trackScrollDepth();
    trackInitialPageView();
});