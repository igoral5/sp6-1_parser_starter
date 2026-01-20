// Код парсера

/**
 * @typedef {Object} MetaType Информация из заголовка страницы
 * @property {string} description Описание страницы
 * @property {string[]} keywords Ключевые слова
 * @property {string} language Язык странцы
 * @property {{title: string, image: string, type: string}} opengraph OpenGraph описание страницы
 * @property {string} title Заголовк страницы
 */


/**
 * Производит парсинг заголовка
 * @returns {MetaType} Информация из заголовка страницы
 */
function parseHeader() {
    const meta = {opengraph: {}};
    const html = document.querySelector('html');
    meta.language = html.lang;
    const head = document.querySelector('head');
    for (const elem of head.children) {
        switch (elem.tagName) {
            case 'TITLE':
                meta.title = elem.textContent.split('—')[0].trim();
                break;
            case 'META': {
                switch (elem.name) {
                    case 'description':
                        meta.description = elem.content;
                        break;
                    case 'keywords': 
                        meta.keywords = elem.content.split(',').map(value => value.trim());
                        break;
                };
                switch (elem.getAttribute('property')) {
                    case 'og:title':
                        meta.opengraph.title = elem.content.split('—')[0].trim();
                        break;
                    case 'og:image':
                        meta.opengraph.image = elem.content;
                        break;
                    case 'og:type':
                        meta.opengraph.type = elem.content;
                        break;
                }
                break;
            }
        }
    };
    return meta;
}



/**
 * Возвращает код валюты в зависимости от её обозначения
 * @param {string} curr Обозначение типа вылюты ₽, $, €
 * @returns {string} Код валюты RUB, USD, EUR
 */
function getCurrencyCode(curr) {
    switch (curr) {
        case '₽':
            return 'RUB';
        case '$':
            return 'USD';
        case '€':
            return 'EUR';
        default:
            return "UNKNOW";
    }
}

/**
 * @typedef {Object} PhotoType Изображение
 * @property {string} preview URL preview изображения
 * @property {string} full URL изображения
 * @property {string} alt Описание изображения
 */

/**
 * @typedef {Object} TagsType Теги
 * @property {string[]} categoty Теги категории
 * @property {string[]} discount Теги скидки
 * @property {string[]} label Теги метки
 */

/**
 * @typedef {Object} ProductType Продукт
 * @property {string} id Идентификатор продукта
 * @property {PhotoType[]} images Изображения продукта
 * @property {boolean} isLiked Статус лайка
 * @property {string} name Наименование продукта
 * @property {string} description Описание продукта
 * @property {TagsType} tags Теги
 * @property {number} price Цена
 * @property {number} oldPrice Старая цена
 * @property {number} discount Скидка в рублях
 * @property {string} discountPercent Скидка в процентах
 * @property {string} currency Валюта цены
 * @property {Object.<string, string} properties Свойства продукта
 */

/**
 * Возвращает описание продукта
 * @returns {ProductType}
 */
function parseProduct() {
    const product = {images: [], properties: {}, tags: {category: [], discount: [], label: []}};
    const section = document.querySelector('.product');
    product.id = section.dataset.id;
    const name = section.querySelector('h1');
    product.name = name.textContent.trim();
    const images = [];
    for (const image of section.querySelectorAll('.preview nav img')) {
        images.push({
            full: image.dataset.src,
            preview: image.src,
            alt: image.alt
        })
    }
    const imageGeneral = section.querySelector('.preview figure img');
    const index = images.findIndex(image => image.full === imageGeneral.src);
    if (index !== 0) 
        [product.images[0], product.images[index]] = [product.images[index], product.images[0]];
    product.images = images;
    const likeButton = section.querySelector('.preview figure button');
    product.isLiked = likeButton.classList.contains('active');
    for (const tag of section.querySelectorAll('.tags span')) {
        const tagText = tag.textContent.trim();
        switch (tag.className) {
            case 'green': 
                product.tags.category.push(tagText);
                break;
            case 'blue':
                product.tags.label.push(tagText);
                break;
            case 'red':
                product.tags.discount.push(tagText);
                break;
        }
    };
    const price = section.querySelector('.price');
    const matchPrice = price.innerHTML.match(/([^\s])(\d+\.?\d*)\s*<span>\s*[^\s](\d+\.?\d*)\s*<\/span>/);
    if (matchPrice) {
        product.price = +matchPrice[2];
        product.oldPrice = +matchPrice[3];
        product.currency = getCurrencyCode(matchPrice[1]);
        product.discount = product.oldPrice - product.price;
        product.discountPercent = `${((product.discount / product.oldPrice) * 100).toFixed(2)}%`;
    }
    for (const props of section.querySelectorAll('.properties li')) {
        const key = props.firstElementChild.textContent.trim();
        const value = props.lastElementChild.textContent.trim();
        product.properties[key] = value;
    }
    const description = section.querySelector('.description');
    product.description = description.innerHTML.trim().replace(/<(\w+)([^>]*)>/g, '<$1>');
    return product;
}

/**
 * @typedef {Object} OfferType Предложения
 * @property {string} image Изображение
 * @property {string} name Наименование
 * @property {string} price Цена
 * @property {string} currency Код валюты
 * @property {string} description Описание
 */

/**
 * Возвращает предложения
 * @returns {OfferType[]}
 */
function parseSuggested() {
    const suggested = [];
    for (const article of document.querySelectorAll('.suggested article')) {
        const value = {};
        for(const elem of article.children) {
            switch (elem.tagName) {
                case 'IMG':
                    value.image = elem.src;
                    break;
                case 'H3':
                    value.name = elem.textContent.trim();
                    break;
                case 'B':
                    const matchPrice = elem.textContent.match(/([^\s])(\d+\.?\d*)/);
                    if (matchPrice) {
                        value.price = matchPrice[2];
                        value.currency = getCurrencyCode(matchPrice[1]);
                    }
                    break;
                case 'P': 
                    value.description = elem.textContent.trim();
                    break;
            }
        }
        suggested.push(value);
    }
    return suggested;
}

/**
 * @typedef {Object} AuthorType Автор
 * @property {string} avatar Аватар
 * @property {string} name Имя
 */

/**
 * @typedef {Object} ReviewType Отзыв
 * @property {AuthorType} author Автор
 * @property {number} rating Оценка
 * @property {string} title Заголовок
 * @property {string} description Описание
 * @property {string} date Дата отзыва
 */

/**
 * Возвращает отзовы
 * @returns {ReviewType[]}
 */
function parseReviews() {
    const reviews = [];
    for (const article of document.querySelectorAll('.reviews article')) {
        const value = {};
        let rating = 0;
        for (const elem of article.querySelectorAll('.rating span')) {
            if (elem.className === 'filled')
                rating += 1;
            else
                break;
        }
        value.rating = rating;
        const author = {};
        const authorElem = article.querySelector('.author');
        for (const elem of authorElem.children) {
            switch (elem.tagName) {
                case 'IMG':
                    author.avatar = elem.src;
                    break;
                case 'SPAN':
                    author.name = elem.textContent.trim();
                    break;
                case 'I':
                    const matchDate = elem.textContent.match(/(\d{2})\/(\d{2})\/(\d{4})/);
                    if (matchDate)
                        value.date = `${matchDate[1]}.${matchDate[2]}.${matchDate[3]}`;
                    break;
            }
        }
        value.author = author;
        const titleElem = article.querySelector('.title');
        value.title = titleElem.textContent.trim();
        value.description = titleElem.nextElementSibling.textContent.trim();
        reviews.push(value);
    }
    return reviews;
}

/**
 * @typedef {Object} ParseType Информация о странице
 * @property {MetaType} meta Мета информация
 * @property {ProductType} product Товар
 * @property {OfferType[]} suggested Предложения
 * @property {ReviewType[]} reviews Отзовы
 */

/**
 * Парсит страницу и возвращает полученные данные
 * @returns {ParseType}
 */
function parsePage() {
    return {
        meta: parseHeader(),
        product: parseProduct(),
        suggested: parseSuggested(),
        reviews: parseReviews(),
    };
}

window.parsePage = parsePage;