// Конфигурация API
const PIXABAY_API_KEY = '53550614-99b7f3160aa4daebf9ce3ced5'; // API ключ от Pixabay
const PIXABAY_API_URL = 'https://pixabay.com/api';

// Элементы DOM
const photoImage = document.getElementById('photo-image');
const photographerName = document.getElementById('photographer-name');
const photographerLink = document.getElementById('photographer-link');
const likeBtn = document.getElementById('like-btn');
const likeText = document.getElementById('like-text');
const likeCount = document.getElementById('like-count');
const refreshBtn = document.getElementById('refresh-btn');
const historyBtn = document.getElementById('history-btn');
const loading = document.getElementById('loading');
const historyModal = document.getElementById('history-modal');
const closeModal = document.getElementById('close-modal');
const historyList = document.getElementById('history-list');

// Текущее фото
let currentPhoto = null;
let currentPhotoId = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Проверка API ключа
    if (PIXABAY_API_KEY === 'YOUR_API_KEY_HERE') {
        showError('Пожалуйста, укажите ваш Pixabay API ключ в файле script.js');
        return;
    }

    // Загрузка фото дня
    loadPhotoOfTheDay();

    // Обработчики событий
    likeBtn.addEventListener('click', handleLike);
    refreshBtn.addEventListener('click', () => loadRandomPhoto());
    historyBtn.addEventListener('click', showHistory);
    closeModal.addEventListener('click', hideHistory);
    
    // Закрытие модального окна при клике вне его
    historyModal.addEventListener('click', (e) => {
        if (e.target === historyModal) {
            hideHistory();
        }
    });
});

// Получение фото дня (сохраняется на день)
async function loadPhotoOfTheDay() {
    const today = new Date().toDateString();
    const savedPhoto = localStorage.getItem('photoOfTheDay');
    
    if (savedPhoto) {
        const photoData = JSON.parse(savedPhoto);
        if (photoData.date === today) {
            // Используем сохраненное фото дня
            displayPhoto(photoData.photo);
            loadLikeCount(photoData.photo.id);
            return;
        }
    }

    // Загружаем новое фото
    await loadRandomPhoto();
}

// Загрузка случайного фото
async function loadRandomPhoto() {
    try {
        showLoading();
        
        // Список категорий для разнообразия
        const categories = ['nature', 'city', 'animals', 'people', 'travel', 'food', 'sports', 'business'];
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        
        // Получаем случайную страницу (от 1 до 20)
        const page = Math.floor(Math.random() * 20) + 1;
        
        // Получаем случайное фото из Pixabay
        const response = await fetch(`${PIXABAY_API_URL}/?key=${PIXABAY_API_KEY}&q=${randomCategory}&image_type=photo&orientation=horizontal&safesearch=true&per_page=20&page=${page}`);

        if (!response.ok) {
            throw new Error(`Ошибка API: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.hits && data.hits.length > 0) {
            // Выбираем случайное фото из результатов
            const randomIndex = Math.floor(Math.random() * data.hits.length);
            const photo = data.hits[randomIndex];
            
            currentPhoto = photo;
            currentPhotoId = photo.id;
            
            // Сохраняем как фото дня
            const today = new Date().toDateString();
            localStorage.setItem('photoOfTheDay', JSON.stringify({
                date: today,
                photo: photo
            }));
            
            // Добавляем в историю
            addToHistory(photo);
            
            // Отображаем фото
            displayPhoto(photo);
            
            // Загружаем счетчик лайков
            loadLikeCount(photo.id);
        } else {
            throw new Error('Не удалось получить фото');
        }
    } catch (error) {
        console.error('Ошибка при загрузке фото:', error);
        showError('Не удалось загрузить фото. Проверьте ваш API ключ и подключение к интернету.');
    } finally {
        hideLoading();
    }
}

// Отображение фото
function displayPhoto(photo) {
    photoImage.src = photo.largeImageURL || photo.webformatURL;
    photoImage.alt = photo.tags || 'Фото от Pixabay';
    
    photographerName.textContent = photo.user || 'Неизвестный автор';
    photographerLink.href = photo.pageURL || '#';
    
    // Скрываем изображение до загрузки
    photoImage.style.display = 'none';
    photoImage.onload = () => {
        photoImage.style.display = 'block';
        hideLoading();
    };
    
    photoImage.onerror = () => {
        showError('Ошибка при загрузке изображения');
        hideLoading();
    };
}

// Обработка лайка
function handleLike() {
    if (!currentPhotoId) return;
    
    // Увеличиваем счетчик лайков
    const likesData = getLikesData();
    if (!likesData[currentPhotoId]) {
        likesData[currentPhotoId] = 0;
    }
    likesData[currentPhotoId]++;
    saveLikesData(likesData);
    
    // Добавляем в список лайкнутых (для визуального отображения)
    const likedPhotos = getLikedPhotos();
    if (!likedPhotos.includes(currentPhotoId)) {
        likedPhotos.push(currentPhotoId);
        localStorage.setItem('likedPhotos', JSON.stringify(likedPhotos));
        likeBtn.classList.add('liked');
        likeText.textContent = 'Лайкнуто';
    }
    
    // Обновляем счетчик
    updateLikeCount();
}

// Загрузка счетчика лайков
function loadLikeCount(photoId) {
    const likedPhotos = getLikedPhotos();
    const isLiked = likedPhotos.includes(photoId);
    
    if (isLiked) {
        likeBtn.classList.add('liked');
        likeText.textContent = 'Лайкнуто';
    } else {
        likeBtn.classList.remove('liked');
        likeText.textContent = 'Лайк';
    }
    
    updateLikeCount();
}

// Обновление счетчика лайков
function updateLikeCount() {
    if (!currentPhotoId) return;
    
    const likes = getPhotoLikes(currentPhotoId);
    likeCount.textContent = likes;
}

// Получение списка лайкнутых фото
function getLikedPhotos() {
    const stored = localStorage.getItem('likedPhotos');
    return stored ? JSON.parse(stored) : [];
}

// Получение количества лайков для фото
function getPhotoLikes(photoId) {
    const likesData = getLikesData();
    return likesData[photoId] || 0;
}

// Получение данных о лайках
function getLikesData() {
    const stored = localStorage.getItem('photoLikes');
    return stored ? JSON.parse(stored) : {};
}

// Сохранение данных о лайках
function saveLikesData(likesData) {
    localStorage.setItem('photoLikes', JSON.stringify(likesData));
}

// Добавление в историю просмотров
function addToHistory(photo) {
    const history = getHistory();
    
    // Проверяем, нет ли уже этого фото в истории
    const exists = history.find(item => item.id === photo.id);
    if (exists) {
        // Обновляем дату просмотра
        exists.viewedAt = new Date().toISOString();
    } else {
        // Добавляем новое фото
        history.unshift({
            id: photo.id,
            url: photo.webformatURL || photo.previewURL,
            photographer: photo.user || 'Неизвестный автор',
            photographerUrl: photo.pageURL || '#',
            viewedAt: new Date().toISOString()
        });
    }
    
    // Ограничиваем историю 50 элементами
    if (history.length > 50) {
        history.pop();
    }
    
    localStorage.setItem('photoHistory', JSON.stringify(history));
}

// Получение истории просмотров
function getHistory() {
    const stored = localStorage.getItem('photoHistory');
    return stored ? JSON.parse(stored) : [];
}

// Отображение истории
function showHistory() {
    const history = getHistory();
    
    if (history.length === 0) {
        historyList.innerHTML = '<p class="empty-history">История пуста</p>';
    } else {
        historyList.innerHTML = history.map(item => `
            <div class="history-item" onclick="viewHistoryPhoto('${item.id}')">
                <img src="${item.url}" alt="Фото от ${item.photographer}">
                <div class="history-item-info">
                    <h3>${item.photographer}</h3>
                    <p>${formatDate(item.viewedAt)}</p>
                </div>
            </div>
        `).join('');
    }
    
    historyModal.classList.add('show');
}

// Скрытие истории
function hideHistory() {
    historyModal.classList.remove('show');
}

// Просмотр фото из истории
function viewHistoryPhoto(photoId) {
    // Загружаем фото по ID
    loadPhotoById(photoId);
    hideHistory();
}

// Загрузка фото по ID
async function loadPhotoById(photoId) {
    try {
        showLoading();
        
        // Pixabay не поддерживает прямой поиск по ID, поэтому используем сохраненные данные из истории
        const history = getHistory();
        const photoData = history.find(item => item.id === photoId);
        
        if (photoData) {
            // Пытаемся загрузить фото из истории или делаем новый запрос
            // Для упрощения используем данные из истории
            const photo = {
                id: photoData.id,
                largeImageURL: photoData.url.replace('_640', '_1280') || photoData.url,
                webformatURL: photoData.url,
                user: photoData.photographer,
                pageURL: photoData.photographerUrl,
                tags: 'Из истории'
            };
            
            currentPhoto = photo;
            currentPhotoId = photo.id;
            
            displayPhoto(photo);
            loadLikeCount(photo.id);
        } else {
            // Если фото нет в истории, загружаем новое случайное
            await loadRandomPhoto();
        }
    } catch (error) {
        console.error('Ошибка при загрузке фото:', error);
        showError('Не удалось загрузить фото');
    } finally {
        hideLoading();
    }
}

// Форматирование даты
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
        return 'Сегодня';
    } else if (days === 1) {
        return 'Вчера';
    } else if (days < 7) {
        return `${days} дней назад`;
    } else {
        return date.toLocaleDateString('ru-RU');
    }
}

// Показать загрузку
function showLoading() {
    loading.style.display = 'block';
    photoImage.style.display = 'none';
}

// Скрыть загрузку
function hideLoading() {
    loading.style.display = 'none';
}

// Показать ошибку
function showError(message) {
    loading.textContent = message;
    loading.style.display = 'block';
    loading.style.color = '#f5576c';
}

