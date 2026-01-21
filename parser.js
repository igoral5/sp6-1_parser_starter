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
 * Парсит заголовок страницы
 * @returns {MetaType} Информация из заголовка страницы
 */
function parseHeader() {
  const html = document.querySelector("html");
  const language = html.lang;
  const head = document.querySelector("head");
  return Array.from(head.children).reduce(
    (acc, elem) => {
      switch (elem.tagName) {
        case "TITLE":
          acc.title = elem.textContent.split("—")[0].trim();
          break;
        case "META": {
          switch (elem.name) {
            case "description":
              acc.description = elem.content;
              break;
            case "keywords":
              acc.keywords = elem.content
                .split(",")
                .map((value) => value.trim());
              break;
          }
          switch (elem.getAttribute("property")) {
            case "og:title":
              acc.opengraph.title = elem.content.split("—")[0].trim();
              break;
            case "og:image":
              acc.opengraph.image = elem.content;
              break;
            case "og:type":
              acc.opengraph.type = elem.content;
              break;
          }
          break;
        }
      }
      return acc;
    },
    { opengraph: {}, language },
  );
}

/**
 * Возвращает код валюты в зависимости от её обозначения
 * @param {string} curr Обозначение типа вылюты ₽, $, €
 * @returns {string} Код валюты RUB, USD, EUR
 */
function getCurrencyCode(curr) {
  switch (curr) {
    case "₽":
      return "RUB";
    case "$":
      return "USD";
    case "€":
      return "EUR";
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
 * @property {Object.<string, string>} properties Свойства продукта
 */

/**
 * Парсит изображения товара
 * @param {HTMLElement} section Секциия с товаром
 * @returns {PhotoType[]} Изображения
 */
function parseImages(section) {
  const images = Array.from(section.querySelectorAll(".preview nav img")).map(
    (image) => {
      return {
        full: image.dataset.src,
        preview: image.src,
        alt: image.alt,
      };
    },
  );
  const imageGeneral = section.querySelector(".preview figure img");
  const index = images.findIndex((image) => image.full === imageGeneral.src);
  if (index !== 0) [images[0], images[index]] = [images[index], images[0]];
  return images;
}

/**
 * Парсит теги
 * @param {HTMLElement} section Секциия с товаром
 * @returns {TagsType} Теги
 */
function parseTags(section) {
  return Array.from(section.querySelectorAll(".tags span")).reduce(
    (acc, tag) => {
      const tagText = tag.textContent.trim();
      switch (tag.className) {
        case "green":
          acc.category.push(tagText);
          break;
        case "blue":
          acc.label.push(tagText);
          break;
        case "red":
          acc.discount.push(tagText);
          break;
      }
      return acc;
    },
    { category: [], discount: [], label: [] },
  );
}

/**
 * Парсит описание товара, properties
 * @param {HTMLElement} section
 * @returns {Object.<string, string>}
 */
function parseProperties(section) {
  return Array.from(section.querySelectorAll(".properties li")).reduce(
    (acc, props) => {
      const key = props.firstElementChild.textContent.trim();
      const value = props.lastElementChild.textContent.trim();
      acc[key] = value;
      return acc;
    },
    {},
  );
}

/**
 * Парсит товар
 * @returns {ProductType}
 */
function parseProduct() {
  const section = document.querySelector(".product");
  const id = section.dataset.id;
  const nameElem = section.querySelector("h1");
  const name = nameElem.textContent.trim();
  const images = parseImages(section);
  const likeButton = section.querySelector(".preview figure button");
  const isLiked = likeButton.classList.contains("active");
  const tags = parseTags(section);
  const priceElem = section.querySelector(".price");
  const matchPrice = priceElem.innerHTML.match(
    /([^\s])(\d+\.?\d*)\s*<span>\s*[^\s](\d+\.?\d*)\s*<\/span>/,
  );
  const price = matchPrice ? +matchPrice[2] : undefined;
  const oldPrice = matchPrice ? +matchPrice[3] : undefined;
  const currency = matchPrice ? getCurrencyCode(matchPrice[1]) : undefined;
  const discount = oldPrice - price;
  const discountPercent = `${((discount / oldPrice) * 100).toFixed(2)}%`;
  const properties = parseProperties(section);
  const descriptionElem = section.querySelector(".description");
  const description = descriptionElem.innerHTML
    .trim()
    .replace(/<(\w+)([^>]*)>/g, "<$1>");
  return {
    id,
    name,
    isLiked,
    tags,
    price,
    oldPrice,
    discount,
    discountPercent,
    currency,
    properties,
    description,
    images,
  };
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
 * Парсит предложения
 * @returns {OfferType[]}
 */
function parseSuggested() {
  return Array.from(document.querySelectorAll(".suggested article")).map(
    (article) =>
      Array.from(article.children).reduce((acc, elem) => {
        switch (elem.tagName) {
          case "IMG":
            acc.image = elem.src;
            break;
          case "H3":
            acc.name = elem.textContent.trim();
            break;
          case "B":
            const matchPrice = elem.textContent.match(/([^\s])(\d+\.?\d*)/);
            if (matchPrice) {
              acc.price = matchPrice[2];
              acc.currency = getCurrencyCode(matchPrice[1]);
            }
            break;
          case "P":
            acc.description = elem.textContent.trim();
            break;
        }
        return acc;
      }, {}),
  );
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
 * Парсит рейтинг отзыва
 * @param {*} article Отзыв
 */
function parseRating(article) {
  return Array.from(article.querySelectorAll(".rating span")).reduce(
    (acc, elem) => (elem.classList.contains("filled") ? acc + 1 : acc),
    0,
  );
}

/**
 * Парсит автора отзыва
 * @param {*} elem Автор
 * @returns {AuthorType}
 */
function parseAuthor(elem) {
  return Array.from(elem.children).reduce((acc, elem) => {
    switch (elem.tagName) {
      case "IMG":
        acc.avatar = elem.src;
        break;
      case "SPAN":
        acc.name = elem.textContent.trim();
        break;
    }
    return acc;
  }, {});
}

/**
 * Парсит отзывы
 * @returns {ReviewType[]}
 */
function parseReviews() {
  return Array.from(document.querySelectorAll(".reviews article")).map(
    (article) => {
      const rating = parseRating(article);
      const authorElem = article.querySelector(".author");
      const author = parseAuthor(authorElem);
      const dateElem = authorElem.querySelector("i");
      const matchDate = dateElem.textContent.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      const date = matchDate
        ? `${matchDate[1]}.${matchDate[2]}.${matchDate[3]}`
        : undefined;
      const titleElem = article.querySelector(".title");
      const title = titleElem.textContent.trim();
      const description = titleElem.nextElementSibling.textContent.trim();
      return {
        title,
        description,
        date,
        author,
        rating,
      };
    },
  );
}

/**
 * @typedef {Object} ParseType Информация о странице
 * @property {MetaType} meta Мета информация
 * @property {ProductType} product Товар
 * @property {OfferType[]} suggested Предложения
 * @property {ReviewType[]} reviews Отзывы
 */

/**
 * Парсит страницу
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
